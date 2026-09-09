/**
 * Named game / payout constants for Pump Farm.
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

export const MIN_PAYOUT_FARM_BALANCE = Number(
  process.env.MIN_PAYOUT_FARM_BALANCE ?? "0",
)

/**
 * Weather thresholds as price-change fractions (0.15 = +15%).
 * Rainbow aligns with the Golden Harvest pump trigger.
 */
export const WEATHER_RAINBOW_FRACTION = 0.15
export const WEATHER_STORM_FRACTION = -0.05

/** Decimal places used when splitting token amounts. */
export const PAYOUT_AMOUNT_DECIMALS = 9

export const TOKEN_TICKER = process.env.NEXT_PUBLIC_TOKEN_TICKER ?? "FARM"
export const TOKEN_MINT =
  process.env.NEXT_PUBLIC_TOKEN_MINT ??
  "So11111111111111111111111111111111111111112"
export const TREASURY_WALLET =
  process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS ??
  process.env.TREASURY_WALLET_ADDRESS ??
  ""
