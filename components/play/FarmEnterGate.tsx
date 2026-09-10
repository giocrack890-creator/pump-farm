"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import { DISCLAIMER } from "@/components/layout/Footer";
import {
  hudBtnPrimary,
  hudBtnSecondary,
  hudInk,
  hudInkMuted,
  hudPanel,
} from "@/components/hud/hudChrome";
import { REOWN_PROJECT_ID } from "@/lib/reown/config";
import { useWalletStore } from "@/store/useWalletStore";
import { toast } from "@/store/useToastStore";
import { cn } from "@/lib/utils";

const FARM_BG = "/assets/tmp-farm-terrain-no-buildings.png";

function demoPlayEnabled() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return true;
  return process.env.NEXT_PUBLIC_DEMO_PLAY === "true";
}

type Props = {
  loadError?: boolean;
  onClearSession?: () => void;
};

/**
 * First screen after tapping Play — wood/parchment chrome, farm atmosphere.
 * Exactly one primary (Play demo) and one secondary (Connect Wallet).
 */
export function FarmEnterGate({ loadError = false, onClearSession }: Props) {
  const jwt = useWalletStore((s) => s.jwt);
  const setAuth = useWalletStore((s) => s.setAuth);
  const [demoOk, setDemoOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDemoOk(demoPlayEnabled());
  }, []);

  const runDemo = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/dev-bypass", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Demo play failed");
      setAuth(data.address, data.token);
      window.location.href = "/play";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Demo play failed");
    } finally {
      setBusy(false);
    }
  }, [setAuth]);

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={FARM_BG}
          alt=""
          className="h-full w-full scale-110 object-cover blur-[10px]"
          draggable={false}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(91,60,35,0.45)_0%,rgba(58,37,21,0.78)_55%,rgba(34,20,12,0.92)_100%)]" />
        <div className="absolute inset-0 bg-[#3a2515]/55" />
      </div>

      <div
        className={cn(
          "relative z-[1] w-full max-w-md space-y-5 p-6 text-center sm:p-8",
          hudPanel,
        )}
      >
        <h1 className={`text-base leading-relaxed sm:text-lg ${hudInk}`}>
          Enter the Farm
        </h1>
        <p className={`text-sm leading-snug ${hudInkMuted}`}>
          <strong className={hudInk}>Play demo</strong> — jump in with no wallet;
          progress stays on this device for the public demo.
          <br />
          <strong className={hudInk}>Connect Wallet</strong> — MetaMask, Phantom (EVM),
          Rabby, Robinhood Wallet, or WalletConnect for real Season Points and Silo
          eligibility.
        </p>

        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {loadError && jwt ? (
            <button
              type="button"
              className={cn(hudBtnSecondary, "rounded-none")}
              onClick={onClearSession}
            >
              Clear session
            </button>
          ) : demoOk ? (
            <button
              type="button"
              className={cn(
                hudBtnPrimary,
                "rounded-none bg-[#e6a800] text-[#1a1200] hover:brightness-105",
              )}
              disabled={busy}
              onClick={() => void runDemo()}
              aria-label="Play demo"
            >
              {busy ? "Entering farm…" : "▶ Play demo"}
            </button>
          ) : null}

          {REOWN_PROJECT_ID ? (
            <ConnectWalletChromeButton />
          ) : (
            <button
              type="button"
              disabled
              className={cn(hudBtnSecondary, "cursor-not-allowed rounded-none opacity-50")}
              title="Set NEXT_PUBLIC_REOWN_PROJECT_ID to enable wallet login"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      <p className="relative z-[1] mt-5 max-w-md border-[2px] border-[#5c3a1e] bg-[#efe0bc] px-3 py-2 text-left text-[10px] leading-relaxed text-[#3a2414] shadow-[2px_2px_0_#3a2414]">
        {DISCLAIMER}
      </p>
    </div>
  );
}

/** Only mounted when AppKitProvider is active (REOWN_PROJECT_ID set). */
function ConnectWalletChromeButton() {
  const { open } = useAppKit();
  return (
    <button
      type="button"
      className={cn(hudBtnSecondary, "rounded-none")}
      onClick={() => void open()}
    >
      Connect Wallet
    </button>
  );
}
