import {
  PAYOUT_TIER_1_PCT,
  PAYOUT_TIER_1_SHARE,
  PAYOUT_TIER_2_PCT,
  PAYOUT_TIER_2_SHARE,
  PAYOUT_TIER_3_SHARE,
} from "@/lib/game/config";
import { getAppConfig } from "@/lib/config/appConfig";
import { getPotSnapshot } from "@/lib/pot/snapshot";

/**
 * Public season + Silo snapshot for the marketing landing sidebar.
 *
 * The Silo here is the same figure the game and the admin panel show: fees
 * claimable, fees still accruing, and what is already in the treasury. It used
 * to be the treasury balance alone, which is a fraction of the pot and made the
 * landing quote a smaller number than the rewards page.
 */
export async function GET() {
  const now = new Date();
  let seasonNumber = 1;
  let endsAt: string | null = null;
  let startsAt: string | null = null;

  try {
    const { findActiveSeason, ensureCurrentSeason } = await import("@/lib/farm/helpers");
    const season =
      (await findActiveSeason(now)) ?? (await ensureCurrentSeason(now));
    seasonNumber = season.number;
    endsAt = season.endsAt.toISOString();
    startsAt = season.startsAt.toISOString();
  } catch {
    /* demo / no DB — keep Season 1 defaults */
    const end = new Date(now.getTime() + 4.5 * 24 * 60 * 60 * 1000);
    endsAt = end.toISOString();
  }

  const [pot, config] = await Promise.all([getPotSnapshot(), getAppConfig()]);

  const live = pot.ok || pot.stale;
  // Null, not zero: an unread pot is unknown, and zero is a claim.
  const siloBalance = live ? pot.potEth : null;
  const siloTarget = pot.siloTargetEth;
  const percentFull =
    siloBalance != null
      ? Math.min(100, Math.max(0, (siloBalance / siloTarget) * 100))
      : null;

  return Response.json({
    ticker: config.tokenTicker,
    season: {
      number: seasonNumber,
      startsAt,
      endsAt,
    },
    siloBalance,
    siloBalanceUsd: pot.potUsd,
    siloBalanceUnit: "ETH",
    siloTarget,
    percentFull: percentFull == null ? null : Number(percentFull.toFixed(2)),
    payoutSplit: [
      {
        id: "top",
        label: `Top ${PAYOUT_TIER_1_PCT * 100}%`,
        share: PAYOUT_TIER_1_SHARE,
      },
      {
        id: "mid",
        label: `Next ${PAYOUT_TIER_2_PCT * 100}%`,
        share: PAYOUT_TIER_2_SHARE,
      },
      {
        id: "rest",
        label: "Active rest",
        share: PAYOUT_TIER_3_SHARE,
      },
    ],
    live,
    stale: pot.stale,
    treasuryAddress: pot.treasury,
  });
}
