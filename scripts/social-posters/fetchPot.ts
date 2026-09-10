/**
 * Resolve live Season Pot USD/ETH for poster copy.
 * Never invents a headline number — uses public stats / season APIs when reachable.
 * If unavailable, returns null amounts with mock: true so callers can skip or label honestly.
 */
import { ETH_USD_DISPLAY } from "../../lib/game/config";

export type PotSnapshot = {
  siloUsd: number | null;
  eth: number | null;
  percentFull: number | null;
  mock: boolean;
  source: string;
};

function unavailable(source: string): PotSnapshot {
  return {
    siloUsd: null,
    eth: null,
    percentFull: null,
    mock: true,
    source,
  };
}

async function tryJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function fetchPotSnapshot(baseUrl?: string): Promise<PotSnapshot> {
  const base =
    baseUrl?.replace(/\/$/, "") ||
    process.env.POSTER_API_BASE?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const stats = await tryJson(`${base}/api/stats/public`);
  if (
    stats &&
    typeof stats.siloUsd === "number" &&
    Number.isFinite(stats.siloUsd) &&
    stats.siloUsd > 0 &&
    !stats.mock
  ) {
    const siloUsd = Math.round(stats.siloUsd);
    return {
      siloUsd,
      eth: siloUsd / ETH_USD_DISPLAY,
      percentFull: null,
      mock: false,
      source: `${base}/api/stats/public`,
    };
  }

  const season = await tryJson(`${base}/api/season/current`);
  if (
    season &&
    season.live === true &&
    typeof season.siloBalance === "number" &&
    Number.isFinite(season.siloBalance) &&
    season.siloBalance > 0
  ) {
    const eth = season.siloBalance as number;
    const siloUsd = Math.round(eth * ETH_USD_DISPLAY);
    return {
      siloUsd,
      eth,
      percentFull: typeof season.percentFull === "number" ? season.percentFull : null,
      mock: false,
      source: `${base}/api/season/current`,
    };
  }

  // Direct treasury module (no HTTP) when running inside the repo with env wired.
  try {
    const { fetchTreasurySnapshot } = await import("../../lib/evm/treasury");
    const snap = await fetchTreasurySnapshot();
    const eth = snap.balanceEth;
    if (eth != null && Number.isFinite(eth) && eth > 0) {
      return {
        siloUsd: Math.round(eth * ETH_USD_DISPLAY),
        eth,
        percentFull: null,
        mock: false,
        source: "lib/evm/treasury",
      };
    }
  } catch {
    /* ignore */
  }

  return unavailable("unavailable (no live treasury)");
}

export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatEth(n: number): string {
  return `${n.toFixed(2)} ETH`;
}
