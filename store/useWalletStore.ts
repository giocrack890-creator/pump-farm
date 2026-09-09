"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type WalletState = {
  address: string | null;
  jwt: string | null;
  setAuth: (address: string, jwt: string) => void;
  clearAuth: () => void;
};

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: null,
      jwt: null,
      setAuth: (address, jwt) => set({ address, jwt }),
      clearAuth: () => set({ address: null, jwt: null }),
    }),
    { name: "pump-farm-auth" },
  ),
);
