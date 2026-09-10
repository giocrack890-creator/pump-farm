#!/usr/bin/env tsx
/**
 * Fill a local database with farmers so the leaderboard and the ops panel have
 * something to show. Development only — it writes fake wallets.
 *
 *   npm run db:seed:local
 */
// Must come first: it populates process.env before any module reads it.
import "./env.mts";
import { PrismaClient } from "@prisma/client";
import { STARTER_PLOTS, SEASON_DURATION_DAYS } from "../lib/game/config";

const prisma = new PrismaClient();
const now = new Date();

const season = await prisma.season.upsert({
  where: { number: 1 },
  create: {
    number: 1,
    startsAt: new Date(now.getTime() - 2 * 86_400_000),
    endsAt: new Date(now.getTime() + (SEASON_DURATION_DAYS - 2) * 86_400_000),
  },
  update: {},
});

const FARMERS = [
  { name: "greenwick", points: 4820, online: 0 },
  { name: "silo_sally", points: 3110, online: 40 },
  { name: "candlecarl", points: 2450, online: 95 },
  { name: "hodlharriet", points: 1890, online: 150 },
  { name: "rugproof", points: 1240, online: 210 },
  { name: "moonmolly", points: 860, online: 3_600 },
  { name: "dipdan", points: 540, online: 7_200 },
  { name: "farmerfred", points: 310, online: 86_400 },
  { name: "botfarm_01", points: 9_999, online: 60, sybil: true },
];

for (const [i, farmer] of FARMERS.entries()) {
  const address = `0x${(i + 1).toString(16).padStart(40, "0")}`;
  await prisma.wallet.upsert({
    where: { address },
    create: {
      address,
      referralCode: `LOCAL${i}`,
      displayName: farmer.name,
      hypeBalance: 50 + i * 25,
      harvestStreak: Math.max(0, 7 - i),
      lastSeenAt: new Date(now.getTime() - farmer.online * 1000),
      flaggedSybil: farmer.sybil ?? false,
    },
    update: {
      displayName: farmer.name,
      lastSeenAt: new Date(now.getTime() - farmer.online * 1000),
      flaggedSybil: farmer.sybil ?? false,
    },
  });

  await prisma.seasonPoint.upsert({
    where: { walletId_seasonId: { walletId: address, seasonId: season.id } },
    create: { walletId: address, seasonId: season.id, points: farmer.points },
    update: { points: farmer.points },
  });

  const existing = await prisma.plot.count({ where: { walletId: address } });
  if (existing < STARTER_PLOTS) {
    await prisma.plot.createMany({
      data: Array.from({ length: STARTER_PLOTS - existing }, (_, index) => ({
        walletId: address,
        index: existing + index,
        status: "empty",
      })),
    });
  }
}

console.log(
  `Season ${season.number}: ${FARMERS.length} farmers ` +
    `(${FARMERS.filter((f) => f.online < 300).length} online, 1 flagged).`,
);
await prisma.$disconnect();
