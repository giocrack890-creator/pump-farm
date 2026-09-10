import { formatUnits, parseEventLogs, type Address, type Hex } from "viem";
import { getPublicClient, normalizeEvmAddress } from "@/lib/evm/connection";
import { erc20Abi, transferEvent } from "@/lib/pons/contracts";

/**
 * Prove that a transfer the client claims to have made actually happened.
 *
 * The staking route used to take a transaction hash on trust and only check it
 * had not been submitted before — so any random 32 bytes bought a permanent SP
 * multiplier, and that multiplier is a share of a pot holding real money. This
 * is the read that closes it: the receipt has to exist, have succeeded, be
 * buried under a few blocks, and contain a Transfer of the configured token
 * from the signed-in wallet to the escrow for at least the amount claimed.
 */

export type TransferProof =
  | {
      ok: true;
      /** What actually moved, which may be more than was claimed. */
      amount: string;
      rawValue: bigint;
      decimals: number;
      blockNumber: bigint;
      confirmations: bigint;
    }
  | { ok: false; error: string };

const MIN_CONFIRMATIONS = 2n;

export function isTxHash(value: unknown): value is Hex {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

export async function verifyErc20Transfer({
  txHash,
  token,
  from,
  to,
  minAmount,
}: {
  txHash: string;
  token: string;
  from: string;
  to: string;
  /** Human-readable amount the client claims to have sent. */
  minAmount: string;
}): Promise<TransferProof> {
  if (!isTxHash(txHash)) {
    return { ok: false, error: "txHash must be a 0x-prefixed 32-byte hash" };
  }

  const tokenAddress = normalizeEvmAddress(token);
  const sender = normalizeEvmAddress(from);
  const recipient = normalizeEvmAddress(to);
  if (!tokenAddress) return { ok: false, error: "token is not configured" };
  if (!sender) return { ok: false, error: "invalid sender address" };
  if (!recipient) return { ok: false, error: "escrow address is not configured" };

  const client = getPublicClient();

  const receipt = await client
    .getTransactionReceipt({ hash: txHash })
    .catch(() => null);
  if (!receipt) {
    return { ok: false, error: "transaction not found — wait for it to be mined" };
  }
  if (receipt.status !== "success") {
    return { ok: false, error: "transaction reverted" };
  }

  const head = await client.getBlockNumber().catch(() => receipt.blockNumber);
  const confirmations = head > receipt.blockNumber ? head - receipt.blockNumber : 0n;
  if (confirmations < MIN_CONFIRMATIONS) {
    return {
      ok: false,
      error: `only ${confirmations} confirmation(s) — wait for ${MIN_CONFIRMATIONS}`,
    };
  }

  const decimals = (await client
    .readContract({ address: tokenAddress, abi: erc20Abi, functionName: "decimals" })
    .catch(() => 18)) as number;

  // Only logs emitted by the configured token count: a transfer of some other
  // ERC-20 in the same transaction proves nothing about this stake.
  const transfers = parseEventLogs({
    abi: [transferEvent],
    eventName: "Transfer",
    logs: receipt.logs.filter(
      (log) => log.address.toLowerCase() === tokenAddress.toLowerCase(),
    ),
  });

  let moved = 0n;
  for (const log of transfers) {
    const logFrom = (log.args.from as Address).toLowerCase();
    const logTo = (log.args.to as Address).toLowerCase();
    if (logFrom === sender.toLowerCase() && logTo === recipient.toLowerCase()) {
      moved += log.args.value as bigint;
    }
  }

  if (moved === 0n) {
    return {
      ok: false,
      error: "no transfer of the staking token from your wallet to the escrow in that transaction",
    };
  }

  // Compare in raw units so a fractional amount is not rounded into passing.
  let claimed: bigint;
  try {
    claimed = parseAmount(minAmount, decimals);
  } catch {
    return { ok: false, error: "invalid amount" };
  }
  if (moved < claimed) {
    return {
      ok: false,
      error: `transaction moved ${formatUnits(moved, decimals)} but ${minAmount} was claimed`,
    };
  }

  return {
    ok: true,
    amount: formatUnits(moved, decimals),
    rawValue: moved,
    decimals,
    blockNumber: receipt.blockNumber,
    confirmations,
  };
}

/** Decimal string → raw units, truncating anything below the token's precision. */
function parseAmount(value: string, decimals: number): bigint {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error("not a positive number");
  const [whole, fraction = ""] = trimmed.split(".");
  const padded = (fraction + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0");
}
