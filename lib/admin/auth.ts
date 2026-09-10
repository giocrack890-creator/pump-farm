import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth/jwt";

/**
 * Who may see the ops panel.
 *
 * Two ways in, because two different things need it:
 *
 *   ADMIN_TOKEN    a shared secret, for the payout script and anything else
 *                  running from a terminal. Compared in constant time.
 *   ADMIN_WALLETS  a comma-separated allowlist of addresses, checked against
 *                  the ordinary session JWT — so an operator opens /admin with
 *                  the wallet they already signed in with.
 *
 * Neither configured means the admin surface is closed, not open. That is the
 * safe default for endpoints that expose full player addresses and can move the
 * game's money.
 */

export type AdminIdentity = { actor: string; via: "token" | "wallet" };

function adminToken(): string {
  return process.env.ADMIN_TOKEN?.trim() ?? "";
}

function adminWallets(): string[] {
  return (process.env.ADMIN_WALLETS ?? "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter((a) => /^0x[a-f0-9]{40}$/.test(a));
}

export function isAdminConfigured(): boolean {
  return Boolean(adminToken()) || adminWallets().length > 0;
}

function tokenMatches(given: string): boolean {
  const expected = adminToken();
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function getAdminIdentity(
  request: Request,
): Promise<AdminIdentity | null> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const credential = header.slice(7).trim();
  if (!credential) return null;

  if (tokenMatches(credential)) return { actor: "ops-token", via: "token" };

  // Not the shared secret — try it as a session JWT from an allowlisted wallet.
  const allowed = adminWallets();
  if (allowed.length === 0) return null;
  try {
    const payload = await verifyAuthToken(credential);
    const address = payload.address.toLowerCase();
    if (!allowed.includes(address)) return null;
    return { actor: address, via: "wallet" };
  } catch {
    return null;
  }
}

export type AdminGuard =
  | { identity: AdminIdentity }
  | { error: Response };

export async function requireAdmin(request: Request): Promise<AdminGuard> {
  if (!isAdminConfigured()) {
    return {
      error: Response.json(
        { error: "admin API disabled — set ADMIN_TOKEN or ADMIN_WALLETS" },
        { status: 503 },
      ),
    };
  }
  const identity = await getAdminIdentity(request);
  if (!identity) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { identity };
}

export function isAdminError(value: AdminGuard): value is { error: Response } {
  return "error" in value;
}

/** Record an admin action. Never throws — an audit failure must not block ops. */
export async function auditAdmin(
  actor: string,
  action: string,
  detail?: unknown,
): Promise<void> {
  try {
    await prisma.adminAudit.create({
      data: {
        actor,
        action,
        detail:
          detail === undefined
            ? null
            : typeof detail === "string"
              ? detail
              : JSON.stringify(detail),
      },
    });
  } catch (err) {
    console.warn("[admin-audit] could not record", action, err);
  }
}
