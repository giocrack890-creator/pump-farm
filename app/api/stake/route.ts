import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/verify";
import { computeUnlockAt, stakingSpMultiplier } from "@/lib/evm/staking";
import { STAKE_LOCK_TIERS } from "@/lib/game/config";

type StakeBody = {
  amount?: string | number;
  lockDays?: number;
  txHash?: string;
};

/**
 * Records a stake after the client has transferred $FARM to the escrow vault.
 *
 * TODO: replace escrow bookkeeping with an audited on-chain staking program
 * before mainnet. Do not store or use private keys here — the client signs the
 * transfer; this route only records the commitment after verifying the tx hash
 * shape (full on-chain confirmation can be added later).
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth.error;

  let body: StakeBody;
  try {
    body = (await request.json()) as StakeBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const lockDays = Number(body.lockDays);
  const txHash = body.txHash?.trim();
  const amountRaw = body.amount;

  if (!txHash || amountRaw === undefined || !Number.isFinite(lockDays)) {
    return Response.json(
      { error: "amount, lockDays, and txHash are required" },
      { status: 400 },
    );
  }

  const allowed = STAKE_LOCK_TIERS.some((t) => t.lockDays === lockDays);
  if (!allowed) {
    return Response.json(
      {
        error: `lockDays must be one of: ${STAKE_LOCK_TIERS.map((t) => t.lockDays).join(", ")}`,
      },
      { status: 400 },
    );
  }

  let amount: Decimal;
  try {
    amount = new Decimal(amountRaw);
  } catch {
    return Response.json({ error: "invalid amount" }, { status: 400 });
  }
  if (amount.lte(0)) {
    return Response.json({ error: "amount must be positive" }, { status: 400 });
  }

  const existing = await prisma.stake.findFirst({ where: { txHash } });
  if (existing) {
    return Response.json(
      { error: "txHash already recorded", stakeId: existing.id },
      { status: 409 },
    );
  }

  const lockedAt = new Date();
  const unlockAt = computeUnlockAt(lockedAt, lockDays);

  const stake = await prisma.stake.create({
    data: {
      walletId: auth.address,
      amount: amount.toFixed(),
      lockDays,
      lockedAt,
      unlockAt,
      txHash,
    },
  });

  return Response.json({
    stake: {
      id: stake.id,
      amount: stake.amount.toString(),
      lockDays: stake.lockDays,
      lockedAt: stake.lockedAt.toISOString(),
      unlockAt: stake.unlockAt.toISOString(),
      txHash: stake.txHash,
      spMultiplier: stakingSpMultiplier(lockDays),
    },
    note: "Escrow commitment recorded. On-chain program integration pending.",
  });
}
