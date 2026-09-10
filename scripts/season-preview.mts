#!/usr/bin/env tsx
/**
 * What the current season would pay, without writing anything.
 *
 *   npm run season:preview
 *
 * Reads the live pot and the standings and prints the split. This is the same
 * computation the close performs — running it first is how you check a season
 * before it settles.
 */
import { closeSeason } from "../lib/game/closeSeason";
import { prisma } from "../lib/prisma";

const season = await prisma.season.findFirst({
  where: { closedAt: null },
  orderBy: { number: "desc" },
});

if (!season) {
  console.log("No open season.");
  process.exit(0);
}

const result = await closeSeason({
  dryRun: true,
  seasonId: season.id,
  force: true,
});

console.log(JSON.stringify(result, null, 2));
await prisma.$disconnect();
