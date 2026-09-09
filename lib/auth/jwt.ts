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

export async function signAuthToken(address: string): Promise<string> {
  const normalized = address.toLowerCase();
  return new SignJWT({ address: normalized })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(normalized)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyAuthToken(token: string): Promise<AuthPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  const address = ((payload.address as string) || (payload.sub as string) || "").toLowerCase();
  if (!address) throw new Error("Invalid token payload");
  return { sub: address, address };
}

export function authMessage(nonce: string, timestamp: string): string {
  return `Pump Farm login\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
}
