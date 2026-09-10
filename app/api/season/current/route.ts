import { fetchTreasurySnapshot } from "@/lib/evm/treasury";
import {
  PAYOUT_TIER_1_PCT,
  PAYOUT_TIER_1_SHARE,
  PAYOUT_TIER_2_PCT,
  PAYOUT_TIER_2_SHARE,
  PAYOUT_TIER_3_SHARE,
  SILO_TARGET_ETH,
  TOKEN_TICKER,
} from "@/lib/game/config";
import { isDemoDbMode } from "@/lib/demo/farmMemory";

/**
 * Public season + Silo snapshot for the marketing landing sidebar.
 * Silo balance comes from the same treasury path as the in-game pot.
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

  const treasury = await fetchTreasurySnapshot();
  // Real on-chain balance only — never MOCK_TREASURY_ETH display stand-in
  const liveTreasury = treasury.balanceEth != null && !isDemoDbMode();
  const siloBalance = liveTreasury ? Number(treasury.balanceEth) : 0;
  const siloTarget = SILO_TARGET_ETH;
  const percentFull = liveTreasury
    ? Math.min(100, Math.max(0, (siloBalance / siloTarget) * 100))
    : 0;

  return Response.json({
    ticker: TOKEN_TICKER,
    season: {
      number: seasonNumber,
      startsAt,
      endsAt,
    },
    siloBalance,
    siloBalanceUnit: "ETH",
    siloTarget,
    percentFull: Number(percentFull.toFixed(2)),
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
    live: liveTreasury,
    treasuryAddress: treasury.address || null,
  });
}
