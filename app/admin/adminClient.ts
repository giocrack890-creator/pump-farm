"use client";

/**
 * The ops panel's credential, kept in localStorage and sent as a bearer token.
 *
 * Two things are accepted: the shared ADMIN_TOKEN, or the ordinary session JWT
 * of a wallet in ADMIN_WALLETS — so an operator can paste the ops secret, or
 * just be signed in with an allowlisted wallet. Never put it in the URL; a
 * token in a query string ends up in logs and in browser history.
 *
 * Exposed as an external store rather than component state so the panel reads
 * it with `useSyncExternalStore` — no effect setting state on mount, and a sign
 * out in another tab is picked up for free.
 */

const STORAGE_KEY = "pumpfarm.admin.token";
/** Where the site keeps the ordinary wallet session, in order of preference. */
const SESSION_KEYS = ["pumpfarm.token", "farm_token", "token"];

const listeners = new Set<() => void>();
let snapshot: string | null = null;

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function computeSnapshot(): string {
  if (typeof window === "undefined") return "";
  const stored = read(STORAGE_KEY);
  if (stored) return stored;
  for (const key of SESSION_KEYS) {
    const value = read(key);
    if (value && value.split(".").length === 3) return value;
  }
  return "";
}

function notify(): void {
  snapshot = null;
  for (const listener of listeners) listener();
}

export function writeAdminToken(token: string): void {
  try {
    if (token) window.localStorage.setItem(STORAGE_KEY, token);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private window — the session just will not persist */
  }
  notify();
}

export function subscribeAdminToken(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) window.removeEventListener("storage", notify);
  };
}

/** Cached so repeated renders get a referentially stable value. */
export function adminTokenSnapshot(): string {
  snapshot ??= computeSnapshot();
  return snapshot;
}

/** The server renders the signed-out shell; the browser fills it in. */
export function adminTokenServerSnapshot(): string {
  return "";
}

export class AdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminTokenSnapshot()}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new AdminError(
      typeof body.error === "string" ? body.error : `${res.status} ${path}`,
      res.status,
    );
  }
  return body as T;
}
