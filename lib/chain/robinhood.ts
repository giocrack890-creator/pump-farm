import { defineChain } from "viem";

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

export const EXPLORER_TX = (hash: string) =>
  `${ACTIVE_CHAIN.blockExplorers!.default.url}/tx/${hash}`;

export const EXPLORER_ADDRESS = (address: string) =>
  `${ACTIVE_CHAIN.blockExplorers!.default.url}/address/${address}`;

export const EXPLORER_TOKEN = (address: string) =>
  `${ACTIVE_CHAIN.blockExplorers!.default.url}/token/${address}`;
