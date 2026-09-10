import { getAddress, type Address } from "viem";

/** Canonical production host — used when Origin is missing or not allowed. */
export const SIWX_DOMAIN = "www.pumpfarm.net";
export const SIWX_URI = "https://www.pumpfarm.net";
export const SIWX_STATEMENT =
  "Sign in to Pump Farm with your Robinhood Chain wallet.";

/** Explicit production hosts (custom domain + legacy Vercel alias). */
const SIWX_PRODUCTION_HOSTS = new Set([
  "www.pumpfarm.net",
  "pumpfarm.net",
  "pump-farm.vercel.app",
]);

/** EIP-55 checksum for SIWE messages — Phantom / WalletKit reject lowercase. */
export function checksumEvmAddress(value: string): Address {
  return getAddress(value.trim());
}

/** EIP-4361 expects a numeric chain id (e.g. 4663), not CAIP `eip155:4663`. */
export function siwxNumericChainId(chainId: string | number): string {
  const raw = String(chainId).trim();
  if (raw.includes(":")) {
    const n = raw.split(":")[1];
    return n && /^\d+$/.test(n) ? n : raw;
  }
  return raw;
}

/**
 * Hosts allowed in SIWE `domain` / `uri`.
 * Wallets (Phantom, MetaMask) reject messages whose domain ≠ request origin.
 */
export function isAllowedSiwxHost(host: string): boolean {
  const h = host.trim().toLowerCase();
  if (!h) return false;
  if (SIWX_PRODUCTION_HOSTS.has(h)) return true;
  if (h === "localhost" || h.startsWith("localhost:")) return true;
  if (h === "127.0.0.1" || h.startsWith("127.0.0.1:")) return true;
  // Vercel previews for this project
  if (h.endsWith(".vercel.app") && h.includes("pump-farm")) return true;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      if (new URL(appUrl).host.toLowerCase() === h) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

/** Resolve domain/uri from the browser Origin (required for Phantom SIWE). */
export function resolveSiwxDomainUri(request: Request): {
  domain: string;
  uri: string;
} {
  const originHeader = request.headers.get("origin");
  if (originHeader) {
    try {
      const u = new URL(originHeader);
      if (isAllowedSiwxHost(u.host)) {
        return { domain: u.host, uri: u.origin };
      }
    } catch {
      /* fall through */
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const u = new URL(referer);
      if (isAllowedSiwxHost(u.host)) {
        return { domain: u.host, uri: u.origin };
      }
    } catch {
      /* fall through */
    }
  }

  return { domain: SIWX_DOMAIN, uri: SIWX_URI };
}

export function buildSiwxMessageText(params: {
  accountAddress: string;
  chainId: string;
  nonce: string;
  issuedAt: string;
  domain?: string;
  uri?: string;
  statement?: string;
  expirationTime?: string;
}): string {
  const domain = params.domain ?? SIWX_DOMAIN;
  const uri = params.uri ?? SIWX_URI;
  const statement = params.statement ?? SIWX_STATEMENT;
  const chainId = siwxNumericChainId(params.chainId);
  // EIP-55 checksum — Reown docs + Phantom require this for SIWE validation
  const address = checksumEvmAddress(params.accountAddress);

  let message =
    `${domain} wants you to sign in with your Ethereum account:\n` +
    `${address}\n\n` +
    `${statement}\n\n` +
    `URI: ${uri}\n` +
    `Version: 1\n` +
    `Chain ID: ${chainId}\n` +
    `Nonce: ${params.nonce}\n` +
    `Issued At: ${params.issuedAt}`;

  if (params.expirationTime) {
    message += `\nExpiration Time: ${params.expirationTime}`;
  }

  return message;
}

export function extractNonceFromMessage(message: string): string | null {
  const match = message.match(/Nonce:\s*([a-fA-F0-9]+)/);
  return match?.[1] ?? null;
}
