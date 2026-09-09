import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth/jwt";
import { isLocalDevRequest } from "@/lib/auth/verify";
import {
  createStarterPlots,
  ensureCurrentSeason,
  ensureSeasonPoint,
  generateReferralCode,
} from "@/lib/farm/helpers";
import { STARTER_PLOTS } from "@/lib/game/config";

/**
 * POST /api/auth/dev-bypass
 * Issues a JWT without wallet signature. Blocked outside localhost.
 */
export async function POST(request: Request) {
  if (!isLocalDevRequest(request)) {
    return Response.json({ error: "Not available" }, { status: 403 });
  }

  // Fixed hex address for Prisma string id (localhost playtesting only).
  const address = "0x0000000000000000000000000000000000faded1";

  const season = await ensureCurrentSeason();
  let wallet = await prisma.wallet.findUnique({
    where: { address },
    include: { plots: true },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        address,
        referralCode: generateReferralCode(),
        hypeBalance: 500,
        harvestStreak: 0,
      },
      include: { plots: true },
    });
  }

  if (wallet.plots.length < STARTER_PLOTS) {
    await createStarterPlots(address);
  }
  await ensureSeasonPoint(address, season.id);

  const token = await signAuthToken(address);
  return Response.json({
    token,
    address,
    bypass: true,
    note: "Localhost-only. Never enabled in production hosts.",
  });
}
