import { verifyMessage, isAddress, getAddress, type Hex } from "viem";
import { NextRequest } from "next/server";
import { authMessage, normalizeAuthAddress, verifyAuthToken } from "./jwt";

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
    return { address: normalizeAuthAddress(payload.address) };
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

/** True for local hosts, or when explicit demo/bypass env is enabled for preview/prod. */
export function isLocalDevRequest(request: Request): boolean {
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return true;
  if (process.env.ALLOW_DEV_BYPASS === "true") return true;
  if (process.env.DEMO_MODE === "true") return true;
  return false;
}
