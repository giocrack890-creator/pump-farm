/**
 * Named game / payout constants for Hood Harvest.
 * Money-adjacent splits live here so nothing is hardcoded inline.
 */

export const PAYOUT_TIER_1_PCT = 0.01
export const PAYOUT_TIER_1_SHARE = 0.5
export const PAYOUT_TIER_2_PCT = 0.09
export const PAYOUT_TIER_2_SHARE = 0.3
export const PAYOUT_TIER_3_SHARE = 0.2

/** Ops/dev reserve taken from the Silo pool before payout tiers. Override via OPS_RESERVE_PCT. */
export const OPS_RESERVE_PCT = (() => {
  const raw = process.env.OPS_RESERVE_PCT
  if (raw === undefined || raw === "") return 0.05
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 1) {
    throw new Error(`Invalid OPS_RESERVE_PCT: ${raw}`)
  }
  return parsed
})()

export type SeedTierId = "Basic" | "Hybrid" | "Golden" | "Mythic"

export type SeedTierConfig = {
  id: SeedTierId
  name: SeedTierId
  /** Real-time growth duration in hours. */
  growHours: number
  /** Base Season Points awarded on a clean harvest. */
  baseYield: number
  /** Alias used by farm API routes. */
  baseYieldSp: number
  /** Hype cost to plant. */
  hypeCost: number
}

function tier(
  id: SeedTierId,
  growHours: number,
  baseYield: number,
  hypeCost: number,
): SeedTierConfig {
  return { id, name: id, growHours, baseYield, baseYieldSp: baseYield, hypeCost }
}

export const SEED_TIERS: Record<SeedTierId, SeedTierConfig> = {
  Basic: tier("Basic", 4, 10, 5),
  Hybrid: tier("Hybrid", 8, 25, 15),
  Golden: tier("Golden", 12, 60, 40),
  Mythic: tier("Mythic", 18, 140, 90),
}

/** Hours after maturity before Rug Blight activates. */
export const BLIGHT_HOURS_AFTER_MATURITY = 6

/** Maximum Season Point loss when harvesting a blighted crop (never to zero). */
export const BLIGHT_MAX_LOSS = 0.4

export const DAILY_HYPE_ALLOWANCE = 50

/** One-time Hype burst when a referred wallet plants their first seed. */
export const REFERRAL_HYPE_BURST = 30

/** Permanent SP multiplier granted to the referrer (product spec §5.2). */
export const REFERRAL_SP_MULTIPLIER = 0.05

/** Cap on streak SP bonus (+20% after 7 consecutive harvest days). */
export const STREAK_MAX_BONUS = 0.2

/** Days of consecutive harvests required to reach STREAK_MAX_BONUS. */
export const STREAK_DAYS_TO_CAP = 7
/** @deprecated Prefer STREAK_DAYS_TO_CAP */
export const STREAK_MAX_DAYS = STREAK_DAYS_TO_CAP

export const GOLDEN_HARVEST_MULTIPLIER = 3
export const GOLDEN_HARVEST_WINDOW_MS = 10 * 60 * 1000
export const GOLDEN_HARVEST_PRICE_THRESHOLD = Number(
  process.env.GOLDEN_HARVEST_PRICE_THRESHOLD ?? "0.15",
)

export const STARTER_PLOTS = 9
export const SEASON_DURATION_DAYS = 7

/** Holding-bonus soft-cap: min(sqrt(balance) * k, cap). */
export const HOLDING_BONUS_K = 2
export const HOLDING_BONUS_CAP = 100
/** Aliases used by farm helpers. */
export const HOLDING_HYPE_K = HOLDING_BONUS_K
export const HOLDING_HYPE_CAP = HOLDING_BONUS_CAP

export const STAKE_LOCK_TIERS = [
  { lockDays: 7, spBonus: 0.1 },
  { lockDays: 30, spBonus: 0.25 },
] as const

/**
 * Payouts below this many wei are skipped: a transfer that costs more gas than
 * it delivers is worse than not sending it, and the row stays pending for an
 * operator to fold in or void.
 */
export const MIN_PAYOUT_WEI = (() => {
  const raw = process.env.MIN_PAYOUT_WEI?.trim()
  const n = raw ? Number(raw) : 0
  return Number.isFinite(n) && n >= 0 ? n : 0
})()

/**
 * Weather thresholds as price-change fractions (0.15 = +15%).
 * Rainbow aligns with the Golden Harvest pump trigger.
 */
export const WEATHER_RAINBOW_FRACTION = 0.15
export const WEATHER_STORM_FRACTION = -0.05

/** Decimal places used when splitting token amounts (ERC-20 default = 18). */
export const PAYOUT_AMOUNT_DECIMALS = 18

/**
 * Seed value only. The live ticker, like the token address and the treasury,
 * is a database row read through `lib/config/appConfig.ts` — a build-time
 * constant cannot be changed without a redeploy, which is the whole reason the
 * runtime config exists.
 */
export const TOKEN_TICKER = process.env.NEXT_PUBLIC_TOKEN_TICKER ?? "HOOD"

/** Fallback Silo fill target (ETH) for the % full bar; overridden in /admin. */
export const SILO_TARGET_ETH = (() => {
  const raw =
    process.env.SILO_TARGET_ETH ?? process.env.NEXT_PUBLIC_SILO_TARGET_ETH
  const n = Number(raw ?? "100")
  return Number.isFinite(n) && n > 0 ? n : 100
})()

/**
 * There is no fixed ETH→USD constant any more.
 *
 * A hardcoded 2460 was multiplying every pot and tier figure on the site, so
 * every dollar amount a player saw was wrong by however far the rate had moved
 * since the number was typed. The live rate comes from `lib/market/ethUsd.ts`,
 * and a pot with no rate available shows no dollar figure at all.
 */

/**
 * Whether the token is live is now answered by the runtime config — a
 * configured address means live. See `useAppConfig()` on the client and
 * `getAppConfig()` on the server; both reject the zero address as unset.
 *
 * Being on Robinhood Chain still ≠ listed inside the Robinhood brokerage app.
 */
