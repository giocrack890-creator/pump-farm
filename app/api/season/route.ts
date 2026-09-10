import { ensureCurrentSeason, findActiveSeason } from "@/lib/farm/helpers";
import { getPotSnapshot } from "@/lib/pot/snapshot";
import { SEASON_DURATION_DAYS } from "@/lib/game/config";

/**
 * The season window computed without a database, for demo mode and for the
 * minutes a database is unreachable. The pot is real either way — it is read
 * from chain — and a countdown that keeps ticking beats a 500 that blanks the
 * whole rewards page.
 */
function fallbackSeason(now: Date) {
  const durationMs = SEASON_DURATION_DAYS * 24 * 60 * 60 * 1000;
  const startsAt = new Date(Math.floor(now.getTime() / durationMs) * durationMs);
  return {
    id: "offline",
    // There is no season history to number against without a database, and a
    // week-index since the epoch (2958) reads as a bug. Callers get `offline`.
    number: 1,
    startsAt,
    endsAt: new Date(startsAt.getTime() + durationMs),
    closedAt: null as Date | null,
    poolAmount: null,
    offline: true,
  };
}

/**
 * The live season and the pot it will pay from.
 *
 * The pot ships with the season on purpose: the rewards page used to ask for
 * `pool` here, get nothing back, and fall through to a hardcoded 42.5 ETH —
 * quoting a six-figure prize that did not exist.
 */
export async function GET() {
  const now = new Date();
  const [season, pot] = await Promise.all([
    (async () =>
      (await findActiveSeason(now)) ?? (await ensureCurrentSeason(now)))().catch(
      () => fallbackSeason(now),
    ),
    getPotSnapshot(),
  ]);
  const msRemaining = Math.max(0, season.endsAt.getTime() - now.getTime());

  return Response.json({
    id: season.id,
    number: season.number,
    startsAt: season.startsAt.toISOString(),
    endsAt: season.endsAt.toISOString(),
    closedAt: season.closedAt?.toISOString() ?? null,
    poolAmount: season.poolAmount?.toString() ?? null,
    offline: "offline" in season,
    msRemaining,
    countdown: {
      days: Math.floor(msRemaining / (24 * 60 * 60 * 1000)),
      hours: Math.floor((msRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)),
      minutes: Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000)),
      seconds: Math.floor((msRemaining % (60 * 1000)) / 1000),
    },
    pool: {
      /** null when the chain has not answered — the UI must show nothing. */
      eth: pot.ok || pot.stale ? pot.potEth : null,
      usd: pot.potUsd,
      ethUsd: pot.ethUsd || null,
      claimableEth: pot.claimableEth,
      pendingEth: pot.pendingEth,
      treasuryEth: pot.treasuryEth,
      siloTargetEth: pot.siloTargetEth,
      ok: pot.ok,
      stale: pot.stale,
      reason: pot.reason,
      updatedAt: pot.updatedAt,
    },
  });
}
