import { PrismaClient } from "@prisma/client";
import { SEASON_DURATION_DAYS } from "../lib/game/config";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.season.findFirst({ where: { number: 1 } });
  if (!existing) {
    const startsAt = new Date();
    await prisma.season.create({
      data: {
        number: 1,
        startsAt,
        endsAt: new Date(startsAt.getTime() + SEASON_DURATION_DAYS * 86400000),
      },
    });
  }

  const count = await prisma.treasuryTx.count();
  if (count === 0) {
    await prisma.treasuryTx.createMany({
      data: [
        {
          type: "deposit",
          amount: "2.5",
          txHash: "demo_deposit_1",
          note: "Seeded fee deposit for /proof demo",
        },
        {
          type: "deposit",
          amount: "1.1",
          txHash: "demo_deposit_2",
          note: "Seeded fee deposit for /proof demo",
        },
        {
          type: "payout",
          amount: "0.4",
          txHash: "demo_payout_1",
          note: "Seeded sample payout",
        },
      ],
    });
  }

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
