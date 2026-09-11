import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { requireAuth, isAuthError } from "@/lib/auth/verify";
import { computeUnlockAt, stakingSpMultiplier } from "@/lib/evm/staking";
import { verifyErc20Transfer } from "@/lib/evm/verifyTransfer";
import { getAppConfig } from "@/lib/config/appConfig";
import { STAKE_LOCK_TIERS } from "@/lib/game/config";
import { rateLimit } from "@/lib/rateLimit";

/**
 * What the client needs to stake: where to send, and the locks on offer.
 * The escrow comes from the runtime config, so repointing it in /admin changes
 * both the address players are told to use and the one transfers are checked
 * against — they cannot drift apart.
 */
export async function GET() {
  const config = await getAppConfig();
  return Response.json({
    escrowWallet: config.stakeEscrowAddress,
    tokenAddress: config.tokenAddress,
    ticker: config.tokenTicker,
    open: Boolean(config.stakeEscrowAddress && config.tokenAddress),
    tiers: STAKE_LOCK_TIERS,
  });
}

type StakeBody = {
  amount?: string | number;
  lockDays?: number;
  txHash?: string;
};

/**
 * Record a stake after the player has transferred $HOOD to the escrow.
 *
 * The transfer is verified on chain before anything is written. It used to be
 * taken on trust — the route only checked the hash was not a duplicate — which
 * meant any 32 random bytes bought a permanent +25% SP multiplier, and that
 * multiplier is a slice of a pot holding real money.
 *
 * The amount recorded is what the chain says moved, never what the client said.
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth.error;

  // Each attempt costs an RPC round trip; a wrong hash should not be free.
  const limit = rateLimit(`stake:${auth.address}`, 10, 60_000);
  if (!limit.ok) {
    return Response.json({ error: "too many attempts — wait a minute" }, { status: 429 });
  }

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

  const config = await getAppConfig();
  if (!config.tokenAddress || !config.stakeEscrowAddress) {
    return Response.json(
      { error: "staking is not open yet — no token or escrow configured" },
      { status: 503 },
    );
  }

  const proof = await verifyErc20Transfer({
    txHash,
    token: config.tokenAddress,
    from: auth.address,
    to: config.stakeEscrowAddress,
    minAmount: amount.toFixed(),
  });

  if (!proof.ok) {
    return Response.json({ error: proof.error }, { status: 400 });
  }

  const lockedAt = new Date();
  const unlockAt = computeUnlockAt(lockedAt, lockDays);

  try {
    const stake = await prisma.stake.create({
      data: {
        walletId: auth.address,
        // The chain's figure, not the client's.
        amount: proof.amount,
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
        confirmations: Number(proof.confirmations),
      },
      note: "Escrow commitment verified on chain. Unlock is manual until the staking program ships.",
    });
  } catch {
    // Unique index on txHash is the real guard against a double submit racing.
    return Response.json({ error: "txHash already recorded" }, { status: 409 });
  }
}
