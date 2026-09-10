import { type Address } from "viem";
import { getPublicClient, normalizeEvmAddress } from "@/lib/evm/connection";
import { NATIVE_CURRENCY } from "@/lib/chain/robinhood";
import {
  DEAD_ADDRESS,
  erc20Abi,
  escrowAbi,
  hookAbi,
  PONS_FEE_ESCROW,
  PONS_HOOK,
} from "./contracts";
import type { Launch } from "./launch";

/**
 * The creator's fees for a launch, in wei — four `eth_call`s, no logs.
 *
 *   claimableWei  sitting in the escrow, withdrawable right now
 *   pendingWei    the creator's share of what the hook still holds unswept: the
 *                 whole creator tax (which bypasses the protocol split by
 *                 design) plus what is left of the hook fee after the
 *                 protocol's cut
 *
 * Only the ETH leg is counted. A memecoin leg converts at sweep time at a price
 * we cannot know now, so quoting it in dollars would be a guess — it is
 * reported raw under `pendingTokenRaw` for display, never summed into the pot.
 */

export type CreatorFees = {
  creator: Address | null;
  claimableWei: bigint;
  pendingWei: bigint;
  pendingTokenRaw: bigint;
  escrowTokenRaw: bigint;
  totalWei: bigint;
  ok: boolean;
  reason: string | null;
};

export async function readCreatorFees(launch: Launch): Promise<CreatorFees> {
  const client = getPublicClient();
  const creator = normalizeEvmAddress(launch.creator);

  if (!creator) {
    return {
      creator: null,
      claimableWei: 0n,
      pendingWei: 0n,
      pendingTokenRaw: 0n,
      escrowTokenRaw: 0n,
      totalWei: 0n,
      ok: false,
      reason: "no creator address",
    };
  }

  const [claimableWei, escrowTokenRaw] = await Promise.all([
    client
      .readContract({
        address: PONS_FEE_ESCROW,
        abi: escrowAbi,
        functionName: "balanceOf",
        args: [creator],
      })
      .catch(() => 0n) as Promise<bigint>,
    client
      .readContract({
        address: PONS_FEE_ESCROW,
        abi: escrowAbi,
        functionName: "balanceOfToken",
        args: [creator, launch.token],
      })
      .catch(() => 0n) as Promise<bigint>,
  ]);

  let pendingWei = 0n;
  let pendingTokenRaw = 0n;

  const poolId = launch.pool?.poolId;
  if (poolId && launch.hookLaunch?.registered) {
    const creatorShareBps = BigInt(
      10_000 - (launch.hookLaunch.protocolFeeShareBps ?? 0),
    );
    const pending = (
      functionName: "pendingFees" | "pendingCreatorTax",
      currency: Address,
    ) =>
      client
        .readContract({
          address: PONS_HOOK,
          abi: hookAbi,
          functionName,
          args: [poolId, currency],
        })
        .catch(() => 0n) as Promise<bigint>;

    const [ethFees, ethTax, tokFees, tokTax] = await Promise.all([
      pending("pendingFees", NATIVE_CURRENCY),
      pending("pendingCreatorTax", NATIVE_CURRENCY),
      pending("pendingFees", launch.token),
      pending("pendingCreatorTax", launch.token),
    ]);

    pendingWei = (ethFees * creatorShareBps) / 10_000n + ethTax;
    pendingTokenRaw = (tokFees * creatorShareBps) / 10_000n + tokTax;
  }

  return {
    creator,
    claimableWei,
    pendingWei,
    pendingTokenRaw,
    escrowTokenRaw,
    totalWei: claimableWei + pendingWei,
    ok: true,
    reason: null,
  };
}

/**
 * ETH sitting in the treasury wallet.
 *
 * Claiming from the escrow moves the fees here, which zeroes `claimableWei` —
 * so a pot built from the escrow alone reads $0 the moment the fees are
 * actually collected, which is exactly backwards. The money did not go
 * anywhere; it moved one hop.
 *
 * This is a plain balance, so anything else in that wallet counts too. Use a
 * wallet that only holds fees, or the pot quotes money it is not paying out.
 */
export async function readTreasuryBalance(
  address: string | null | undefined,
): Promise<bigint> {
  const treasury = normalizeEvmAddress(address);
  if (!treasury) return 0n;
  return getPublicClient()
    .getBalance({ address: treasury })
    .catch(() => 0n);
}

export type SupplyBreakdown = {
  totalSupply: number;
  circulatingSupply: number;
  lockedSupply: number;
};

/** Circulating supply = total minus what the curve still holds and what is burned. */
export async function readCirculatingSupply(
  launch: Launch,
): Promise<SupplyBreakdown> {
  const client = getPublicClient();
  const held: Address[] = [];
  if (launch.curve?.address) held.push(launch.curve.address);
  held.push(DEAD_ADDRESS);

  const balances = await Promise.all(
    held.map(
      (addr) =>
        client
          .readContract({
            address: launch.token,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [addr],
          })
          .catch(() => 0n) as Promise<bigint>,
    ),
  );

  const locked = balances.reduce((sum, b) => sum + b, 0n);
  const raw =
    launch.totalSupply > locked ? launch.totalSupply - locked : launch.totalSupply;
  const scale = 10 ** launch.decimals;

  return {
    totalSupply: Number(launch.totalSupply) / scale,
    circulatingSupply: Number(raw) / scale,
    lockedSupply: Number(locked) / scale,
  };
}
