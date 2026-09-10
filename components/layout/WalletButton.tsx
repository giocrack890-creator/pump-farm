"use client";

import { AppKitButton } from "@reown/appkit/react";
import { useWalletStore } from "@/store/useWalletStore";
import { REOWN_PROJECT_ID } from "@/lib/reown/config";

/**
 * Connect = login via Reown AppKit (MetaMask / Robinhood Wallet / WalletConnect).
 * SIWX signs a message; server verifies ECDSA and issues JWT into useWalletStore.
 */
export function WalletButton() {
  const address = useWalletStore((s) => s.address);
  const clearAuth = useWalletStore((s) => s.clearAuth);

  if (!REOWN_PROJECT_ID) {
    return (
      <button
        type="button"
        disabled
        className="cursor-not-allowed rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/40"
        title="Set NEXT_PUBLIC_REOWN_PROJECT_ID from https://dashboard.reown.com"
      >
        Connect wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <AppKitButton />
      {address ? (
        <button
          type="button"
          onClick={() => clearAuth()}
          className="rounded-full border border-white/15 px-2 py-1 text-[10px] text-white/50 hover:text-white"
        >
          Sign out
        </button>
      ) : null}
    </div>
  );
}
