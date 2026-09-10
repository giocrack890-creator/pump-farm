import { isCronAuthorized, ensureCurrentSeason } from "@/lib/farm/helpers";
import { closeSeason } from "@/lib/game/closeSeason";
import { getAppConfig } from "@/lib/config/appConfig";

/**
 * Season close cron. Protected by CRON_SECRET.
 *
 * Dry-run unless BOTH `?dryRun=false` and the `payoutsEnabled` runtime flag are
 * set — a flag an operator turns on in /admin. Two switches because this is the
 * step that decides what real money each farmer is owed, and a stray query
 * parameter should not be enough to trigger it.
 *
 * Even at its most live, this writes rows. It never sends a transaction.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const config = await getAppConfig({ fresh: true });
  const requestedLive = searchParams.get("dryRun") === "false";
  const dryRun = !(requestedLive && config.payoutsEnabled);

  const now = new Date();
  const result = await closeSeason({ dryRun, now });

  if (result.reason === "no season ready to close") {
    // Ensure a live season still exists for the next window.
    await ensureCurrentSeason(now);
  }

  return Response.json({
    ...result,
    payoutsEnabled: config.payoutsEnabled,
    ...(requestedLive && !config.payoutsEnabled
      ? { note: "stayed dry-run: payoutsEnabled is off in admin config" }
      : {}),
  });
}
