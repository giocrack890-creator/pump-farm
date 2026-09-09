import { NextRequest } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth/verify";
import { demoPlaceDecor, isDemoDbMode } from "@/lib/demo/farmMemory";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth.error;

  let body: { itemId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.itemId) {
    return Response.json({ error: "itemId required" }, { status: 400 });
  }

  if (!isDemoDbMode()) {
    return Response.json({ error: "Decor placement requires demo mode for now" }, { status: 501 });
  }

  try {
    return Response.json(demoPlaceDecor(body.itemId));
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Decor failed" },
      { status: 400 },
    );
  }
}
