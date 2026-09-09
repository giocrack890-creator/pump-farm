import { NextRequest } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth/verify";
import {
  demoCompleteTutorial,
  demoTutorialInstantGrow,
  isDemoDbMode,
} from "@/lib/demo/farmMemory";
import { prisma } from "@/lib/prisma";

/**
 * POST { action: "complete" | "instant-grow", plotId?: string, replay?: boolean }
 * Tutorial completion is server-authoritative per wallet.
 * Instant-grow is tutorial-only; `replay: true` allows Menu → Replay Tutorial only.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth.error;

  let body: { action?: string; plotId?: string; replay?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;
  if (action !== "complete" && action !== "instant-grow") {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  if (isDemoDbMode()) {
    try {
      if (action === "complete") {
        return Response.json(demoCompleteTutorial());
      }
      if (!body.plotId) {
        return Response.json({ error: "plotId required" }, { status: 400 });
      }
      return Response.json(demoTutorialInstantGrow(body.plotId, Boolean(body.replay)));
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "Tutorial action failed" },
        { status: 400 },
      );
    }
  }

  const wallet = await prisma.wallet.findUnique({
    where: { address: auth.address },
  });
  if (!wallet) {
    return Response.json({ error: "wallet not found" }, { status: 404 });
  }

  if (action === "complete") {
    await prisma.wallet.update({
      where: { address: auth.address },
      data: { hasCompletedTutorial: true },
    });
    return Response.json({ hasCompletedTutorial: true });
  }

  if (wallet.hasCompletedTutorial && !body.replay) {
    return Response.json(
      { error: "Tutorial instant-grow is not available after tutorial completion" },
      { status: 403 },
    );
  }

  if (!body.plotId) {
    return Response.json({ error: "plotId required" }, { status: 400 });
  }

  const plot = await prisma.plot.findFirst({
    where: { id: body.plotId, walletId: auth.address },
  });
  if (!plot?.plantedAt) {
    return Response.json({ error: "No growing crop on that plot" }, { status: 400 });
  }

  const updated = await prisma.plot.update({
    where: { id: plot.id },
    data: { maturesAt: new Date(Date.now() - 1000) },
  });

  return Response.json({
    plot: {
      id: updated.id,
      maturesAt: updated.maturesAt?.toISOString() ?? null,
    },
  });
}
