import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { isEvmAddress, normalizeAddress } from "@/lib/auth/verify";
import { authMessage } from "@/lib/auth/jwt";

const NONCE_TTL_MS = 5 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("address")?.trim();

  if (!raw || !isEvmAddress(raw)) {
    return Response.json({ error: "valid EVM address required" }, { status: 400 });
  }

  const address = normalizeAddress(raw);
  const nonce = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);
  const timestamp = new Date().toISOString();

  await prisma.authNonce.create({
    data: { address, nonce, expiresAt, used: false },
  });

  return Response.json({
    address,
    nonce,
    timestamp,
    message: authMessage(nonce, timestamp),
    expiresAt: expiresAt.toISOString(),
    chain: "robinhood",
    chainId: 4663,
  });
}
