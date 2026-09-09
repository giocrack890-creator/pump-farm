import {
  BLIGHT_HOURS_AFTER_MATURITY,
  BLIGHT_MAX_LOSS,
  SEED_TIERS,
  type SeedTierConfig,
  type SeedTierId,
} from "@/lib/game/config"

const MS_PER_HOUR = 60 * 60 * 1000

export type PlotStatus = "empty" | "growing" | "ready" | "blighted"

/**
 * Plot snapshot used for status / progress. Timestamps must come from the DB
 * (server clock) — never trust client-submitted eligibility numbers.
 */
export type PlotState = {
  seedTier?: string | null
  plantedAt: Date | string | null
  maturesAt: Date | string | null
  status?: string | null
}

/** @deprecated Prefer PlotState */
export type PlotLike = PlotState

export type HarvestPointsInput = {
  baseYield: number
  stakeMult?: number
  streakMult?: number
  goldenMult?: number
  blighted?: boolean
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new Error("invalid Date value")
  }
  return d
}

/** All seed tiers in display order (Basic → Hybrid → Golden). */
export function getSeedTiers(): readonly SeedTierConfig[] {
  return [SEED_TIERS.Basic, SEED_TIERS.Hybrid, SEED_TIERS.Golden]
}

/** Lookup a single tier by id (case-insensitive). */
export function getSeedTier(id: string): SeedTierConfig | null {
  if (id in SEED_TIERS) return SEED_TIERS[id as SeedTierId]
  const normalized =
    id.charAt(0).toUpperCase() + id.slice(1).toLowerCase()
  if (normalized in SEED_TIERS) return SEED_TIERS[normalized as SeedTierId]
  return null
}

function resolveTier(
  tier: SeedTierId | SeedTierConfig,
): SeedTierConfig {
  if (typeof tier === "string") {
    const found = getSeedTier(tier)
    if (!found) throw new Error(`Unknown seed tier: ${tier}`)
    return found
  }
  return tier
}

/** Server-side maturity timestamp from planting time + tier grow hours. */
export function computeMaturesAt(
  plantedAt: Date,
  tier: SeedTierId | SeedTierConfig,
): Date {
  if (!(plantedAt instanceof Date) || Number.isNaN(plantedAt.getTime())) {
    throw new Error("plantedAt must be a valid Date")
  }
  const resolved = resolveTier(tier)
  return new Date(plantedAt.getTime() + resolved.growHours * MS_PER_HOUR)
}

function blightStartsAt(maturesAt: Date): Date {
  return new Date(
    maturesAt.getTime() + BLIGHT_HOURS_AFTER_MATURITY * MS_PER_HOUR,
  )
}

/**
 * Derive plot lifecycle status from stored timestamps and a server `now`.
 * Eligibility is never inferred from client progress fractions or status fields.
 */
export function getPlotStatus(
  plot: PlotState,
  now: Date = new Date(),
): PlotStatus {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("now must be a valid Date")
  }

  const plantedAt = asDate(plot.plantedAt)
  const maturesAt = asDate(plot.maturesAt)

  if (!plot.seedTier || !plantedAt || !maturesAt) {
    return "empty"
  }

  const t = now.getTime()
  const matures = maturesAt.getTime()

  if (t < matures) return "growing"
  if (t < blightStartsAt(maturesAt).getTime()) return "ready"
  return "blighted"
}

/** Linear growth progress in [0, 1], based only on Date timestamps. */
export function computeGrowthProgress(
  plantedAt: Date | string,
  maturesAt: Date | string,
  now: Date = new Date(),
): number {
  const start = asDate(plantedAt)
  const end = asDate(maturesAt)
  if (!start || !end) {
    throw new Error("plantedAt and maturesAt must be valid Dates")
  }
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("now must be a valid Date")
  }

  const duration = end.getTime() - start.getTime()
  if (duration <= 0) {
    return now.getTime() >= end.getTime() ? 1 : 0
  }

  const raw = (now.getTime() - start.getTime()) / duration
  if (raw <= 0) return 0
  if (raw >= 1) return 1
  return raw
}

/**
 * Multiplicative harvest SP. Blighted crops lose up to BLIGHT_MAX_LOSS (never zero).
 * Callers must set `blighted` from getPlotStatus(..., serverNow) === "blighted".
 */
export function computeHarvestPoints({
  baseYield,
  stakeMult = 1,
  streakMult = 1,
  goldenMult = 1,
  blighted = false,
}: HarvestPointsInput): number {
  if (
    ![baseYield, stakeMult, streakMult, goldenMult].every(
      (n) => Number.isFinite(n) && n >= 0,
    )
  ) {
    throw new Error("harvest multipliers must be finite non-negative numbers")
  }

  const blightMult = blighted ? 1 - BLIGHT_MAX_LOSS : 1
  const points = baseYield * stakeMult * streakMult * goldenMult * blightMult
  // Stable micro-precision for SP storage without float noise.
  return Math.round(points * 1e6) / 1e6
}

export function isHarvestable(
  plot: PlotState,
  now: Date = new Date(),
): boolean {
  const status = getPlotStatus(plot, now)
  return status === "ready" || status === "blighted"
}
