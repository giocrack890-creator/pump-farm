import { getTreasuryAddress, getTreasuryEthBalance } from "./connection";

export async function fetchTreasurySnapshot() {
  const address = getTreasuryAddress();
  const balance = await getTreasuryEthBalance();
  return {
    address,
    balanceEth: balance,
    displayBalance: balance ?? Number(process.env.MOCK_TREASURY_ETH ?? "12.45"),
    chain: "robinhood",
  };
}
