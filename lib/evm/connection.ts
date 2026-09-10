import { createPublicClient, formatEther, isAddress, type Address, type PublicClient } from "viem";
import { ACTIVE_CHAIN, chainTransport } from "@/lib/chain/robinhood";

/**
 * SECURITY: Never put private keys in source. Treasury signing keys live in
 * environment secrets and are only ever read by `scripts/payout.ts`, which runs
 * on an operator's machine — never inside a request handler.
 */

let cached: PublicClient | null = null;

/**
 * One client for the whole server process. viem batches calls made through the
 * same transport, so sharing it turns the dozen reads a pot snapshot needs into
 * a couple of round trips.
 */
export function getPublicClient(): PublicClient {
  cached ??= createPublicClient({
    chain: ACTIVE_CHAIN,
    transport: chainTransport(),
  }) as PublicClient;
  return cached;
}

export function normalizeEvmAddress(value: unknown): Address | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return isAddress(trimmed) ? (trimmed as Address) : null;
}

export function getTreasuryAddress(): Address | null {
  return normalizeEvmAddress(
    process.env.TREASURY_WALLET_ADDRESS ??
      process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS,
  );
}

export async function getEthBalance(address: Address): Promise<bigint> {
  return getPublicClient()
    .getBalance({ address })
    .catch(() => 0n);
}

export async function getTreasuryEthBalance(): Promise<number | null> {
  const address = getTreasuryAddress();
  if (!address) return null;
  try {
    return Number(formatEther(await getPublicClient().getBalance({ address })));
  } catch {
    return null;
  }
}
