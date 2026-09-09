import {
  DAILY_HYPE_ALLOWANCE,
  HOLDING_BONUS_CAP,
  HOLDING_BONUS_K,
  REFERRAL_HYPE_BURST,
  STAKE_LOCK_TIERS,
  STREAK_DAYS_TO_CAP,
  STREAK_MAX_BONUS,
} from "@/lib/game/config"

/**
 * Soft-capped Hype-rate bonus from $FARM balance:
 * `min(sqrt(balance) * k, cap)`.
 */
export function holdingBonus(
  balance: number,
  k: number = HOLDING_BONUS_K,
  cap: number = HOLDING_BONUS_CAP,
): number {
  if (!Number.isFinite(balance) || balance < 0) {
    throw new Error("balance must be a finite non-negative number")
  }
  if (balance === 0) return 0
  if (!Number.isFinite(k) || k < 0 || !Number.isFinite(cap) || cap < 0) {
    throw new Error("k and cap must be finite non-negative numbers")
  }
  return Math.min(Math.sqrt(balance) * k, cap)
}

/** Passive daily Hype grant for casual engagement. */
export function dailyAllowance(): number {
  return DAILY_HYPE_ALLOWANCE
}

/** One-time Hype burst for a successful referral (friend plants first seed). */
export const referralBurst = REFERRAL_HYPE_BURST

/**
 * Streak SP multiplier. Escalates linearly to +STREAK_MAX_BONUS (+20%)
 * after STREAK_DAYS_TO_CAP (7) consecutive harvest days; missing a day resets.
 */
export function streakMultiplier(consecutiveDays: number): number {
  if (!Number.isFinite(consecutiveDays) || consecutiveDays < 0) {
    throw new Error("consecutiveDays must be a finite non-negative number")
  }
  const days = Math.floor(consecutiveDays)
  const progress = Math.min(days, STREAK_DAYS_TO_CAP) / STREAK_DAYS_TO_CAP
  return 1 + progress * STREAK_MAX_BONUS
}

/** SP multiplier from an active stake lock (7d → +10%, 30d → +25%). */
export function stakeMultiplier(lockDays: number): number {
  if (!Number.isFinite(lockDays) || lockDays <= 0) return 1
  let best = 1
  for (const tier of STAKE_LOCK_TIERS) {
    if (lockDays >= tier.lockDays) {
      best = Math.max(best, 1 + tier.spBonus)
    }
  }
  return best
}

/** UTC YYYY-MM-DD for streak day comparisons. */
export function utcDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Advance or reset harvest streak given the last harvest day key.
 * Same-day harvests do not increment; missing a calendar day resets to 1.
 */
export function nextStreak(
  lastHarvestDay: string | null | undefined,
  today: string = utcDayKey(),
  currentStreak: number,
): number {
  if (!lastHarvestDay) return 1
  if (lastHarvestDay === today) return currentStreak
  const yesterday = new Date(`${today}T00:00:00.000Z`)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const yKey = yesterday.toISOString().slice(0, 10)
  if (lastHarvestDay === yKey) return currentStreak + 1
  return 1
}
