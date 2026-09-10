import { prisma } from "@/lib/prisma";
import {
  isEvmWalletAddress,
  normalizeEvmAddress,
  verifyEvmMessageSignature,
} from "@/lib/auth/evm";
import { extractNonceFromMessage } from "@/lib/auth/siwx-message";
import { upsertWalletAndIssueToken } from "@/lib/auth/issueSession";
import { canUseAuthDb } from "@/lib/auth/db";
import { ACTIVE_CHAIN } from "@/lib/chain/robinhood";

type Body = {
  data?: {
    accountAddress?: string;
    chainId?: string;
  };
  message?: string;
  signature?: string;
  referredBy?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const accountAddress = body.data?.accountAddress?.trim();
  const chainId = body.data?.chainId?.trim();
  const message = body.message;
  const signature = body.signature;

  if (!accountAddress || !chainId || !message || !signature) {
    return Response.json(
      { error: "data.accountAddress, data.chainId, message, and signature are required" },
      { status: 400 },
    );
  }
  if (!isEvmWalletAddress(accountAddress)) {
    return Response.json({ error: "invalid EVM address" }, { status: 400 });
  }

  const address = normalizeEvmAddress(accountAddress);
  const nonce = extractNonceFromMessage(message);
  if (!nonce) {
    return Response.json({ error: "nonce missing from message" }, { status: 400 });
  }

  if (canUseAuthDb()) {
    const record = await prisma.authNonce.findUnique({ where: { nonce } });
    if (!record || record.address.toLowerCase() !== address.toLowerCase()) {
      return Response.json({ error: "invalid nonce" }, { status: 401 });
    }
    if (record.used) {
      return Response.json({ error: "nonce already used" }, { status: 401 });
    }
    if (record.expiresAt.getTime() < Date.now()) {
      return Response.json({ error: "nonce expired" }, { status: 401 });
    }

    const ok = await verifyEvmMessageSignature({ address, message, signature });
    if (!ok) {
      return Response.json({ error: "invalid signature" }, { status: 401 });
    }

    await prisma.authNonce.update({
      where: { id: record.id },
      data: { used: true },
    });
  } else {
    const ok = await verifyEvmMessageSignature({ address, message, signature });
    if (!ok) {
      return Response.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  const params = new URL(request.url).searchParams;
  const referredBy = body.referredBy ?? params.get("ref") ?? undefined;

  try {
    const session = await upsertWalletAndIssueToken(address, referredBy);
    return Response.json({
      ...session,
      chainId,
      chain: "robinhood",
      chainIdNumeric: ACTIVE_CHAIN.id,
    });
  } catch (e) {
    console.error("siwx verify failed", e);
    return Response.json({ error: "failed to issue session" }, { status: 500 });
  }
}
