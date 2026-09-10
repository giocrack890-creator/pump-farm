import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { isEvmWalletAddress, normalizeEvmAddress } from "@/lib/auth/evm";
import {
  SIWX_DOMAIN,
  SIWX_STATEMENT,
  SIWX_URI,
  buildSiwxMessageText,
} from "@/lib/auth/siwx-message";
import { canUseAuthDb } from "@/lib/auth/db";

const NONCE_TTL_MS = 5 * 60 * 1000;

type Body = {
  accountAddress?: string;
  chainId?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.accountAddress?.trim();
  const chainId = body.chainId?.trim();
  if (!raw || !chainId) {
    return Response.json(
      { error: "accountAddress and chainId are required" },
      { status: 400 },
    );
  }
  if (!isEvmWalletAddress(raw)) {
    return Response.json({ error: "invalid EVM address" }, { status: 400 });
  }

  const accountAddress = normalizeEvmAddress(raw);
  const nonce = randomBytes(24).toString("hex");
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);
  const message = buildSiwxMessageText({
    accountAddress,
    chainId,
    nonce,
    issuedAt,
  });

  if (canUseAuthDb()) {
    await prisma.authNonce.create({
      data: {
        address: accountAddress,
        nonce,
        expiresAt,
        used: false,
      },
    });
  }

  return Response.json({
    accountAddress,
    chainId,
    domain: SIWX_DOMAIN,
    uri: SIWX_URI,
    version: "1",
    statement: SIWX_STATEMENT,
    nonce,
    issuedAt,
    expirationTime: expiresAt.toISOString(),
    message,
  });
}
