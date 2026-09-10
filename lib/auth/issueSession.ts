import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth/jwt";
import {
  createStarterPlots,
  ensureCurrentSeason,
  ensureSeasonPoint,
  generateReferralCode,
} from "@/lib/farm/helpers";
import { STARTER_PLOTS, REFERRAL_HYPE_BURST } from "@/lib/game/config";
import { getDemoWallet } from "@/lib/demo/farmMemory";
import { canUseAuthDb } from "@/lib/auth/db";

export type IssuedSession = {
  token: string;
  address: string;
  isNew: boolean;
  referralCode: string | null;
  seasonId: string | null;
  seasonNumber: number | null;
};

/**
 * Upsert Wallet by address (PK) and issue the same JWT shape the app already uses.
 * Addresses are EVM 0x hex on Robinhood Chain (chain ID 4663).
 */
export async function upsertWalletAndIssueToken(
  address: string,
  referredBy?: string | null,
): Promise<IssuedSession> {
  if (!canUseAuthDb()) {
    getDemoWallet();
    const token = await signAuthToken(address);
    return {
      token,
      address,
      isNew: false,
      referralCode: null,
      seasonId: null,
      seasonNumber: null,
    };
  }

  let referrerAddress: string | null = null;
  if (referredBy && referredBy !== address) {
    const referrer = await prisma.wallet.findFirst({
      where: {
        OR: [{ referralCode: referredBy }, { address: referredBy }],
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
      throw new Error("failed to create wallet");
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

  return {
    token,
    address: wallet.address,
    isNew,
    referralCode: wallet.referralCode,
    seasonId: season.id,
    seasonNumber: season.number,
  };
}
