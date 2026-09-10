import { defineChain, fallback, http } from "viem";

/**
 * Robinhood Chain — locked-in facts (do not re-derive):
 * - Mainnet chain ID 4663
 * - RPC https://rpc.mainnet.chain.robinhood.com
 * - Explorer https://explorer.mainnet.chain.robinhood.com (Blockscout)
 * - Native gas token: ETH
 */

export const ROBINHOOD_CHAIN_ID = 4663;
export const ROBINHOOD_TESTNET_CHAIN_ID = 46630;

export const ROBINHOOD_RPC =
  process.env.NEXT_PUBLIC_RPC_URL ??
  process.env.RPC_URL ??
  "https://rpc.mainnet.chain.robinhood.com";

export const ROBINHOOD_EXPLORER =
  process.env.NEXT_PUBLIC_EXPLORER_URL ??
  "https://explorer.mainnet.chain.robinhood.com";

export const robinhoodChain = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [ROBINHOOD_RPC] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: ROBINHOOD_EXPLORER,
    },
  },
});

export const robinhoodTestnet = defineChain({
  id: ROBINHOOD_TESTNET_CHAIN_ID,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_TESTNET_RPC_URL ??
          "https://rpc.testnet.chain.robinhood.com",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url:
        process.env.NEXT_PUBLIC_TESTNET_EXPLORER_URL ??
        "https://explorer.testnet.chain.robinhood.com",
    },
  },
  testnet: true,
});

export const ACTIVE_CHAIN =
  process.env.NEXT_PUBLIC_RH_NETWORK === "testnet"
    ? robinhoodTestnet
    : robinhoodChain;

/** Free, rate-limited, no SLA. Last-resort fallback behind any keyed RPC. */
export const PUBLIC_RPC = "https://rpc.mainnet.chain.robinhood.com";

/** Native ETH is currency0 of every Pons quote pair. */
export const NATIVE_CURRENCY = "0x0000000000000000000000000000000000000000" as const;

/** Canonical wrapped ETH on 4663 — used to price ETH/USD on this chain. */
export const WETH = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73" as const;

/** Server-only RPC (keyed endpoint). Never expose this to the browser. */
export function serverRpcUrl(): string {
  return (
    process.env.RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_RPC_URL?.trim() ||
    PUBLIC_RPC
  );
}

/**
 * The keyed endpoint first, the public one behind it.
 *
 * viem's `fallback` moves on when the first transport errors, which is what a
 * paid RPC having a bad afternoon looks like — and the alternative is the pot
 * reading as unavailable while the UI invents a stand-in figure. The public RPC
 * is rate-limited and has no SLA, so it is the reserve, not the plan.
 */
export function chainTransport({ batch = true }: { batch?: boolean } = {}) {
  const endpoints = [serverRpcUrl()];
  if (endpoints[0] !== PUBLIC_RPC) endpoints.push(PUBLIC_RPC);

  return fallback(
    endpoints.map((url, i) => {
      const isLast = i === endpoints.length - 1;
      // Retrying an endpoint that has an alternative is time spent waiting for
      // the same answer twice: an exhausted quota does not recover in 400ms.
      return http(url, {
        batch,
        retryCount: isLast ? 2 : 0,
        retryDelay: 400,
        timeout: isLast ? 15_000 : 6_000,
      });
    }),
    { rank: false },
  );
}

export const EXPLORER_TX = (hash: string) =>
  `${ACTIVE_CHAIN.blockExplorers!.default.url}/tx/${hash}`;

export const EXPLORER_ADDRESS = (address: string) =>
  `${ACTIVE_CHAIN.blockExplorers!.default.url}/address/${address}`;

export const EXPLORER_TOKEN = (address: string) =>
  `${ACTIVE_CHAIN.blockExplorers!.default.url}/token/${address}`;
