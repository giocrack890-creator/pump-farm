"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type WalletState = {
  address: string | null;
  jwt: string | null;
  /** False until localStorage rehydrate finishes — avoid gate flash on refresh. */
  hasHydrated: boolean;
  setAuth: (address: string, jwt: string) => void;
  clearAuth: () => void;
  setHasHydrated: (v: boolean) => void;
};

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: null,
      jwt: null,
      hasHydrated: false,
      setAuth: (address, jwt) => set({ address, jwt }),
      clearAuth: () => set({ address: null, jwt: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "pump-farm-auth",
      partialize: (s) => ({ address: s.address, jwt: s.jwt }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
