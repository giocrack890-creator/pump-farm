import { fetchTreasurySnapshot } from "@/lib/evm/treasury";
import { prisma } from "@/lib/prisma";
import { EXPLORER_ADDRESS } from "@/lib/chain/robinhood";
import { feeHistory } from "@/lib/pot/history";

/** Public proof: the treasury wallet and every payment recorded against it. */
export async function GET() {
  const snapshot = await fetchTreasurySnapshot();

  const [recent, history] = await Promise.all([
    prisma.treasuryTx
      .findMany({ orderBy: { createdAt: "desc" }, take: 50 })
      .catch(() => []),
    feeHistory(7),
  ]);

  return Response.json({
    address: snapshot.address,
    balanceEth: snapshot.balanceEth,
    explorerUrl: snapshot.address ? EXPLORER_ADDRESS(snapshot.address) : null,
    chain: snapshot.chain,
    /** Measured pot readings. Empty until enough have been recorded. */
    history,
    /** True when there is nothing real to show — never a stand-in balance. */
    unavailable: snapshot.balanceEth === null,
    transactions: recent.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount.toString(),
      txHash: tx.txHash,
      note: tx.note,
      createdAt: tx.createdAt.toISOString(),
    })),
  });
}
