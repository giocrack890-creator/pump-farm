import { createPublicClient, http, formatEther, type Address } from "viem";
import { ACTIVE_CHAIN } from "@/lib/chain/robinhood";

/**
 * SECURITY: Never put private keys in source. Treasury signing keys must live
 * in environment secrets / KMS. A real audit is required before mainnet launch
 * with user funds at scale.
 */
export function getPublicClient() {
  const rpc =
    process.env.RPC_URL ??
    process.env.NEXT_PUBLIC_RPC_URL ??
    ACTIVE_CHAIN.rpcUrls.default.http[0];
  return createPublicClient({
    chain: ACTIVE_CHAIN,
    transport: http(rpc),
  });
}

export function getTreasuryAddress(): Address | null {
  const addr =
    process.env.TREASURY_WALLET_ADDRESS ??
    process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS;
  if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) return null;
  return addr as Address;
}

export async function getTreasuryEthBalance(): Promise<number | null> {
  const address = getTreasuryAddress();
  if (!address) return null;
  try {
    const wei = await getPublicClient().getBalance({ address });
    return Number(formatEther(wei));
  } catch {
    return null;
  }
}
