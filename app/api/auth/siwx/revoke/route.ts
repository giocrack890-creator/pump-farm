import { requireAuth, isAuthError } from "@/lib/auth/verify";
import { normalizeAuthAddress } from "@/lib/auth/jwt";

/**
 * JWT sessions are client-held (Zustand). Revoke acknowledges logout for the
 * matching wallet; the client clears localStorage via useWalletStore.clearAuth.
 */
export async function POST(request: Request) {
  let body: { address?: string; chainId?: string } = {};
  try {
    body = (await request.json()) as { address?: string; chainId?: string };
  } catch {
    // empty body ok — still clear client-side
  }

  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const auth = await requireAuth(request);
    if (!isAuthError(auth) && body.address) {
      if (normalizeAuthAddress(body.address) !== auth.address) {
        return Response.json({ error: "address mismatch" }, { status: 403 });
      }
    }
  }

  return Response.json({ ok: true, revoked: true });
}
