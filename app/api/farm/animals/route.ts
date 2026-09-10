import { NextRequest } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth/verify";
import {
  demoBuyAnimal,
  demoClaimAnimalIdle,
  isDemoDbMode,
} from "@/lib/demo/farmMemory";

type Body = {
  action?: "buy" | "claim-idle";
  speciesId?: string;
};

/** Buy farm animals / claim their idle Hype — demo-authoritative for now. */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth.error;

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isDemoDbMode()) {
    return Response.json(
      { error: "Animals shop requires demo mode locally for now" },
      { status: 501 },
    );
  }

  try {
    switch (body.action) {
      case "buy":
        if (!body.speciesId) {
          return Response.json({ error: "speciesId required" }, { status: 400 });
        }
        return Response.json(demoBuyAnimal(body.speciesId));
      case "claim-idle":
        return Response.json(demoClaimAnimalIdle());
      default:
        return Response.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Animals action failed" },
      { status: 400 },
    );
  }
}
