import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { isEvmWalletAddress, normalizeEvmAddress } from "@/lib/auth/evm";
import {
  SIWX_STATEMENT,
  buildSiwxMessageText,
  checksumEvmAddress,
  resolveSiwxDomainUri,
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

  // DB / JWT use lowercase; SIWE message body must be EIP-55 (Phantom).
  const accountAddress = normalizeEvmAddress(raw);
  const accountAddressChecksum = checksumEvmAddress(raw);
  const { domain, uri } = resolveSiwxDomainUri(request);
  const nonce = randomBytes(24).toString("hex");
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);
  const expirationTime = expiresAt.toISOString();
  const message = buildSiwxMessageText({
    accountAddress: accountAddressChecksum,
    chainId,
    nonce,
    issuedAt,
    domain,
    uri,
    expirationTime,
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
    accountAddress: accountAddressChecksum,
    chainId,
    domain,
    uri,
    version: "1",
    statement: SIWX_STATEMENT,
    nonce,
    issuedAt,
    expirationTime,
    message,
  });
}
