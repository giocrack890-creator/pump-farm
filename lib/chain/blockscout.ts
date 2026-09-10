import { ACTIVE_CHAIN } from "@/lib/chain/robinhood";

/**
 * Blockscout REST helpers for Robinhood Chain explorers.
 * Prefer these over any leftover Solana indexer calls.
 */

function explorerApiBase(): string {
  const url = ACTIVE_CHAIN.blockExplorers?.default.url ?? "";
  // Blockscout typically serves API under /api
  return `${url.replace(/\/$/, "")}/api`;
}

export async function fetchNativeBalanceWei(address: string): Promise<string | null> {
  try {
    const qs = new URLSearchParams({
      module: "account",
      action: "balance",
      address,
    });
    const res = await fetch(`${explorerApiBase()}?${qs}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string };
    return data.result ?? null;
  } catch {
    return null;
  }
}

export async function fetchAddressTxs(address: string, page = 1, offset = 10) {
  try {
    const qs = new URLSearchParams({
      module: "account",
      action: "txlist",
      address,
      page: String(page),
      offset: String(offset),
      sort: "desc",
    });
    const res = await fetch(`${explorerApiBase()}?${qs}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { result?: unknown };
    return Array.isArray(data.result) ? data.result : [];
  } catch {
    return [];
  }
}
