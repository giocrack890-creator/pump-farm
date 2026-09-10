import { parseEventLogs, type Address, type Hex } from "viem";
import { getPublicClient, normalizeEvmAddress } from "@/lib/evm/connection";
import {
  curveAbi,
  erc20Abi,
  hookAbi,
  PONS_HOOK,
  transferEvent,
  V4_POOL_MANAGER,
  v4InitializeEvent,
  ZERO_ADDRESS,
} from "./contracts";

/**
 * Everything static about a Pons launch: the bonding curve holding its supply,
 * the V4 pool once it graduates, the wallet Pons credits with fees, and the
 * token's own ERC-20 facts.
 *
 * Discovery needs logs; every later read is a plain `eth_call`. Neither answer
 * changes, hence the cache — with a TTL only so a graduation is picked up
 * without a redeploy.
 */

export type CurveState = {
  address: Address;
  graduated: boolean;
  creator: Address | null;
  graduationThresholdWei: bigint;
  raisedWei: bigint;
  /** 0–1 while on the curve, null once graduated (graduation drains it). */
  graduationProgress: number | null;
  tokenReserve: bigint;
  creatorTaxBps: number | null;
  feeBps: number | null;
  protocolFeeShareBps: number | null;
};

export type PoolState = {
  poolId: Hex;
  currency0: Address;
  currency1: Address;
  hooks: Address;
  isPonsHook: boolean;
};

export type HookLaunch = {
  registered: true;
  memecoin: Address;
  quoteToken: Address;
  creator: Address;
  creatorTaxBps: number;
  protocolFeeShareBps: number;
  hookFeeBps: number;
};

export type Launch = {
  token: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  curve: CurveState | null;
  pool: PoolState | null;
  hookLaunch: HookLaunch | null;
  creator: Address | null;
  /** 'curve' pre-graduation, 'v4' after, 'unknown' when it is not a Pons launch. */
  venue: "curve" | "v4" | "unknown";
  resolvedAt: number;
};

const launchCache = new Map<string, { launch: Launch; at: number }>();
/** Re-resolve periodically so a graduation is picked up without a restart. */
const LAUNCH_TTL_MS = 5 * 60_000;

/**
 * The bonding curve holding a token's supply, or null for a plain ERC-20.
 *
 * Discovery is structural rather than an address list: a launch mints the whole
 * supply to the curve, and `Transfer.from` is an indexed topic, so one filtered
 * query finds it for any Pons token.
 */
async function findCurve(token: Address): Promise<Address | null> {
  const client = getPublicClient();
  const logs = await client.getLogs({
    address: token,
    event: transferEvent,
    args: { from: ZERO_ADDRESS },
    fromBlock: 0n,
    toBlock: "latest",
  });
  const parsed = parseEventLogs({
    abi: [transferEvent],
    eventName: "Transfer",
    logs,
  });

  let best: { to: Address; value: bigint } | null = null;
  for (const log of parsed) {
    const to = log.args.to as Address;
    const value = log.args.value as bigint;
    if (!best || value > best.value) best = { to, value };
  }
  if (!best) return null;

  // A mint straight to an EOA is a plain ERC-20, not a Pons launch.
  const code = await client.getCode({ address: best.to }).catch(() => undefined);
  return code && code !== "0x" ? best.to : null;
}

/**
 * The graduated V4 pool for a token, behind the Pons hook. Both currency slots
 * are indexed, so this is one selective log query over all history.
 */
async function findV4Pool(token: Address): Promise<PoolState | null> {
  const client = getPublicClient();
  const [asToken0, asToken1] = await Promise.all([
    client
      .getLogs({
        address: V4_POOL_MANAGER,
        event: v4InitializeEvent,
        args: { currency0: token },
        fromBlock: 0n,
        toBlock: "latest",
      })
      .catch(() => []),
    client
      .getLogs({
        address: V4_POOL_MANAGER,
        event: v4InitializeEvent,
        args: { currency1: token },
        fromBlock: 0n,
        toBlock: "latest",
      })
      .catch(() => []),
  ]);

  const parsed = parseEventLogs({
    abi: [v4InitializeEvent],
    eventName: "Initialize",
    logs: [...asToken0, ...asToken1],
  });

  const hook = PONS_HOOK.toLowerCase();
  const ponsPool = parsed.find(
    (log) => (log.args.hooks as string | undefined)?.toLowerCase() === hook,
  );
  const pool = ponsPool ?? parsed[0];
  if (!pool) return null;

  return {
    poolId: pool.args.id as Hex,
    currency0: pool.args.currency0 as Address,
    currency1: pool.args.currency1 as Address,
    hooks: pool.args.hooks as Address,
    isPonsHook: (pool.args.hooks as string).toLowerCase() === hook,
  };
}

async function readCurveState(curve: Address): Promise<CurveState> {
  const client = getPublicClient();
  type CurveFn = (typeof curveAbi)[number] extends { name: infer N } ? N : never;
  const read = <T>(functionName: CurveFn): Promise<T | null> =>
    client
      .readContract({ address: curve, abi: curveAbi, functionName })
      .then((v) => v as T)
      .catch(() => null);

  const [
    graduated,
    deployer,
    threshold,
    tokenReserve,
    creatorTaxBps,
    feeBps,
    protocolShareBps,
    raised,
  ] = await Promise.all([
    read<boolean>("graduated"),
    read<Address>("deployer"),
    read<bigint>("graduationThreshold"),
    read<bigint>("tokenReserve"),
    read<number>("creatorTaxBps"),
    read<number>("feeBps"),
    read<number>("protocolFeeShareBps"),
    client.getBalance({ address: curve }).catch(() => 0n),
  ]);

  const hasGraduated = Boolean(graduated);

  return {
    address: curve,
    graduated: hasGraduated,
    creator: deployer ?? null,
    graduationThresholdWei: threshold ?? 0n,
    raisedWei: raised ?? 0n,
    // Graduation drains the curve, so progress computed after the fact reads 0%
    // — which looks like a launch that never started rather than one that
    // finished. Once graduated there is no progress left to report.
    graduationProgress: hasGraduated
      ? null
      : threshold && threshold > 0n
        ? Math.min(1, Number(raised) / Number(threshold))
        : null,
    tokenReserve: tokenReserve ?? 0n,
    creatorTaxBps: creatorTaxBps ?? null,
    feeBps: feeBps ?? null,
    protocolFeeShareBps: protocolShareBps ?? null,
  };
}

export async function resolveLaunch(
  token: string,
  {
    creatorOverride = null,
    force = false,
  }: { creatorOverride?: string | null; force?: boolean } = {},
): Promise<Launch> {
  const addr = normalizeEvmAddress(token);
  if (!addr) throw new Error(`invalid token address: ${token}`);

  const key = addr.toLowerCase();
  const hit = launchCache.get(key);
  if (!force && hit && Date.now() - hit.at < LAUNCH_TTL_MS) return hit.launch;

  const client = getPublicClient();
  // Only the view functions — `transfer` is on the same ABI but is not a read.
  type Erc20View = "name" | "symbol" | "decimals" | "totalSupply" | "balanceOf";
  const meta = <T>(functionName: Erc20View, fallback: T): Promise<T> =>
    client
      .readContract({ address: addr, abi: erc20Abi, functionName })
      .then((v) => v as T)
      .catch(() => fallback);

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    meta<string>("name", ""),
    meta<string>("symbol", ""),
    meta<number>("decimals", 18),
    meta<bigint>("totalSupply", 0n),
  ]);

  // A token that will not even answer `totalSupply` means the RPC is down or
  // rate-limited, not that the launch is unknown. Bail before the log scans and
  // — critically — before caching, so one bad minute does not stick for five.
  if (totalSupply === 0n) {
    throw new Error("token reads failed (rpc unreachable or rate-limited)");
  }

  // Sequential on purpose: these are full-history log scans, and firing them
  // alongside the reads is exactly the burst that gets the endpoint to throttle.
  const curveAddress =
    hit?.launch.curve?.address ?? (await findCurve(addr).catch(() => null));
  const curve = curveAddress ? await readCurveState(curveAddress) : null;

  // Only look for a pool once the curve says it filled — before that there is
  // nothing to find, and the scan would run on every refresh for nothing.
  const pool =
    !curve || curve.graduated ? await findV4Pool(addr).catch(() => null) : null;

  let hookLaunch: HookLaunch | null = null;
  if (pool?.poolId && pool.isPonsHook) {
    const info = (await client
      .readContract({
        address: PONS_HOOK,
        abi: hookAbi,
        functionName: "launches",
        args: [pool.poolId],
      })
      .catch(() => null)) as readonly unknown[] | null;
    if (info?.[0]) {
      hookLaunch = {
        registered: true,
        memecoin: info[2] as Address,
        quoteToken: info[3] as Address,
        creator: info[4] as Address,
        creatorTaxBps: Number(info[7]),
        protocolFeeShareBps: Number(info[8]),
        hookFeeBps: Number(info[10]),
      };
    }
  }

  const creator =
    normalizeEvmAddress(creatorOverride) ??
    hookLaunch?.creator ??
    curve?.creator ??
    null;

  // 'unknown' is reserved for "this is not a Pons launch" — a V4 pool behind
  // some other hook earns no fees we can read, so it does not count as a venue.
  const venue: Launch["venue"] =
    curve && !curve.graduated
      ? "curve"
      : pool?.isPonsHook
        ? "v4"
        : curve
          ? "curve"
          : "unknown";

  const launch: Launch = {
    token: addr,
    name,
    symbol,
    decimals: Number(decimals),
    totalSupply,
    curve,
    pool,
    hookLaunch,
    creator,
    venue,
    resolvedAt: Date.now(),
  };

  launchCache.set(key, { launch, at: Date.now() });
  return launch;
}

/** Drop the cached discovery for a token — used when admin repoints the token. */
export function forgetLaunch(token?: string): void {
  if (!token) {
    launchCache.clear();
    return;
  }
  launchCache.delete(token.trim().toLowerCase());
}
