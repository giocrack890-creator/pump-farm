"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  TOKEN_TICKER,
  TOKEN_MINT,
  PAYOUT_TIER_1_PCT,
  PAYOUT_TIER_1_SHARE,
  PAYOUT_TIER_2_PCT,
  PAYOUT_TIER_2_SHARE,
  PAYOUT_TIER_3_SHARE,
} from "@/lib/game/config";

const features = [
  {
    title: "Plant seeds",
    body: "Drop seeds into living plots and start a real-time growth loop.",
    art: "/assets/sprites/crops/basic_1.png",
  },
  {
    title: "Grow your farm",
    body: "Upgrade tiers, stack streaks, and expand your candle crop empire.",
    art: "/assets/sprites/buildings/barn.png",
  },
  {
    title: "Earn Season Points",
    body: "Every harvest feeds the weekly leaderboard — no pay-to-win SP.",
    art: "/assets/icons/sp.png",
  },
  {
    title: `Share the Silo`,
    body: `Real $${TOKEN_TICKER} fee rewards. On-chain. Public. No SP for sale.`,
    art: "/assets/sprites/buildings/silo.png",
  },
] as const;

const faqs = [
  {
    q: "Is this free to play?",
    a: "Yes. You connect a wallet, claim daily Hype, plant seeds, and harvest. Season Points are earned in-game — never purchased.",
  },
  {
    q: "How do I actually get paid?",
    a: `At the end of each 7-day Season, the Silo fee pool is split by rank: top farmers share most of the real $${TOKEN_TICKER} rewards pro-rata by Season Points. Eligibility rules apply — see Proof and Docs.`,
  },
  {
    q: `Is $${TOKEN_TICKER} safe / is this a rug?`,
    a: "Treat every memecoin as high risk. We publish treasury activity on Proof and keep payout math open-source and unit-tested. Nothing here is financial advice — only farm what you can afford to lose.",
  },
  {
    q: "What happens at the end of a Season?",
    a: "The Season closes, payouts are computed from stored SP (server-side), ranks freeze for that week, and a new Season starts. Your Farm Level / XP persist across seasons.",
  },
  {
    q: "Do I need to know crypto to play?",
    a: "You need an EVM wallet on Robinhood Chain (MetaMask, Robinhood Wallet, or WalletConnect) and enough ETH for gas when claiming on-chain rewards. The farm loop itself is a normal plant → grow → harvest game. Deploying on Robinhood Chain does not mean $HOOD is buyable inside the Robinhood brokerage app.",
  },
  {
    q: "Can I buy Season Points?",
    a: "No. SP cannot be purchased with real money. That rule is intentional anti-pay-to-win design.",
  },
] as const;

const quotes = [
  {
    name: "early farmer",
    text: "Finally a farm game where the Silo number actually moves.",
    stars: 5,
  },
  {
    name: "season 0",
    text: "Planted Basic, woke up to ready crops. The harvest juice slapped.",
    stars: 5,
  },
  {
    name: "ranks lurker",
    text: "The payout split chart made me care about climbing again.",
    stars: 4,
  },
] as const;

function CloudBlob({
  className,
  drift,
}: {
  className?: string;
  drift?: "animate-drift" | "animate-drift-slow";
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full bg-white/10 blur-2xl ${drift ?? ""} ${className ?? ""}`}
    />
  );
}

function useCountUp(target: number, enabled: boolean, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, duration]);
  return value;
}

function MiniSparkline({ rising = true }: { rising?: boolean }) {
  const ref = useRef<SVGPathElement>(null);
  const inView = useInView(ref, { once: true });
  const d = rising
    ? "M0 22 L8 18 L16 20 L24 12 L32 14 L40 6 L48 8 L56 3"
    : "M0 8 L8 10 L16 7 L24 14 L32 12 L40 18 L48 16 L56 22";

  return (
    <svg width="56" height="24" viewBox="0 0 56 24" className="shrink-0 overflow-visible" aria-hidden>
      <path
        ref={ref}
        d={d}
        fill="none"
        stroke={rising ? "#3DFF7A" : "#FF4D4D"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={inView ? "animate-draw-line" : ""}
        style={{ filter: `drop-shadow(0 0 4px ${rising ? "#3DFF7A" : "#FF4D4D"})` }}
      />
    </svg>
  );
}

function CopyCA({ dark = false }: { dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-5 py-2.5 font-mono text-xs shadow-sm backdrop-blur-md transition ${
        dark
          ? "border-white/20 bg-white/10 text-[#f5f0ff] hover:bg-white/15"
          : "border-[#2b1b5e]/15 bg-white text-[#2b1b5e] hover:bg-[#f5f0ff]"
      }`}
      onClick={async () => {
        await navigator.clipboard.writeText(TOKEN_MINT);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label="Copy token contract address"
    >
      CA: {TOKEN_MINT.slice(0, 6)}…{TOKEN_MINT.slice(-4)}
      <span className={`font-sans font-semibold ${dark ? "text-[#FFC94D]" : "text-[#2b1b5e]"}`}>
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

function StatsRibbon() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [stats, setStats] = useState<{
    seedsPlantedToday: number | null;
    siloUsd: number | null;
    activeFarmers: number | null;
    seasonEndsIn: { days: number; hours: number } | null;
    mock: boolean;
    loaded: boolean;
  }>({
    seedsPlantedToday: null,
    siloUsd: null,
    activeFarmers: null,
    seasonEndsIn: null,
    mock: true,
    loaded: false,
  });

  useEffect(() => {
    void fetch("/api/stats/public")
      .then((r) => r.json())
      .then((d) => {
        setStats({
          seedsPlantedToday:
            typeof d?.seedsPlantedToday === "number" ? d.seedsPlantedToday : null,
          siloUsd: typeof d?.siloUsd === "number" ? d.siloUsd : null,
          activeFarmers:
            typeof d?.activeFarmers === "number" ? d.activeFarmers : null,
          seasonEndsIn:
            d?.seasonEndsIn &&
            typeof d.seasonEndsIn.days === "number" &&
            typeof d.seasonEndsIn.hours === "number"
              ? d.seasonEndsIn
              : null,
          mock: Boolean(d?.mock),
          loaded: true,
        });
      })
      .catch(() => {
        setStats((s) => ({ ...s, loaded: true, mock: true }));
      });
  }, []);

  const seedsTarget = stats.seedsPlantedToday ?? 0;
  const siloTarget = stats.siloUsd ?? 0;
  const farmersTarget = stats.activeFarmers ?? 0;
  const seeds = useCountUp(seedsTarget, inView && stats.seedsPlantedToday != null);
  const silo = useCountUp(siloTarget, inView && stats.siloUsd != null);
  const farmers = useCountUp(farmersTarget, inView && stats.activeFarmers != null);

  const items = [
    {
      label: "seeds planted today",
      value:
        stats.seedsPlantedToday != null
          ? seeds.toLocaleString()
          : stats.loaded
            ? "—"
            : "…",
      icon: "/assets/sprites/crops/basic_3.png",
      pill: "bg-[#3DFF7A]/15 border-[#3DFF7A]/35 text-[#3DFF7A]",
    },
    {
      label: "in the Silo",
      value:
        stats.siloUsd != null
          ? `$${silo.toLocaleString()}`
          : stats.loaded
            ? "—"
            : "…",
      icon: "/assets/icons/rewards.png",
      pill: "bg-[#FFC94D]/15 border-[#FFC94D]/35 text-[#FFC94D]",
      spark: stats.siloUsd != null,
    },
    {
      label: "active farmers",
      value:
        stats.activeFarmers != null
          ? farmers.toLocaleString()
          : stats.loaded
            ? "—"
            : "…",
      icon: "/assets/icons/companion.png",
      pill: "bg-[#9bb4ff]/15 border-[#9bb4ff]/35 text-[#9bb4ff]",
    },
    {
      label: "season ends in",
      value: stats.seasonEndsIn
        ? `${stats.seasonEndsIn.days}d ${stats.seasonEndsIn.hours}h`
        : stats.loaded
          ? "—"
          : "…",
      icon: "/assets/icons/ranks.png",
      pill: "bg-[#c4b5fd]/15 border-[#c4b5fd]/35 text-[#c4b5fd]",
    },
  ];

  return (
    <div ref={ref} className="landing-gradient-deep relative overflow-hidden py-6 sm:py-8">
      <CloudBlob className="-left-10 top-0 h-24 w-48" drift="animate-drift" />
      <div className="relative mx-auto flex max-w-6xl flex-wrap items-stretch justify-center gap-3 px-4">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex min-w-[160px] flex-1 items-center gap-3 rounded-full border px-4 py-3 backdrop-blur-md sm:min-w-[200px] sm:px-5 ${item.pill}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.icon} alt="" className="h-8 w-8 object-contain" />
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className="font-[family-name:var(--font-display)] text-lg tabular-nums text-white sm:text-xl">
                  {item.value}
                </p>
                {"spark" in item && item.spark ? <MiniSparkline /> : null}
              </div>
              <p className="text-[10px] uppercase tracking-wide opacity-80 sm:text-[11px]">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FarmShowcase() {
  return (
    <section className="bg-[#F5F0FF] py-14 text-[#0a0b2e] sm:py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 text-center md:mb-10 md:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2b1b5e]/60">
            The real game
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight md:text-4xl">
            This is what you&apos;re actually{" "}
            <span className="text-accent-gradient">playing</span>
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[#2b1b5e]/65 md:text-base">
            Isometric farm scene, mobile-game HUD, plant sheet — not a dashboard with farm icons.
          </p>
        </div>

        <div className="grid items-center gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="relative mx-auto w-full max-w-3xl rotate-[-1.5deg] transition hover:rotate-0">
            <div className="overflow-hidden rounded-2xl border border-[#2b1b5e]/10 bg-[#0a0b2e] shadow-[0_30px_80px_rgba(10,11,46,0.25)]">
              <div className="flex items-center gap-2 border-b border-white/10 bg-[#1a1248] px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <span className="ml-3 rounded-md bg-black/30 px-3 py-0.5 font-mono text-[10px] text-white/50">
                  pump.farm/play
                </span>
              </div>
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-b from-[#2b1b5e] to-[#0a0b2e]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/landing/farm-platform-clay.png"
                  alt=""
                  className="absolute inset-x-0 bottom-0 mx-auto h-[70%] w-auto object-contain opacity-90"
                />
                <div className="absolute inset-0 flex items-end justify-center pb-8 pt-10">
                  <div className="relative flex w-[90%] items-end justify-center gap-2 sm:gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/assets/sprites/buildings/barn.png"
                      alt=""
                      className="relative z-[1] h-28 w-28 object-contain drop-shadow-xl sm:h-40 sm:w-40"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/assets/sprites/buildings/silo.png"
                      alt=""
                      className="relative z-[2] -ml-6 h-24 w-20 object-contain sm:h-36 sm:w-24"
                    />
                    <div className="absolute bottom-0 flex gap-1 sm:gap-2">
                      {["basic_3", "hybrid_3", "golden_3", "mythic_3"].map((c) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={c}
                          src={`/assets/sprites/crops/${c}.png`}
                          alt=""
                          className="h-10 w-8 object-contain sm:h-14 sm:w-11"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/55 px-2 py-1 backdrop-blur-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/sprites/companions/pet.png"
                    alt=""
                    className="h-7 w-7 rounded-full object-contain"
                  />
                  <div className="pr-2">
                    <p className="text-[9px] font-semibold text-white">Farmer · Lv 5</p>
                    <div className="mt-0.5 h-1 w-16 rounded-full bg-white/20">
                      <div className="h-full w-2/3 rounded-full bg-[#3DFF7A]" />
                    </div>
                  </div>
                </div>
                <div className="absolute right-3 top-3 flex flex-col gap-1">
                  <div className="flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/icons/sp.png" alt="" className="h-4 w-4" />
                    128 SP
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/assets/icons/hype.png" alt="" className="h-4 w-4" />
                    420 Hype
                  </div>
                </div>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-2xl bg-black/60 px-2 py-1.5 backdrop-blur-md">
                  {["silo", "shop", "companion", "almanac", "decorate", "friends"].map((id) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={id}
                      src={`/assets/icons/${id}.png`}
                      alt=""
                      className="h-7 w-7 object-contain"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <ul className="space-y-4 text-left">
            {[
              {
                title: "Live Silo readout",
                body: "The in-game Silo scales with the real treasury — not a fake meter.",
                art: "/assets/sprites/buildings/silo.png",
              },
              {
                title: "HUD like a mobile farm-sim",
                body: "Level ring, SP / Hype pills, quest ticket, bottom nav — all illustrated.",
                art: "/assets/icons/sp.png",
              },
              {
                title: "Plant without dropdowns",
                body: "Tap a plot → visual seed picker. Harvest ready crops in one tap.",
                art: "/assets/sprites/crops/golden_3.png",
              },
            ].map((c) => (
              <li
                key={c.title}
                className="flex gap-3 rounded-2xl border border-[#2b1b5e]/8 bg-white p-4 shadow-[0_8px_28px_rgba(10,11,46,0.08)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.art} alt="" className="h-12 w-11 object-contain" />
                <div>
                  <p className="font-[family-name:var(--font-display)] text-lg font-semibold">
                    {c.title}
                  </p>
                  <p className="mt-1 text-sm text-[#2b1b5e]/65">{c.body}</p>
                </div>
              </li>
            ))}
            <li>
              <Link
                href="/play"
                className="inline-flex cursor-pointer rounded-full bg-[#3DFF7A] px-6 py-3 text-sm font-bold text-[#06140C] transition hover:bg-[#2aee6a]"
              >
                Open /play →
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function PayoutSplit() {
  const tiers = [
    {
      label: `Top ${PAYOUT_TIER_1_PCT * 100}%`,
      share: PAYOUT_TIER_1_SHARE,
      color: "#FFC94D",
      art: "/assets/icons/rewards.png",
    },
    {
      label: `Next ${PAYOUT_TIER_2_PCT * 100}%`,
      share: PAYOUT_TIER_2_SHARE,
      color: "#3DFF7A",
      art: "/assets/icons/sp.png",
    },
    {
      label: "Everyone else who harvested",
      share: PAYOUT_TIER_3_SHARE,
      color: "#9bb4ff",
      art: "/assets/sprites/crops/basic_3.png",
    },
  ];

  const r = 42;
  const c = 2 * Math.PI * r;
  const arcs = tiers.reduce<{ label: string; color: string; len: number; offset: number }[]>(
    (acc, t) => {
      const len = t.share * c;
      const prev = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].len : 0;
      acc.push({ label: t.label, color: t.color, len, offset: prev });
      return acc;
    },
    [],
  );

  return (
    <section className="landing-gradient relative overflow-hidden py-14 sm:py-16">
      <CloudBlob className="right-10 top-10 h-36 w-64 bg-[#c4b5fd]/15" drift="animate-drift-slow" />
      <div className="relative mx-auto max-w-6xl px-4">
        <div className="rounded-[1.75rem] border border-white/10 bg-[rgba(10,11,46,0.55)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8 md:p-10">
          <div className="mb-8 grid items-center gap-8 md:grid-cols-[auto_1fr] md:gap-12">
            <div className="relative mx-auto h-44 w-44 shrink-0">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" />
                {arcs.map((a) => (
                  <circle
                    key={a.label}
                    cx="60"
                    cy="60"
                    r={r}
                    fill="none"
                    stroke={a.color}
                    strokeWidth="16"
                    strokeDasharray={`${a.len} ${c - a.len}`}
                    strokeDashoffset={-a.offset}
                    style={{ filter: `drop-shadow(0 0 8px ${a.color})` }}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/assets/landing/farm-coin-clay.png"
                  alt=""
                  className="h-14 w-14 object-contain"
                />
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                  Silo pool
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FFC94D]">
                Season close
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-white md:text-4xl">
                How the Silo{" "}
                <span className="text-accent-gradient">pays out</span>
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-[#c4b5fd]/80">
                After ops reserve, the real fee pool is split by rank. Grow bigger → share more.
              </p>

              <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                {tiers.map((t) => (
                  <li
                    key={t.label}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.art} alt="" className="h-10 w-10 object-contain" />
                    <div>
                      <p className="text-sm font-semibold text-white">{t.label}</p>
                      <p className="text-xs" style={{ color: t.color }}>
                        {t.share * 100}% of the pool
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex h-3 overflow-hidden rounded-full border border-white/10 sm:h-4">
            {tiers.map((t) => (
              <div
                key={t.label}
                style={{ width: `${t.share * 100}%`, backgroundColor: t.color }}
                className="shadow-[inset_0_0_12px_rgba(255,255,255,0.25)]"
                title={`${t.label}: ${t.share * 100}%`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksPath() {
  return (
    <section id="features" className="landing-gradient-deep relative overflow-hidden py-14 sm:py-16">
      <CloudBlob className="-left-8 bottom-20 h-32 w-56" drift="animate-drift" />
      <div className="relative mx-auto max-w-6xl px-4">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3DFF7A]/80">
              The loop
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-white md:text-4xl">
              How the farm{" "}
              <span className="text-accent-gradient">works</span>
            </h2>
          </div>
          <Link href="/play" className="text-sm font-semibold text-[#3DFF7A] hover:text-[#2aee6a]">
            Jump in →
          </Link>
        </div>

        <div className="relative">
          <svg
            aria-hidden
            className="pointer-events-none absolute left-[12%] right-[12%] top-[4.5rem] hidden h-8 md:block"
            viewBox="0 0 1000 40"
            preserveAspectRatio="none"
          >
            <path
              d="M0 20 Q250 0 500 20 T1000 20"
              fill="none"
              stroke="rgba(61,255,122,0.25)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M0 20 Q250 0 500 20 T1000 20"
              fill="none"
              stroke="rgba(255,201,77,0.35)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="8 14"
            />
          </svg>

          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <li
                key={f.title}
                className="relative rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-center shadow-[0_10px_28px_rgba(0,0,0,0.25)] backdrop-blur-md"
              >
                <span className="absolute -top-3 left-4 rounded-full bg-[#3DFF7A] px-2.5 py-0.5 text-[10px] font-bold text-[#06140C]">
                  {i + 1}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.art} alt="" className="mx-auto h-20 w-16 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]" />
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold text-white">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#c4b5fd]/75">{f.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function SeedLadder() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-[#F5F0FF] py-12 text-[#0a0b2e] sm:py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="rounded-[1.75rem] border border-[#2b1b5e]/8 bg-white p-5 shadow-[0_16px_48px_rgba(10,11,46,0.08)] sm:p-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold md:text-3xl">
              Seed <span className="text-accent-gradient">ladder</span>
            </h2>
            <p className="text-sm text-[#2b1b5e]/55">Unlock better candles as you level</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Basic", "basic_3", "Fast & cheap"],
              ["Hybrid", "hybrid_3", "Mid yield"],
              ["Golden", "golden_3", "High glow"],
              ["Diamond Hands", "mythic_3", "Endgame"],
            ].map(([name, art, blurb], i) => (
              <motion.div
                key={name}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-[#2b1b5e]/8 bg-[#F5F0FF] px-3 py-5 text-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/assets/sprites/crops/${art}.png`}
                  alt=""
                  className="mx-auto h-20 w-16 object-contain"
                />
                <p className="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold">
                  {name}
                </p>
                <p className="text-xs text-[#2b1b5e]/55">{blurb}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Community() {
  const socials = [
    { label: "X", href: "https://x.com/PumpFarmer", count: "Follow for seasons", icon: "𝕏" },
  ];

  return (
    <section className="landing-gradient relative overflow-hidden py-14 sm:py-16">
      <CloudBlob className="left-1/4 top-8 h-28 w-52" drift="animate-drift" />
      <CloudBlob className="bottom-16 right-8 h-36 w-64 bg-[#c4b5fd]/12" drift="animate-drift-slow" />
      <div className="relative mx-auto max-w-6xl px-4">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#FFC94D]">
            Community
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-white md:text-4xl">
            Come farm with{" "}
            <span className="text-accent-gradient">people</span>
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md transition hover:bg-white/10"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3DFF7A] text-lg text-[#06140C]">
                {s.icon}
              </span>
              <div className="text-left">
                <p className="font-semibold text-white">{s.label}</p>
                <p className="text-xs text-[#c4b5fd]/70">{s.count}</p>
              </div>
            </a>
          ))}
        </div>

        <div className="no-scrollbar mt-8 flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
          {quotes.map((q) => (
            <blockquote
              key={q.name}
              className="min-w-[260px] shrink-0 rounded-2xl border border-[#2b1b5e]/5 bg-white p-5 text-left shadow-[0_12px_40px_rgba(0,0,0,0.2)] md:min-w-0"
            >
              <div className="mb-3 flex gap-0.5 text-[#FFC94D]" aria-label={`${q.stars} stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < q.stars ? "opacity-100" : "opacity-25"}>
                    ★
                  </span>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-[#0a0b2e]/85">&ldquo;{q.text}&rdquo;</p>
              <footer className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#2b1b5e]/55">
                — {q.name}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="bg-[#F5F0FF] py-14 text-[#0a0b2e] sm:py-16">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2b1b5e]/50">FAQ</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">
            Straight <span className="text-accent-gradient">answers</span>
          </h2>
        </div>
        <div className="space-y-2">
          {faqs.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-[#2b1b5e]/8 bg-white shadow-sm"
              >
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="font-semibold">{item.q}</span>
                  <span className="text-[#3DFF7A]">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <p className="border-t border-[#2b1b5e]/8 px-5 py-4 text-sm leading-relaxed text-[#2b1b5e]/70">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="landing-gradient-deep border-t border-white/10 text-[#f5f0ff]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold">Hood Harvest</p>
          <p className="mt-2 max-w-xs text-sm text-[#c4b5fd]/70">
            Harvest green candles. Literally. A cozy on-chain farm with real fee-sharing seasons.
          </p>
          <div className="mt-4">
            <CopyCA dark />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3DFF7A]">Play</p>
          <ul className="mt-3 space-y-2 text-sm text-[#c4b5fd]/80">
            <li>
              <Link href="/play" className="hover:text-white">
                Farm
              </Link>
            </li>
            <li>
              <Link href="/rewards" className="hover:text-white">
                Rewards / Silo
              </Link>
            </li>
            <li>
              <Link href="/leaderboard" className="hover:text-white">
                Leaderboard
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FFC94D]">Trust</p>
          <ul className="mt-3 space-y-2 text-sm text-[#c4b5fd]/80">
            <li>
              <Link href="/proof" className="hover:text-white">
                Proof
              </Link>
            </li>
            <li>
              <Link href="/docs" className="hover:text-white">
                Docs / Lore
              </Link>
            </li>
            <li>
              <a
                href="https://x.com/PumpFarmer"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white"
              >
                X
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-4 text-center text-[10px] leading-relaxed text-white/30">
        Hood Harvest is entertainment software. Token rewards depend on protocol fees and eligibility
        rules. Not financial advice.
      </p>
    </footer>
  );
}

export function LandingBelowFold() {
  return (
    <div className="relative z-20">
      <StatsRibbon />
      <FarmShowcase />
      <PayoutSplit />
      <HowItWorksPath />
      <SeedLadder />
      <Community />
      <Faq />

      <div className="landing-gradient relative overflow-hidden px-4 py-12">
        <CloudBlob className="left-10 top-4 h-24 w-48" drift="animate-drift" />
        <div className="relative mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[rgba(10,11,46,0.65)] p-8 text-center backdrop-blur-xl sm:p-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/landing/farm-coin-clay.png"
              alt=""
              className="pointer-events-none absolute -right-4 bottom-0 h-36 w-36 opacity-40 object-contain"
            />
            <p className="relative font-[family-name:var(--font-display)] text-3xl font-bold text-white md:text-4xl">
              The Silo is{" "}
              <span className="text-accent-gradient">filling.</span>
            </p>
            <p className="relative mx-auto mt-3 max-w-md text-sm text-[#c4b5fd]/75">
              Free to play. Wallet on Robinhood Chain. No Season Points for sale.
            </p>
            <Link
              href="/play"
              className="relative mt-7 inline-flex cursor-pointer rounded-full bg-[#3DFF7A] px-8 py-3.5 text-sm font-bold text-[#06140C] shadow-[0_0_28px_rgba(61,255,122,0.35)] transition hover:bg-[#2aee6a]"
            >
              Start Farming
            </Link>
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
