import { fetchTreasurySnapshot } from "@/lib/evm/treasury";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const snapshot = await fetchTreasurySnapshot();

  const recent = await prisma.treasuryTx.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return Response.json({
    address: snapshot.address,
    balanceEth: snapshot.balanceEth,
    displayBalance: snapshot.displayBalance,
    chain: snapshot.chain,
    mock: snapshot.balanceEth === null,
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
