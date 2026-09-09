import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth/jwt";
import {
  verifyWalletSignature,
  isEvmAddress,
  normalizeAddress,
} from "@/lib/auth/verify";
import {
  createStarterPlots,
  ensureCurrentSeason,
  ensureSeasonPoint,
  generateReferralCode,
} from "@/lib/farm/helpers";
import { STARTER_PLOTS, REFERRAL_HYPE_BURST } from "@/lib/game/config";

type AuthBody = {
  address?: string;
  signature?: string;
  nonce?: string;
  timestamp?: string;
  referredBy?: string;
};

export async function POST(request: Request) {
  let body: AuthBody;
  try {
    body = (await request.json()) as AuthBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { signature, nonce, timestamp, referredBy } = body;
  if (!body.address || !signature || !nonce || !timestamp) {
    return Response.json(
      { error: "address, signature, nonce, and timestamp are required" },
      { status: 400 },
    );
  }

  if (!isEvmAddress(body.address)) {
    return Response.json({ error: "invalid EVM address" }, { status: 400 });
  }
  const address = normalizeAddress(body.address);

  const record = await prisma.authNonce.findUnique({ where: { nonce } });
  if (!record || record.address.toLowerCase() !== address) {
    return Response.json({ error: "invalid nonce" }, { status: 401 });
  }
  if (record.used) {
    return Response.json({ error: "nonce already used" }, { status: 401 });
  }
  if (record.expiresAt.getTime() < Date.now()) {
    return Response.json({ error: "nonce expired" }, { status: 401 });
  }

  const ok = await verifyWalletSignature({
    address,
    signature,
    nonce,
    timestamp,
  });
  if (!ok) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  await prisma.authNonce.update({
    where: { id: record.id },
    data: { used: true },
  });

  let referrerAddress: string | null = null;
  if (referredBy && referredBy.toLowerCase() !== address) {
    const referrer = await prisma.wallet.findFirst({
      where: {
        OR: [{ referralCode: referredBy }, { address: referredBy.toLowerCase() }],
      },
    });
    if (referrer && referrer.address !== address) {
      referrerAddress = referrer.address;
    }
  }

  const season = await ensureCurrentSeason();

  let wallet = await prisma.wallet.findUnique({
    where: { address },
    include: { plots: true },
  });
  const isNew = !wallet;

  if (!wallet) {
    let created = null;
    for (let i = 0; i < 5 && !created; i++) {
      try {
        created = await prisma.wallet.create({
          data: {
            address,
            referredBy: referrerAddress,
            referralCode: generateReferralCode(),
            hypeBalance: 50,
          },
          include: { plots: true },
        });
      } catch {
        created = null;
      }
    }
    if (!created) {
      return Response.json({ error: "failed to create wallet" }, { status: 500 });
    }
    wallet = created;

    if (referrerAddress) {
      await prisma.wallet.update({
        where: { address: referrerAddress },
        data: { hypeBalance: { increment: REFERRAL_HYPE_BURST } },
      });
      await prisma.hypeLedger.create({
        data: {
          walletId: referrerAddress,
          amount: REFERRAL_HYPE_BURST,
          reason: `referral:${address}`,
        },
      });
    }
  }

  if (wallet.plots.length < STARTER_PLOTS) {
    await createStarterPlots(wallet.address);
  }

  await ensureSeasonPoint(wallet.address, season.id);
  const token = await signAuthToken(wallet.address);

  return Response.json({
    token,
    address: wallet.address,
    isNew,
    referralCode: wallet.referralCode,
    seasonId: season.id,
    seasonNumber: season.number,
    chain: "robinhood",
  });
}
