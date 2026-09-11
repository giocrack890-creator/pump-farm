/**
 * TODO: replace with audited on-chain staking program before mainnet.
 * v1 uses an escrow-tracked commitment: client transfers $HOOD (ERC-20) to
 * ESCROW_WALLET on Robinhood Chain, then POSTs the tx hash for multipliers.
 */

export const ESCROW_WALLET =
  process.env.NEXT_PUBLIC_STAKE_ESCROW_WALLET ??
  process.env.STAKE_ESCROW_WALLET ??
  "";

export function stakingSpMultiplier(lockDays: number): number {
  if (lockDays >= 30) return 1.25;
  if (lockDays >= 7) return 1.1;
  return 1;
}

export function bestActiveStakeMultiplier(
  stakes: { lockDays: number; unlockAt: Date }[],
  now: Date = new Date(),
): number {
  let best = 1;
  for (const s of stakes) {
    if (s.unlockAt.getTime() > now.getTime()) {
      best = Math.max(best, stakingSpMultiplier(s.lockDays));
    }
  }
  return best;
}

export function computeUnlockAt(lockedAt: Date, lockDays: number): Date {
  return new Date(lockedAt.getTime() + lockDays * 24 * 60 * 60 * 1000);
}

export function stakeBonusForLockDays(lockDays: number): number {
  return stakingSpMultiplier(lockDays) - 1;
}
