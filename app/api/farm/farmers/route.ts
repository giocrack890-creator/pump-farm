import { NextRequest } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth/verify";
import {
  demoClaimFarmerIdle,
  demoDeployFarmer,
  demoDismissPendingScout,
  demoHirePendingFarmer,
  demoPromoteFarmer,
  demoScoutFarmer,
  isDemoDbMode,
} from "@/lib/demo/farmMemory";

type Body = {
  action?:
    | "scout"
    | "hire"
    | "dismiss-scout"
    | "deploy"
    | "bench"
    | "promote"
    | "claim-idle";
  farmerId?: string;
};

/**
 * Farmers hire/deploy loop (Hooders cold-call analogue) — demo-authoritative for now.
 */
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
      { error: "Farmers hire desk requires demo mode locally for now" },
      { status: 501 },
    );
  }

  try {
    switch (body.action) {
      case "scout":
        return Response.json(demoScoutFarmer());
      case "hire":
        return Response.json(demoHirePendingFarmer());
      case "dismiss-scout":
        return Response.json(demoDismissPendingScout());
      case "deploy":
        if (!body.farmerId) return Response.json({ error: "farmerId required" }, { status: 400 });
        return Response.json(demoDeployFarmer(body.farmerId, true));
      case "bench":
        if (!body.farmerId) return Response.json({ error: "farmerId required" }, { status: 400 });
        return Response.json(demoDeployFarmer(body.farmerId, false));
      case "promote":
        if (!body.farmerId) return Response.json({ error: "farmerId required" }, { status: 400 });
        return Response.json(demoPromoteFarmer(body.farmerId));
      case "claim-idle":
        return Response.json(demoClaimFarmerIdle());
      default:
        return Response.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Farmers action failed" },
      { status: 400 },
    );
  }
}
