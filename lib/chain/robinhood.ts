import { defineChain } from "viem";

/** Robinhood Chain mainnet — https://docs.robinhood.com/chain/connecting/ */
export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RPC_URL ??
          "https://rpc.mainnet.chain.robinhood.com",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
});

/** Robinhood Chain testnet */
export const robinhoodTestnet = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.chain.robinhood.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://explorer.testnet.chain.robinhood.com",
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
