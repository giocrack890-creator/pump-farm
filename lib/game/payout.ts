import Decimal from "decimal.js"
import {
  OPS_RESERVE_PCT,
  PAYOUT_AMOUNT_DECIMALS,
  PAYOUT_TIER_1_PCT,
  PAYOUT_TIER_1_SHARE,
  PAYOUT_TIER_2_PCT,
  PAYOUT_TIER_2_SHARE,
  PAYOUT_TIER_3_SHARE,
} from "@/lib/game/config"

Decimal.set({ precision: 40, rounding: Decimal.ROUND_DOWN })

export type PayoutWalletInput = {
  address: string
  points: Decimal.Value
  flaggedSybil?: boolean
}

/** @deprecated Prefer PayoutWalletInput */
export type PayoutWallet = PayoutWalletInput

export type PayoutWalletResult = {
  address: string
  amount: Decimal
  points: Decimal
  /** Share of that tier's pool (0–1), not of the full Silo. */
  share: Decimal
  tier: 1 | 2 | 3
}

export type PayoutTierResult = {
  tier: 1 | 2 | 3
  poolShare: Decimal
  poolAmount: Decimal
  wallets: PayoutWalletResult[]
}

export type ComputePayoutsInput = {
  wallets: PayoutWalletInput[]
  poolAmount: Decimal.Value
  opsReservePct?: number
  /** When true (default), result is review-safe and never implies on-chain sends. */
  dryRun?: boolean
}

export type ComputePayoutsResult = {
  totalPool: Decimal
  /** Ops reserve plus any tier pool with zero eligible wallets. */
  reserve: Decimal
  /** Pool after opsReservePct (before empty-tier fold-back). */
  distributable: Decimal
  activeCount: number
  tiers: PayoutTierResult[]
  /** Flat list of all wallet payouts (one entry per wallet, one tier only). */
  payouts: PayoutWalletResult[]
  dryRun: boolean
}

type RankedWallet = {
  address: string
  points: Decimal
}

function toDecimal(value: Decimal.Value): Decimal {
  try {
    const d = value instanceof Decimal ? value : new Decimal(value)
    if (!d.isFinite()) {
      throw new Error("not finite")
    }
    return d
  } catch {
    throw new Error(`Invalid decimal value: ${String(value)}`)
  }
}

/**
 * Idempotency key for a single season payout transfer.
 * Format: `seasonId:walletId`
 */
export function payoutIdempotencyKey(
  seasonId: string,
  walletId: string,
): string {
  if (!seasonId || !walletId) {
    throw new Error("seasonId and walletId are required")
  }
  return `${seasonId}:${walletId}`
}

function comparePointsDesc(a: RankedWallet, b: RankedWallet): number {
  const cmp = b.points.cmp(a.points)
  if (cmp !== 0) return cmp
  return a.address.localeCompare(b.address)
}

/**
 * Expand a cutoff index so wallets tied on SP stay in the higher-ranked tier.
 * A wallet is never placed in more than one tier.
 */
function expandCutoffForTies(
  ranked: RankedWallet[],
  cutoff: number,
): number {
  if (cutoff <= 0 || cutoff >= ranked.length) return cutoff
  const boundaryPoints = ranked[cutoff - 1]!.points
  let end = cutoff
  while (end < ranked.length && ranked[end]!.points.equals(boundaryPoints)) {
    end += 1
  }
  return end
}

function allocateProRata(
  wallets: RankedWallet[],
  tierPool: Decimal,
  tier: 1 | 2 | 3,
): PayoutWalletResult[] {
  if (wallets.length === 0 || tierPool.isZero()) {
    return wallets.map((w) => ({
      address: w.address,
      amount: new Decimal(0),
      points: w.points,
      share: new Decimal(0),
      tier,
    }))
  }

  const totalPoints = wallets.reduce(
    (sum, w) => sum.plus(w.points),
    new Decimal(0),
  )

  if (totalPoints.isZero()) {
    return wallets.map((w) => ({
      address: w.address,
      amount: new Decimal(0),
      points: w.points,
      share: new Decimal(0),
      tier,
    }))
  }

  const results: PayoutWalletResult[] = []
  let allocated = new Decimal(0)

  for (let i = 0; i < wallets.length; i += 1) {
    const w = wallets[i]!
    const share = w.points.div(totalPoints)
    const isLast = i === wallets.length - 1
    // Last wallet absorbs dust so the tier sum equals the tier pool exactly.
    const amount = isLast
      ? tierPool.minus(allocated)
      : tierPool
          .mul(share)
          .toDecimalPlaces(PAYOUT_AMOUNT_DECIMALS, Decimal.ROUND_DOWN)

    allocated = allocated.plus(amount)
    results.push({
      address: w.address,
      amount,
      points: w.points,
      share,
      tier,
    })
  }

  return results
}

/**
 * Season-close payout split.
 *
 * - Filters active wallets (points > 0, not sybil-flagged), ranks by SP desc.
 * - Reserve = pool * opsReservePct; remainder split across tiers:
 *   top 1% → 50%, next 9% → 30%, rest → 20% (pro-rata by SP within each tier).
 * - Empty tier pools fold back into reserve so reserve + paid == pool.
 * - All amounts use Decimal.js — never native floats for token values.
 */
export function computePayouts({
  wallets,
  poolAmount,
  opsReservePct = OPS_RESERVE_PCT,
  dryRun = true,
}: ComputePayoutsInput): ComputePayoutsResult {
  if (
    !Number.isFinite(opsReservePct) ||
    opsReservePct < 0 ||
    opsReservePct >= 1
  ) {
    throw new Error("opsReservePct must be in [0, 1)")
  }

  const pool = toDecimal(poolAmount)
  if (pool.isNeg()) {
    throw new Error("poolAmount cannot be negative")
  }

  const reserve = pool
    .mul(opsReservePct)
    .toDecimalPlaces(PAYOUT_AMOUNT_DECIMALS, Decimal.ROUND_DOWN)
  const distributable = pool.minus(reserve)

  const active: RankedWallet[] = wallets
    .filter((w) => !w.flaggedSybil)
    .map((w) => {
      const points = toDecimal(w.points)
      if (points.isNeg()) {
        throw new Error("points must be non-negative")
      }
      return { address: w.address, points }
    })
    .filter((w) => w.points.gt(0))
    .sort(comparePointsDesc)

  const emptyTiers: PayoutTierResult[] = [
    {
      tier: 1,
      poolShare: new Decimal(PAYOUT_TIER_1_SHARE),
      poolAmount: new Decimal(0),
      wallets: [],
    },
    {
      tier: 2,
      poolShare: new Decimal(PAYOUT_TIER_2_SHARE),
      poolAmount: new Decimal(0),
      wallets: [],
    },
    {
      tier: 3,
      poolShare: new Decimal(PAYOUT_TIER_3_SHARE),
      poolAmount: new Decimal(0),
      wallets: [],
    },
  ]

  if (active.length === 0 || distributable.lte(0)) {
    // No eligible wallets: entire distributable folds into reserve.
    return {
      totalPool: pool,
      reserve: reserve.plus(distributable),
      distributable,
      activeCount: 0,
      tiers: emptyTiers,
      payouts: [],
      dryRun,
    }
  }

  const n = active.length
  let tier1End = Math.max(1, Math.ceil(n * PAYOUT_TIER_1_PCT))
  tier1End = Math.min(tier1End, n)
  tier1End = expandCutoffForTies(active, tier1End)

  const tier2Target = Math.ceil(n * PAYOUT_TIER_2_PCT)
  let tier2End = Math.min(tier1End + tier2Target, n)
  if (tier2End > tier1End) {
    tier2End = expandCutoffForTies(active, tier2End)
  }

  const tier1Wallets = active.slice(0, tier1End)
  const tier2Wallets = active.slice(tier1End, tier2End)
  const tier3Wallets = active.slice(tier2End)

  const tier1Pool = distributable.mul(PAYOUT_TIER_1_SHARE)
  const tier2Pool = distributable.mul(PAYOUT_TIER_2_SHARE)
  const tier3Pool = distributable.minus(tier1Pool).minus(tier2Pool)

  const slices: {
    tier: 1 | 2 | 3
    poolShare: Decimal
    wallets: RankedWallet[]
    pool: Decimal
  }[] = [
    {
      tier: 1,
      poolShare: new Decimal(PAYOUT_TIER_1_SHARE),
      wallets: tier1Wallets,
      pool: tier1Pool,
    },
    {
      tier: 2,
      poolShare: new Decimal(PAYOUT_TIER_2_SHARE),
      wallets: tier2Wallets,
      pool: tier2Pool,
    },
    {
      tier: 3,
      poolShare: new Decimal(PAYOUT_TIER_3_SHARE),
      wallets: tier3Wallets,
      pool: tier3Pool,
    },
  ]

  let finalReserve = reserve
  const tiers: PayoutTierResult[] = []
  const payouts: PayoutWalletResult[] = []

  for (const slice of slices) {
    if (slice.wallets.length === 0) {
      finalReserve = finalReserve.plus(slice.pool)
      tiers.push({
        tier: slice.tier,
        poolShare: slice.poolShare,
        poolAmount: new Decimal(0),
        wallets: [],
      })
      continue
    }

    const allocated = allocateProRata(slice.wallets, slice.pool, slice.tier)
    tiers.push({
      tier: slice.tier,
      poolShare: slice.poolShare,
      poolAmount: slice.pool,
      wallets: allocated,
    })
    payouts.push(...allocated)
  }

  return {
    totalPool: pool,
    reserve: finalReserve,
    distributable,
    activeCount: n,
    tiers,
    payouts,
    dryRun,
  }
}
