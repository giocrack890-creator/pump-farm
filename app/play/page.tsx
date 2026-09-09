"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FarmGrid } from "@/components/farm/FarmGrid";
import { OnboardingTutorial } from "@/components/farm/OnboardingTutorial";
import { GoldenHarvestOverlay } from "@/components/farm/GoldenHarvestOverlay";
import { SeasonCountdown } from "@/components/shared/SeasonCountdown";
import { PriceTicker } from "@/components/shared/PriceTicker";
import { useFarmStore } from "@/store/useFarmStore";
import { useWalletStore } from "@/store/useWalletStore";
import { useSeasonStore } from "@/store/useSeasonStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { WalletButton } from "@/components/layout/WalletButton";
import { Wallet } from "lucide-react";

export default function PlayPage() {
  const jwt = useWalletStore((s) => s.jwt);
  const syncFromServer = useFarmStore((s) => s.syncFromServer);
  const hype = useFarmStore((s) => s.hype);
  const sp = useFarmStore((s) => s.sp);
  const hypeRate = useFarmStore((s) => s.hypeRate);
  const weather = useFarmStore((s) => s.weather);
  const harvestStreak = useFarmStore((s) => s.harvestStreak);
  const referralCode = useFarmStore((s) => s.referralCode);
  const setSeason = useSeasonStore((s) => s.setSeason);
  const endsAt = useSeasonStore((s) => s.endsAt);
  const [showGolden, setShowGolden] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!jwt) {
      setLoading(false);
      setLoadError(true);
      return;
    }
    try {
      const res = await fetch("/api/farm", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) {
        setLoadError(true);
        return;
      }
      const data = await res.json();
      syncFromServer({
        plots: data.plots,
        hype: Number(data.wallet?.hypeBalance ?? data.hypeBalance ?? 0),
        sp: Number(data.seasonPoints ?? 0),
        harvestStreak: Number(
          data.wallet?.harvestStreak ?? data.harvestStreak ?? 0,
        ),
        referralCode: data.wallet?.referralCode ?? data.referralCode ?? null,
        weather: data.weather ?? "Sunny",
        goldenHarvestActive: Boolean(data.goldenHarvest?.active),
        goldenEndsAt: data.goldenHarvest?.endsAt ?? null,
        activeStakeBonus: Number(data.multipliers?.stake ?? 0),
        hypeRate: Number(data.hypeRate ?? 0),
      });
      if (data.season) {
        setSeason({
          id: data.season.id,
          number: data.season.number,
          endsAt: data.season.endsAt,
          poolAmount: Number(data.season.poolAmount ?? 0),
        });
      }
      if (data.goldenHarvest?.active) setShowGolden(true);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [jwt, syncFromServer, setSeason]);

  useEffect(() => {
    void refresh();
    if (!jwt) return;
    const id = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(id);
  }, [refresh, jwt]);

  const claimDaily = async () => {
    if (!jwt) return;
    const res = await fetch("/api/farm/claim-daily", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (res.ok) await refresh();
  };

  useQuery({
    queryKey: ["price-warm"],
    queryFn: async () => (await fetch("/api/price")).json(),
    refetchInterval: 30_000,
    enabled: Boolean(jwt),
  });

  if (!jwt || loadError) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 pb-20 text-center">
        <Card className="glow-green w-full space-y-4 p-8">
          <Wallet className="mx-auto h-10 w-10 text-[#3DFF7A]" />
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
            Connect to start farming
          </h1>
          <p className="text-sm text-white/55">
            Your farm is provisioned on first wallet signature — no email, no
            password. If the API is offline, reconnect once it&apos;s back.
          </p>
          <WalletButton />
        </Card>
        <OnboardingTutorial />
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 pb-24">
      <GoldenHarvestOverlay
        active={showGolden}
        onDone={() => setShowGolden(false)}
      />
      <OnboardingTutorial />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">
            Play
          </h1>
          <p className="text-sm text-white/50">
            Plant · grow · harvest Season Points
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => void claimDaily()}>
            Claim daily Hype
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-white/40">
            Season Points
          </p>
          <p className="font-[family-name:var(--font-display)] text-2xl tabular-nums text-[#3DFF7A]">
            {formatNumber(sp, 2)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-white/40">Hype</p>
          <p className="font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {formatNumber(hype, 1)}
            <span className="ml-1 text-sm text-white/40">
              (+{formatNumber(hypeRate, 1)}/hr)
            </span>
          </p>
        </Card>
        <Card className="p-4">
          <SeasonCountdown endsAt={endsAt} />
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-white/40">
            Weather / Streak
          </p>
          <p className="font-[family-name:var(--font-display)] text-lg capitalize">
            {weather} · {harvestStreak}d
          </p>
        </Card>
        <div className="flex items-center">
          <PriceTicker className="w-full justify-center py-3" />
        </div>
      </div>

      {loading ? (
        <div className="glass-panel flex h-72 items-center justify-center rounded-3xl text-white/50">
          Loading farm…
        </div>
      ) : (
        <FarmGrid onRefresh={() => void refresh()} />
      )}

      {referralCode ? (
        <p className="mt-6 text-center text-xs text-white/40">
          Referral: {typeof window !== "undefined" ? `${window.location.origin}/play?ref=${referralCode}` : referralCode}
        </p>
      ) : null}
    </div>
  );
}
