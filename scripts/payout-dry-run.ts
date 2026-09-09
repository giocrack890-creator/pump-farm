/**
 * Dry-run season payout computation against the DB (no on-chain sends).
 * Usage: npm run payout:dry-run
 */
import { PrismaClient } from "@prisma/client";
import { computePayouts } from "../lib/game/payout";
import { fetchTreasurySnapshot } from "../lib/evm/treasury";

const prisma = new PrismaClient();

async function main() {
  const season = await prisma.season.findFirst({
    where: { closedAt: null },
    orderBy: { number: "desc" },
  });
  if (!season) {
    console.log("No active season");
    return;
  }

  const points = await prisma.seasonPoint.findMany({
    where: { seasonId: season.id },
    include: { wallet: true },
  });
  const treasury = await fetchTreasurySnapshot();
  const computation = computePayouts({
    wallets: points.map((p) => ({
      address: p.walletId,
      points: p.points.toString(),
      flaggedSybil: p.wallet.flaggedSybil,
    })),
    poolAmount: treasury.displayBalance,
  });

  console.log(JSON.stringify({ seasonId: season.id, dryRun: true, computation }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
