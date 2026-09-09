import { signAuthToken } from "@/lib/auth/jwt";
import { isLocalDevRequest } from "@/lib/auth/verify";
import { DEMO_ADDRESS, getDemoWallet, isDemoDbMode } from "@/lib/demo/farmMemory";
import { prisma } from "@/lib/prisma";
import {
  createStarterPlots,
  ensureCurrentSeason,
  ensureSeasonPoint,
  generateReferralCode,
} from "@/lib/farm/helpers";
import { STARTER_PLOTS } from "@/lib/game/config";

/**
 * POST /api/auth/dev-bypass — localhost only.
 * Works without DATABASE_URL (in-memory demo farm).
 */
export async function POST(request: Request) {
  if (!isLocalDevRequest(request)) {
    return Response.json({ error: "Not available" }, { status: 403 });
  }

  if (isDemoDbMode()) {
    getDemoWallet();
    const token = await signAuthToken(DEMO_ADDRESS);
    return Response.json({
      token,
      address: DEMO_ADDRESS,
      bypass: true,
      demo: true,
      note: "Demo mode (no DATABASE_URL). Growth is 30s for testing.",
    });
  }

  const address = DEMO_ADDRESS;
  try {
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
    return Response.json({ token, address, bypass: true, demo: false });
  } catch (e) {
    // Fallback to memory if Prisma still fails
    console.error("dev-bypass db failed, using demo memory", e);
    getDemoWallet();
    const token = await signAuthToken(DEMO_ADDRESS);
    return Response.json({
      token,
      address: DEMO_ADDRESS,
      bypass: true,
      demo: true,
    });
  }
}
