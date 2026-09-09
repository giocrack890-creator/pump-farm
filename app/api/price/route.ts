import { fetchFarmPrice } from "@/lib/priceFeed";

export async function GET() {
  try {
    const quote = await fetchFarmPrice();
    return Response.json(quote, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "price fetch failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
