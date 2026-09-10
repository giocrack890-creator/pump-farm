export const SIWX_DOMAIN = "pump-farm.vercel.app";
export const SIWX_URI = "https://pump-farm.vercel.app";
export const SIWX_STATEMENT =
  "Sign in to Pump Farm with your Robinhood Chain wallet.";

/** EIP-4361 expects a numeric chain id (e.g. 4663), not CAIP `eip155:4663`. */
export function siwxNumericChainId(chainId: string | number): string {
  const raw = String(chainId).trim();
  if (raw.includes(":")) {
    const n = raw.split(":")[1];
    return n && /^\d+$/.test(n) ? n : raw;
  }
  return raw;
}

export function buildSiwxMessageText(params: {
  accountAddress: string;
  chainId: string;
  nonce: string;
  issuedAt: string;
  domain?: string;
  uri?: string;
  statement?: string;
}): string {
  const domain = params.domain ?? SIWX_DOMAIN;
  const uri = params.uri ?? SIWX_URI;
  const statement = params.statement ?? SIWX_STATEMENT;
  const chainId = siwxNumericChainId(params.chainId);
  return (
    `${domain} wants you to sign in with your Ethereum account:\n` +
    `${params.accountAddress}\n\n` +
    `${statement}\n\n` +
    `URI: ${uri}\n` +
    `Version: 1\n` +
    `Chain ID: ${chainId}\n` +
    `Nonce: ${params.nonce}\n` +
    `Issued At: ${params.issuedAt}`
  );
}

export function extractNonceFromMessage(message: string): string | null {
  const match = message.match(/Nonce:\s*([a-fA-F0-9]+)/);
  return match?.[1] ?? null;
}
