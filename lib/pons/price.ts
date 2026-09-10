import { parseEventLogs, type Address, type Hex } from "viem";
import { getPublicClient } from "@/lib/evm/connection";
import { curveAbi, V4_POOL_MANAGER, v4SwapEvent } from "./contracts";
import type { Launch } from "./launch";

/**
 * Token price straight from the chain.
 *
 * The public price APIs are the only ones that know a fresh Pons launch, and
 * their free tier is nowhere near a once-a-second card — a rate limit there
 * blanks the market cap for everyone. The chain has no such limit and no such
 * delay, so it leads and the APIs fill in what it cannot give (24h volume and
 * change, which need history).
 *
 *   CURVE  `getReserves()` returns the curve's virtual (eth, token) reserves.
 *          Their ratio is the spot price — one eth_call, no log scan.
 *   V4     The pool's most recent `Swap` log carries the post-trade
 *          `sqrtPriceX96`, which beats reading v4-core's internal storage
 *          layout and breaking on its next release.
 */

/** ETH per token on a Pons bonding curve, or 0 if it cannot be read. */
export async function curvePriceEth(curve: Address): Promise<number> {
  try {
    const [ethReserve, tokenReserve] = (await getPublicClient().readContract({
      address: curve,
      abi: curveAbi,
      functionName: "getReserves",
    })) as readonly [bigint, bigint];
    if (!(tokenReserve > 0n) || !(ethReserve > 0n)) return 0;
    // Both legs are 18-decimal, so the ratio needs no scaling.
    return Number(ethReserve) / Number(tokenReserve);
  } catch {
    return 0;
  }
}

const Q96 = 2 ** 96;

/**
 * ETH per token in a graduated V4 pool, from the latest swap.
 *
 * Widening windows rather than one scan from genesis: an active pool answers on
 * the first, and a quiet one costs a couple of extra queries instead of making
 * every refresh walk the whole chain.
 */
export async function v4PriceEth(
  poolId: Hex,
  tokenIsCurrency0: boolean,
): Promise<number> {
  const client = getPublicClient();
  try {
    const head = await client.getBlockNumber();
    for (const span of [50_000n, 500_000n, 5_000_000n]) {
      const fromBlock = head > span ? head - span : 0n;
      const logs = await client
        .getLogs({
          address: V4_POOL_MANAGER,
          event: v4SwapEvent,
          args: { id: poolId },
          fromBlock,
          toBlock: "latest",
        })
        .catch(() => []);
      const parsed = parseEventLogs({
        abi: [v4SwapEvent],
        eventName: "Swap",
        logs,
      });
      const last = parsed[parsed.length - 1];
      if (!last) continue;

      const sqrt = Number(last.args.sqrtPriceX96 as bigint) / Q96;
      // sqrtPriceX96 encodes currency1 per currency0.
      const price1Per0 = sqrt * sqrt;
      if (!Number.isFinite(price1Per0) || price1Per0 <= 0) continue;
      return tokenIsCurrency0 ? price1Per0 : 1 / price1Per0;
    }
  } catch {
    /* fall through */
  }
  return 0;
}

/**
 * ETH per token for a resolved launch, whichever venue it is on.
 * Returns 0 when the chain cannot answer, so callers fall back to the APIs.
 */
export async function launchPriceEth(launch: Launch): Promise<number> {
  if (launch.curve && !launch.curve.graduated) {
    return curvePriceEth(launch.curve.address);
  }
  if (launch.pool?.poolId) {
    const tokenIsCurrency0 =
      launch.pool.currency0.toLowerCase() === launch.token.toLowerCase();
    const price = await v4PriceEth(launch.pool.poolId, tokenIsCurrency0);
    if (price > 0) return price;
  }
  return launch.curve ? curvePriceEth(launch.curve.address) : 0;
}
