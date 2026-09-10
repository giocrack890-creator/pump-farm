"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type WalletState = {
  address: string | null;
  jwt: string | null;
  displayName: string | null;
  /** False until localStorage rehydrate finishes — avoid gate flash on refresh. */
  hasHydrated: boolean;
  setAuth: (address: string, jwt: string, displayName?: string | null) => void;
  setDisplayName: (name: string | null) => void;
  clearAuth: () => void;
  setHasHydrated: (v: boolean) => void;
};

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: null,
      jwt: null,
      displayName: null,
      hasHydrated: false,
      setAuth: (address, jwt, displayName = null) =>
        set({ address, jwt, displayName: displayName ?? null }),
      setDisplayName: (displayName) => set({ displayName }),
      clearAuth: () => set({ address: null, jwt: null, displayName: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "pump-farm-auth",
      partialize: (s) => ({
        address: s.address,
        jwt: s.jwt,
        displayName: s.displayName,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
