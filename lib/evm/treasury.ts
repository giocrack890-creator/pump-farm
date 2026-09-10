import { formatEther } from "viem";
import { getAppConfig } from "@/lib/config/appConfig";
import { getPublicClient, normalizeEvmAddress } from "@/lib/evm/connection";

/**
 * The payout wallet's balance.
 *
 * There is no stand-in figure any more. This used to return
 * `MOCK_TREASURY_ETH` (12.45 ETH) whenever no treasury was configured, and that
 * invented number flowed straight into the season close as the pool that gets
 * split between real wallets.
 */
export type TreasurySnapshot = {
  address: string | null;
  /** Null when there is no treasury configured or the chain did not answer. */
  balanceEth: number | null;
  chain: string;
};

export async function fetchTreasurySnapshot(): Promise<TreasurySnapshot> {
  const config = await getAppConfig();
  const address = normalizeEvmAddress(config.treasuryAddress);

  if (!address) {
    return { address: null, balanceEth: null, chain: "robinhood" };
  }

  const balanceEth = await getPublicClient()
    .getBalance({ address })
    .then((wei) => Number(formatEther(wei)))
    .catch(() => null);

  return { address, balanceEth, chain: "robinhood" };
}
