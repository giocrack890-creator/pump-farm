import { getPotSnapshot } from "@/lib/pot/snapshot";

/**
 * The Silo, straight from chain. One source of truth for every surface that
 * shows a pot — the landing card, the rewards page and the admin panel — so
 * they cannot disagree about how much money is on the table.
 */
export async function GET() {
  const pot = await getPotSnapshot();

  return Response.json(pot, {
    headers: {
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45",
    },
  });
}
