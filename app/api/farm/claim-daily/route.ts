import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/verify";
import { utcDayKey } from "@/lib/farm/helpers";
import { dailyAllowance } from "@/lib/game/hype";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth.error;

  const now = new Date();
  const today = utcDayKey(now);
  const allowance = dailyAllowance();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { address: auth.address },
      });
      if (!wallet) {
        throw Object.assign(new Error("wallet not found"), { status: 404 });
      }

      if (wallet.lastDailyHypeAt) {
        const lastDay = utcDayKey(wallet.lastDailyHypeAt);
        if (lastDay === today) {
          throw Object.assign(new Error("daily hype already claimed"), {
            status: 409,
          });
        }
      }

      const amount = new Decimal(allowance);
      const newBalance = new Decimal(wallet.hypeBalance.toString()).plus(amount);

      await tx.wallet.update({
        where: { address: auth.address },
        data: {
          hypeBalance: newBalance.toFixed(),
          lastDailyHypeAt: now,
        },
      });

      await tx.hypeLedger.create({
        data: {
          walletId: auth.address,
          amount: amount.toFixed(),
          reason: `daily_allowance:${today}`,
        },
      });

      return { hypeBalance: newBalance.toFixed(), amount: amount.toFixed() };
    });

    return Response.json({
      claimed: true,
      amount: result.amount,
      hypeBalance: result.hypeBalance,
      claimedAt: now.toISOString(),
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "claim failed";
    return Response.json({ error: message }, { status });
  }
}
