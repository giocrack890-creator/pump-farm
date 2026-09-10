import type { SIWXSession } from "@reown/appkit";
import { requireAuth, isAuthError } from "@/lib/auth/verify";
import { normalizeAuthAddress } from "@/lib/auth/jwt";
import {
  SIWX_STATEMENT,
  resolveSiwxDomainUri,
} from "@/lib/auth/siwx-message";

/**
 * Returns a reconstructed SIWX session when the Bearer JWT matches the wallet.
 * AppKit uses this on reload so the user is not re-prompted to sign.
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth.error;

  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim();
  const chainId = searchParams.get("chainId")?.trim();

  if (!address || !chainId) {
    return Response.json(
      { error: "address and chainId are required" },
      { status: 400 },
    );
  }

  if (normalizeAuthAddress(address) !== auth.address) {
    return Response.json({ sessions: [] as SIWXSession[] });
  }

  const { domain, uri } = resolveSiwxDomainUri(request);

  const session: SIWXSession = {
    data: {
      accountAddress: auth.address,
      chainId: chainId as SIWXSession["data"]["chainId"],
      domain,
      uri,
      version: "1",
      nonce: "active-session",
      statement: SIWX_STATEMENT,
      issuedAt: new Date().toISOString(),
    },
    message: "active-session",
    signature: "active-session",
  };

  return Response.json({ sessions: [session], address: auth.address });
}
