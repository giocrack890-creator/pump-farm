import { isAddress } from "viem";
import { prisma } from "@/lib/prisma";
import { isDemoDbMode } from "@/lib/demo/farmMemory";

/**
 * Runtime configuration, read from the database with the environment behind it.
 *
 * The token address is the reason this exists. It used to be
 * `NEXT_PUBLIC_TOKEN_MINT`, which Next inlines into the bundle at build time —
 * so repointing the game at the real $FARM launch meant a redeploy, and the
 * server and the browser could disagree in between. Here it is one row an
 * operator edits from /admin, and both sides read the same answer.
 *
 * Env still works as the seed value, so nothing breaks before anyone opens the
 * panel. A value set in the panel wins over env, because someone typed it more
 * recently than the deploy happened.
 */

export const CONFIG_KEYS = [
  "tokenAddress",
  "tokenTicker",
  "creatorAddress",
  "treasuryAddress",
  "stakeEscrowAddress",
  "siloTargetEth",
  "opsReservePct",
  "payoutsEnabled",
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

export type AppConfigValues = {
  /** The Pons launch whose fees are the pot. Null until it is set. */
  tokenAddress: string | null;
  tokenTicker: string;
  /** Overrides the creator Pons credits — normally read from the launch. */
  creatorAddress: string | null;
  /** Wallet the claimed fees land in, and payouts are sent from. */
  treasuryAddress: string | null;
  stakeEscrowAddress: string | null;
  siloTargetEth: number;
  opsReservePct: number;
  /** Off by default: nothing is ever paid until an operator turns it on. */
  payoutsEnabled: boolean;
};

const ENV_DEFAULTS: Record<ConfigKey, () => string | null> = {
  tokenAddress: () => sanitizeAddress(process.env.NEXT_PUBLIC_TOKEN_MINT),
  tokenTicker: () => process.env.NEXT_PUBLIC_TOKEN_TICKER?.trim() || "FARM",
  creatorAddress: () => sanitizeAddress(process.env.PONS_CREATOR_ADDRESS),
  treasuryAddress: () =>
    sanitizeAddress(
      process.env.TREASURY_WALLET_ADDRESS ??
        process.env.NEXT_PUBLIC_TREASURY_WALLET_ADDRESS,
    ),
  stakeEscrowAddress: () =>
    sanitizeAddress(
      process.env.STAKE_ESCROW_WALLET ??
        process.env.NEXT_PUBLIC_STAKE_ESCROW_WALLET,
    ),
  siloTargetEth: () =>
    process.env.SILO_TARGET_ETH?.trim() ??
    process.env.NEXT_PUBLIC_SILO_TARGET_ETH?.trim() ??
    null,
  opsReservePct: () => process.env.OPS_RESERVE_PCT?.trim() ?? null,
  payoutsEnabled: () => process.env.PAYOUTS_ENABLED?.trim() ?? null,
};

/** A placeholder is not a configuration — treat it as unset. */
function sanitizeAddress(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value || !isAddress(value)) return null;
  if (/^0x0+$/i.test(value)) return null;
  return value.toLowerCase();
}

/**
 * A numeric setting with its default.
 *
 * Exported so it can be tested directly: `Number(null)` is 0 rather than NaN,
 * and the first version of this let an unset ops reserve read as 0% — which
 * would have sent the entire pot out with nothing held back.
 */
export function resolveNumericSetting(
  raw: string | null,
  fallback: number,
  max = Infinity,
): number {
  if (raw === null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n < max ? n : fallback;
}

const CACHE_TTL_MS = 15_000;
let cache: { values: AppConfigValues; at: number } | null = null;

function buildValues(rows: Map<string, string>): AppConfigValues {
  const get = (key: ConfigKey): string | null => {
    const fromDb = rows.get(key)?.trim();
    if (fromDb) return fromDb;
    return ENV_DEFAULTS[key]();
  };

  const numeric = (key: ConfigKey, fallback: number, max = Infinity) =>
    resolveNumericSetting(get(key), fallback, max);

  return {
    tokenAddress: sanitizeAddress(get("tokenAddress")),
    tokenTicker: get("tokenTicker") || "FARM",
    creatorAddress: sanitizeAddress(get("creatorAddress")),
    treasuryAddress: sanitizeAddress(get("treasuryAddress")),
    stakeEscrowAddress: sanitizeAddress(get("stakeEscrowAddress")),
    siloTargetEth: numeric("siloTargetEth", 100) || 100,
    opsReservePct: numeric("opsReservePct", 0.05, 1),
    payoutsEnabled: get("payoutsEnabled") === "true",
  };
}

export async function getAppConfig(
  { fresh = false }: { fresh?: boolean } = {},
): Promise<AppConfigValues> {
  if (!fresh && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.values;

  let rows = new Map<string, string>();
  if (!isDemoDbMode()) {
    try {
      const found = await prisma.appConfig.findMany();
      rows = new Map(found.map((r) => [r.key, r.value]));
    } catch {
      // No database yet — env-only is a valid configuration, not a failure.
    }
  }

  const values = buildValues(rows);
  cache = { values, at: Date.now() };
  return values;
}

/** Drop the cache so the next read reflects a write immediately. */
export function invalidateAppConfig(): void {
  cache = null;
}

export type ConfigWrite = { key: ConfigKey; value: string };

/** Reject a value the game would then have to guess about. */
export function validateConfig({ key, value }: ConfigWrite): string | null {
  const trimmed = value.trim();

  switch (key) {
    case "tokenAddress":
    case "creatorAddress":
    case "treasuryAddress":
    case "stakeEscrowAddress":
      if (trimmed === "") return null; // clearing is allowed
      if (!isAddress(trimmed)) return `${key} must be a 0x address`;
      if (/^0x0+$/i.test(trimmed)) return `${key} cannot be the zero address`;
      return null;
    case "tokenTicker":
      return /^[A-Za-z0-9$._-]{1,16}$/.test(trimmed)
        ? null
        : "ticker must be 1-16 characters";
    case "siloTargetEth": {
      const n = Number(trimmed);
      return Number.isFinite(n) && n > 0 ? null : "siloTargetEth must be > 0";
    }
    case "opsReservePct": {
      const n = Number(trimmed);
      return Number.isFinite(n) && n >= 0 && n < 1
        ? null
        : "opsReservePct must be in [0, 1)";
    }
    case "payoutsEnabled":
      return trimmed === "true" || trimmed === "false"
        ? null
        : "payoutsEnabled must be true or false";
    default:
      return `unknown key: ${key}`;
  }
}

export async function setConfig(
  writes: ConfigWrite[],
  actor: string,
): Promise<AppConfigValues> {
  for (const write of writes) {
    if (!CONFIG_KEYS.includes(write.key)) {
      throw new Error(`unknown config key: ${write.key}`);
    }
    const problem = validateConfig(write);
    if (problem) throw new Error(problem);
  }

  await prisma.$transaction(
    writes.map((w) =>
      prisma.appConfig.upsert({
        where: { key: w.key },
        create: { key: w.key, value: w.value.trim(), updatedBy: actor },
        update: { value: w.value.trim(), updatedBy: actor },
      }),
    ),
  );

  invalidateAppConfig();
  return getAppConfig({ fresh: true });
}
