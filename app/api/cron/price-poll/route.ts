import { isCronAuthorized } from "@/lib/farm/helpers";
import { fetchFarmPrice } from "@/lib/priceFeed";
import { recordPriceAndCheckGolden } from "@/lib/game/goldenHarvest";
import { recordFeeSnapshot } from "@/lib/pot/history";

/**
 * Price poll cron — a floor under the sampling, not the whole of it.
 *
 * Golden Harvest looks for a move inside a ten-minute window, and Vercel's free
 * cron tier runs once a day: on its own this could never detect one. Player
 * requests do the real sampling now (see `recordPriceAndCheckGolden`); this
 * keeps a heartbeat of history when nobody is playing.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let quote;
  try {
    quote = await fetchFarmPrice();
  } catch (err) {
    const message = err instanceof Error ? err.message : "price fetch failed";
    return Response.json({ error: message }, { status: 502 });
  }

  const result = await recordPriceAndCheckGolden(quote.priceUsd, { force: true });
  await recordFeeSnapshot();

  return Response.json({
    ok: true,
    source: quote.source,
    ...result,
  });
}
