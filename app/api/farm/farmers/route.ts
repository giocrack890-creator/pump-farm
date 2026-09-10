import { NextRequest } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth/verify";
import {
  demoBuyWorkerUpgrade,
  demoClaimFarmerIdle,
  demoDeployFarmer,
  demoDismissPendingScout,
  demoHirePendingFarmer,
  demoHireSpecies,
  demoPromoteFarmer,
  demoScoutFarmer,
  demoSetAutoSeedTier,
  isDemoDbMode,
} from "@/lib/demo/farmMemory";

type Body = {
  action?:
    | "scout"
    | "hire"
    | "hire-species"
    | "dismiss-scout"
    | "deploy"
    | "bench"
    | "promote"
    | "claim-idle"
    | "buy-upgrade"
    | "set-auto-seed";
  farmerId?: string;
  speciesId?: string;
  upgradeId?: string;
  seedTier?: string;
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
      case "hire-species":
        if (!body.speciesId) {
          return Response.json({ error: "speciesId required" }, { status: 400 });
        }
        return Response.json(demoHireSpecies(body.speciesId));
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
      case "buy-upgrade":
        if (!body.upgradeId) {
          return Response.json({ error: "upgradeId required" }, { status: 400 });
        }
        return Response.json(demoBuyWorkerUpgrade(body.upgradeId));
      case "set-auto-seed":
        if (!body.seedTier) {
          return Response.json({ error: "seedTier required" }, { status: 400 });
        }
        return Response.json(demoSetAutoSeedTier(body.seedTier));
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
