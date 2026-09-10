import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return encoder.encode(secret);
}

export type AuthPayload = {
  sub: string;
  address: string;
};

/** Normalize wallet address for JWT — EVM 0x addresses are lowercased. */
export function normalizeAuthAddress(address: string): string {
  const trimmed = address.trim();
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    return trimmed.toLowerCase();
  }
  return trimmed.toLowerCase();
}

export async function signAuthToken(address: string): Promise<string> {
  const normalized = normalizeAuthAddress(address);
  return new SignJWT({ address: normalized })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(normalized)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyAuthToken(token: string): Promise<AuthPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  const raw = (payload.address as string) || (payload.sub as string) || "";
  const address = normalizeAuthAddress(raw);
  if (!address) throw new Error("Invalid token payload");
  return { sub: address, address };
}

export function authMessage(nonce: string, timestamp: string): string {
  return `Pump Farm login\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}
