"use client";

import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { CreateAppKit } from "@reown/appkit/react";
import { ACTIVE_CHAIN } from "@/lib/chain/robinhood";
import { pumpFarmSIWX } from "@/lib/reown/siwx";

export const REOWN_PROJECT_ID =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID?.trim() || "";

/** AppKit metadata — prefer live origin so WC/Phantom origin checks align with SIWX. */
export function getAppMetadata() {
  const fallback = "https://www.pumpfarm.net";
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || fallback;
  return {
    name: "Pump Farm",
    description: "Farm $FARM on Robinhood Chain — grow green candles.",
    url: origin,
    icons: [
      `${origin}/icon.png`,
      `${origin}/assets/landing/logo-pump-farm.png`,
    ],
  };
}

/** @deprecated use getAppMetadata() — kept for any static imports */
export const APP_METADATA = {
  name: "Pump Farm",
  description: "Farm $FARM on Robinhood Chain — grow green candles.",
  url: "https://www.pumpfarm.net",
  icons: [
    "https://www.pumpfarm.net/icon.png",
    "https://www.pumpfarm.net/assets/landing/logo-pump-farm.png",
  ],
};

/** Single EVM network — Robinhood Chain (mainnet or testnet via NEXT_PUBLIC_RH_NETWORK). */
export const APPKIT_NETWORKS = [ACTIVE_CHAIN] as [
  typeof ACTIVE_CHAIN,
  ...typeof ACTIVE_CHAIN[],
];

/**
 * Solana-only wallets (no usable EVM for Robinhood Chain).
 * Phantom stays allowed — it has EVM mode and should appear when installed.
 */
const EXCLUDE_SOLANA_ONLY_WALLETS = [
  // Solflare — Solana only
  "1ca0bdd4747578705b1939af023d120677c64fe6ca76add81fda36e350605e79",
  // Backpack
  "2acbf30985774bbd03e3555d4adfded3dca57ceb4b817f473310b5ac3a4c3385",
] as const;

/** Featured on the connect modal (order respected). */
const FEATURED_WALLETS = [
  // Phantom (EVM + Solana extension)
  "a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393",
  // MetaMask
  "c57ca95b47569778a828d3823191c15dae321cbc02dc8438905369d29d6be8f6",
  // Rabby
  "183c7b1d4c0f63fa2974e8501917ab9a19b6c5c765cbbdfc40831c2e1d8f0a13",
  // Trust Wallet
  "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0",
  // Coinbase Wallet
  "fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa",
  // Rainbow
  "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369",
] as const;

let wagmiAdapter: WagmiAdapter | null = null;

export function getWagmiAdapter(): WagmiAdapter | null {
  if (!REOWN_PROJECT_ID) return null;
  if (!wagmiAdapter) {
    wagmiAdapter = new WagmiAdapter({
      networks: APPKIT_NETWORKS,
      projectId: REOWN_PROJECT_ID,
    });
  }
  return wagmiAdapter;
}

/** AppKit options — only use when REOWN_PROJECT_ID is set. */
export function getAppKitOptions(): CreateAppKit | null {
  if (!REOWN_PROJECT_ID) return null;
  const adapter = getWagmiAdapter();
  if (!adapter) return null;
  return {
    adapters: [adapter],
    projectId: REOWN_PROJECT_ID,
    networks: APPKIT_NETWORKS,
    defaultNetwork: ACTIVE_CHAIN,
    metadata: getAppMetadata(),
    siwx: pumpFarmSIWX,
    themeMode: "dark",
    // EVM-only AppKit — Phantom appears via EIP-6963 as ethereum provider.
    defaultAccountTypes: { eip155: "eoa" },
    featuredWalletIds: [...FEATURED_WALLETS],
    excludeWalletIds: [...EXCLUDE_SOLANA_ONLY_WALLETS],
    features: {
      analytics: false,
      email: false,
      socials: false,
    },
  };
}
