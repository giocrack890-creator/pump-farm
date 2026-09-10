"use client";

import { useState } from "react";
import {
  hudBtnPrimary,
  hudInk,
  hudInkMuted,
  hudPanel,
} from "@/components/hud/hudChrome";
import { DISPLAY_NAME_MAX, DISPLAY_NAME_MIN } from "@/lib/farm/displayName";
import { useWalletStore } from "@/store/useWalletStore";
import { toast } from "@/store/useToastStore";
import { cn } from "@/lib/utils";

type Props = {
  onDone: (name: string) => void;
};

/**
 * First-time farmer name after wallet connect — shown on leaderboard instead of address.
 */
export function FarmerNameGate({ onDone }: Props) {
  const jwt = useWalletStore((s) => s.jwt);
  const setDisplayName = useWalletStore((s) => s.setDisplayName);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!jwt) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/farm/profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: name }),
      });
      const data = (await res.json()) as { error?: string; displayName?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save name");
        return;
      }
      const saved = data.displayName ?? name.trim();
      setDisplayName(saved);
      toast.success(`Welcome, ${saved}!`);
      onDone(saved);
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4">
      <div className={cn("w-full max-w-sm space-y-4 p-5 text-center", hudPanel)}>
        <h2 className={`text-base ${hudInk}`}>Name your farmer</h2>
        <p className={`text-xs leading-relaxed ${hudInkMuted}`}>
          This name shows on the leaderboard instead of your wallet. You can keep
          farming after you pick one.
        </p>
        <label className="block text-left">
          <span className={`text-[10px] uppercase tracking-wide ${hudInkMuted}`}>
            Farmer name
          </span>
          <input
            type="text"
            value={name}
            maxLength={DISPLAY_NAME_MAX}
            autoFocus
            autoComplete="nickname"
            placeholder="e.g. SiloKing"
            className="mt-1 w-full border-[3px] border-[#5c3a1e] bg-[#fff8e8] px-3 py-2 font-[family-name:var(--font-pixel)] text-sm text-[#1a1008] outline-none focus:ring-2 focus:ring-[#3d7a2e]"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
        </label>
        <p className={`text-[10px] ${hudInkMuted}`}>
          {DISPLAY_NAME_MIN}–{DISPLAY_NAME_MAX} chars · letters, numbers, spaces
        </p>
        {error ? (
          <p className="text-xs font-semibold text-[#8b1e1e]" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          className={cn(hudBtnPrimary, "w-full rounded-none")}
          disabled={busy || name.trim().length < DISPLAY_NAME_MIN}
          onClick={() => void submit()}
        >
          {busy ? "Saving…" : "Save & enter farm"}
        </button>
      </div>
    </div>
  );
}
