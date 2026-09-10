"use client";

import { create } from "zustand";

export type ToastKind = "info" | "success" | "error" | "levelup" | "quest";

export type ToastItem = {
  id: string;
  message: string;
  kind: ToastKind;
  ttlMs: number;
};

type ToastState = {
  toasts: ToastItem[];
  push: (message: string, kind?: ToastKind, ttlMs?: number) => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

let seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, kind = "info", ttlMs) => {
    const id = `toast-${Date.now()}-${seq++}`;
    const defaultTtl =
      kind === "levelup" ? 5200 : kind === "quest" ? 4000 : kind === "error" ? 4200 : 3200;
    set((s) => ({
      toasts: [...s.toasts.slice(-2), { id, message, kind, ttlMs: ttlMs ?? defaultTtl }],
    }));
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

/** Fire-and-forget helpers for non-React call sites. */
export const toast = {
  info: (message: string, ttlMs?: number) =>
    useToastStore.getState().push(message, "info", ttlMs),
  success: (message: string, ttlMs?: number) =>
    useToastStore.getState().push(message, "success", ttlMs),
  error: (message: string, ttlMs?: number) =>
    useToastStore.getState().push(message, "error", ttlMs),
  levelUp: (message: string, ttlMs?: number) =>
    useToastStore.getState().push(message, "levelup", ttlMs),
  quest: (message: string, ttlMs?: number) =>
    useToastStore.getState().push(message, "quest", ttlMs),
};
