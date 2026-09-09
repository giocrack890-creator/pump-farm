import { verifyMessage, isAddress, getAddress, type Hex } from "viem";
import { NextRequest } from "next/server";
import { authMessage, verifyAuthToken } from "./jwt";

export function isEvmAddress(value: string): boolean {
  return isAddress(value);
}

export function normalizeAddress(value: string): string {
  return getAddress(value).toLowerCase();
}

export async function verifyWalletSignature(params: {
  address: string;
  signature: string;
  nonce: string;
  timestamp: string;
}): Promise<boolean> {
  try {
    if (!isAddress(params.address)) return false;
    const message = authMessage(params.nonce, params.timestamp);
    return await verifyMessage({
      address: getAddress(params.address),
      message,
      signature: params.signature as Hex,
    });
  } catch {
    return false;
  }
}

export async function requireAuth(
  request: Request | NextRequest,
): Promise<{ address: string } | { error: Response }> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return {
      error: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  try {
    const payload = await verifyAuthToken(header.slice(7));
    return { address: payload.address.toLowerCase() };
  } catch {
    return {
      error: Response.json({ error: "Invalid token" }, { status: 401 }),
    };
  }
}

export function isAuthError(
  value: { address: string } | { error: Response },
): value is { error: Response } {
  return "error" in value;
}

/** True only for local/dev hosts — never enable in production. */
export function isLocalDevRequest(request: Request): boolean {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_BYPASS !== "true") {
    // Still allow if Host is clearly localhost (local next start)
    const host = request.headers.get("host") ?? "";
    return host.startsWith("localhost") || host.startsWith("127.0.0.1");
  }
  if (process.env.NODE_ENV !== "production") return true;
  const host = request.headers.get("host") ?? "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}
