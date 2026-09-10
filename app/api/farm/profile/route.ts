import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/verify";
import { validateDisplayName } from "@/lib/farm/displayName";
import { canUseAuthDb } from "@/lib/auth/db";
import { getDemoWallet, isDemoDbMode } from "@/lib/demo/farmMemory";

type Body = { displayName?: string };

/** GET current farmer profile (display name). */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth.error;

  if (isDemoDbMode() || !canUseAuthDb()) {
    const w = getDemoWallet();
    return Response.json({
      address: auth.address,
      displayName: w.displayName ?? null,
      needsDisplayName: !w.displayName,
    });
  }

  const wallet = await prisma.wallet.findUnique({
    where: { address: auth.address },
    select: { address: true, displayName: true },
  });
  if (!wallet) {
    return Response.json({ error: "wallet not found" }, { status: 404 });
  }
  return Response.json({
    address: wallet.address,
    displayName: wallet.displayName,
    needsDisplayName: !wallet.displayName,
  });
}

/** POST set / update farmer display name (required once after first wallet connect). */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth.error;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const checked = validateDisplayName(body.displayName);
  if (!checked.ok) {
    return Response.json({ error: checked.error }, { status: 400 });
  }

  if (isDemoDbMode() || !canUseAuthDb()) {
    const w = getDemoWallet();
    w.displayName = checked.name;
    return Response.json({
      address: auth.address,
      displayName: checked.name,
      needsDisplayName: false,
    });
  }

  const taken = await prisma.wallet.findFirst({
    where: {
      displayName: { equals: checked.name, mode: "insensitive" },
      NOT: { address: auth.address },
    },
    select: { address: true },
  });
  if (taken) {
    return Response.json({ error: "That farmer name is taken" }, { status: 409 });
  }

  try {
    const wallet = await prisma.wallet.update({
      where: { address: auth.address },
      data: { displayName: checked.name },
      select: { address: true, displayName: true },
    });
    return Response.json({
      address: wallet.address,
      displayName: wallet.displayName,
      needsDisplayName: false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint") || msg.includes("Wallet_displayName")) {
      return Response.json({ error: "That farmer name is taken" }, { status: 409 });
    }
    throw e;
  }
}
