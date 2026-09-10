"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Silkscreen, Rubik, JetBrains_Mono } from "next/font/google";
import {
  OPS_RESERVE_PCT,
  PAYOUT_TIER_1_PCT,
  PAYOUT_TIER_1_SHARE,
  PAYOUT_TIER_2_PCT,
  PAYOUT_TIER_2_SHARE,
  PAYOUT_TIER_3_SHARE,
  SEASON_DURATION_DAYS,
  TOKEN_TICKER,
} from "@/lib/game/config";
import { DISCLAIMER } from "@/components/layout/Footer";
import "@/components/landing/landing.css";

const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-landing-display",
  display: "swap",
});

const rubik = Rubik({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-landing-body",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-landing-mono",
  display: "swap",
});

const SECTIONS = [
  { id: "vision", label: "01 · Vision" },
  { id: "loop", label: "02 · Farm loop" },
  { id: "points", label: "03 · Season Points" },
  { id: "silo", label: "04 · Silo & payouts" },
  { id: "chain", label: "05 · Chain" },
  { id: "rules", label: "06 · Rules" },
  { id: "risks", label: "07 · Risks" },
] as const;

const opsPct = Math.round(OPS_RESERVE_PCT * 100);
const t1Pct = Math.round(PAYOUT_TIER_1_PCT * 100);
const t2Pct = Math.round(PAYOUT_TIER_2_PCT * 100);
const t1Share = Math.round(PAYOUT_TIER_1_SHARE * 100);
const t2Share = Math.round(PAYOUT_TIER_2_SHARE * 100);
const t3Share = Math.round(PAYOUT_TIER_3_SHARE * 100);

export function WhitepaperPage() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean,
    ) as HTMLElement[];
    if (!nodes.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.4, 0.7] },
    );
    for (const n of nodes) obs.observe(n);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      className={`pf-landing pf-whitepaper ${silkscreen.variable} ${rubik.variable} ${jetbrains.variable}`}
    >
      <header className="pf-nav sticky top-0 z-50">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-center gap-2" aria-label="Pump Farm home">
            <span className="pf-nav-coin" aria-hidden>
              $
            </span>
            <span className="pf-display text-[13px] text-[var(--nav-cream)]">PUMP FARM</span>
          </Link>
          <nav className="hidden items-center gap-4 sm:flex" aria-label="Docs">
            <Link href="/play" className="pf-nav-link">
              Play
            </Link>
            <Link href="/leaderboard" className="pf-nav-link">
              Ranks
            </Link>
            <Link href="/proof" className="pf-nav-link">
              Proof
            </Link>
          </nav>
          <Link href="/play" className="pf-btn pf-btn-primary !px-3 !py-1.5 text-xs">
            Enter farm
          </Link>
        </div>
      </header>

      {/* Wood plank title — matches in-game WHITEOBAPER sign */}
      <div className="pf-wp-plank" aria-hidden={false}>
        <div className="pf-wp-plank-inner">
          <p className="pf-display text-[clamp(1.1rem,4vw,1.75rem)] tracking-[0.18em] text-[#e8d4a8]">
            WHITEOPAPER
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-10 px-4 pb-20 pt-8 md:grid-cols-[200px_minmax(0,1fr)] md:pt-12">
        <aside className="md:sticky md:top-24 md:self-start">
          <p className="pf-display mb-3 text-[10px] text-[var(--ink-muted)]">CONTENTS</p>
          <nav className="flex flex-row gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0" aria-label="Whitepaper sections">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`pf-wp-toc ${active === s.id ? "is-active" : ""}`}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="pf-wp-paper space-y-12 md:space-y-16">
          <header className="space-y-3 border-b-2 border-[var(--rule)] pb-8">
            <p className="pf-display text-[11px] text-[var(--wood-mid)]">
              PUMP FARM · SEASON RULES
            </p>
            <h1 className="pf-display text-[clamp(1.4rem,3.5vw,2rem)] leading-snug text-[var(--ink)]">
              Grow green candles. Share the Silo.
            </h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--ink-muted)]">
              Pump Farm is a browser farm wrapped around real ${TOKEN_TICKER} trading
              fees. You plant, harvest Season Points, and compete for a weekly pool —
              not for purchased SP.
            </p>
          </header>

          <section id="vision" className="pf-wp-section scroll-mt-28">
            <h2 className="pf-wp-h">01 · Vision</h2>
            <p>
              Most memecoins ask you to hold and hope. Pump Farm asks you to{" "}
              <strong>farm</strong>: a Stardew-style loop where skill, streak, and
              season rank decide how much of the fee Silo you share.
            </p>
            <p>
              ${TOKEN_TICKER} remains a memecoin. The game is entertainment layered on
              transparent fee routing — not a promise of yield.
            </p>
          </section>

          <section id="loop" className="pf-wp-section scroll-mt-28">
            <h2 className="pf-wp-h">02 · Farm loop</h2>
            <ol className="pf-wp-steps">
              <li>
                <span>Connect</span>
                Pick a farmer name, then enter the farm with an EVM wallet.
              </li>
              <li>
                <span>Plant</span>
                Spend Hype on seed tiers. Empty plots wait for your next crop.
              </li>
              <li>
                <span>Grow</span>
                Timers run server-side. Miss the window and blight can cut the harvest.
              </li>
              <li>
                <span>Harvest</span>
                Claim Season Points. Rank climbs. The Silo watches.
              </li>
            </ol>
            <p>
              Hire workers and animals for idle help. Land expands as you level. None of
              that lets you buy Season Points directly.
            </p>
          </section>

          <section id="points" className="pf-wp-section scroll-mt-28">
            <h2 className="pf-wp-h">03 · Season Points</h2>
            <p>Every harvest is recomputed on the server from plot timestamps:</p>
            <div className="pf-wp-formula pf-mono">
              SP = seedBase × stake × streak × goldenHarvest
            </div>
            <ul className="pf-wp-list">
              <li>
                <strong>Seed base</strong> — higher tiers cost more Hype and yield more SP.
              </li>
              <li>
                <strong>Stake multiplier</strong> — optional lock of ${TOKEN_TICKER} for a
                boost (when staking is live).
              </li>
              <li>
                <strong>Streak</strong> — consecutive harvest days stack a bonus.
              </li>
              <li>
                <strong>Golden Harvest</strong> — short windows after sharp price moves.
              </li>
              <li>
                <strong>Blight</strong> — overripe crops can lose up to ~40% of yield.
              </li>
            </ul>
            <p className="text-[13px] text-[var(--ink-muted)]">
              The client never submits SP totals. Forging harvests is not possible.
            </p>
          </section>

          <section id="silo" className="pf-wp-section scroll-mt-28">
            <h2 className="pf-wp-h">04 · Silo &amp; payouts</h2>
            <p>
              Seasons last <strong>{SEASON_DURATION_DAYS} days</strong>. Trading fees that
              accrue to the Silo fund the pot. Before ranks split the pool, an ops reserve
              of <strong>{opsPct}%</strong> is set aside.
            </p>
            <div className="pf-wp-tiers" role="list">
              <div className="pf-wp-tier" role="listitem" style={{ flex: t1Share }}>
                <p className="pf-display text-[10px]">TOP {t1Pct}%</p>
                <p className="pf-mono text-lg font-bold">{t1Share}%</p>
                <p className="text-[11px] opacity-80">of distributable pool</p>
              </div>
              <div className="pf-wp-tier" role="listitem" style={{ flex: t2Share }}>
                <p className="pf-display text-[10px]">NEXT {t2Pct}%</p>
                <p className="pf-mono text-lg font-bold">{t2Share}%</p>
                <p className="text-[11px] opacity-80">of distributable pool</p>
              </div>
              <div className="pf-wp-tier" role="listitem" style={{ flex: t3Share }}>
                <p className="pf-display text-[10px]">REST</p>
                <p className="pf-mono text-lg font-bold">{t3Share}%</p>
                <p className="text-[11px] opacity-80">active farmers</p>
              </div>
            </div>
            <p>
              Inside each tier, share is pro-rata by Season Points. Tied scores stay in the
              higher tier. Sybil-flagged wallets can be excluded. Final amounts settle
              on-chain at season close — projected HUD numbers are estimates only.
            </p>
          </section>

          <section id="chain" className="pf-wp-section scroll-mt-28">
            <h2 className="pf-wp-h">05 · Chain</h2>
            <dl className="pf-wp-dl">
              <div>
                <dt>Network</dt>
                <dd>Robinhood Chain (EVM) · chain ID 4663</dd>
              </div>
              <div>
                <dt>Gas</dt>
                <dd>ETH</dd>
              </div>
              <div>
                <dt>Token</dt>
                <dd>${TOKEN_TICKER} ERC-20 (not SPL)</dd>
              </div>
              <div>
                <dt>Wallets</dt>
                <dd>MetaMask, Phantom (EVM), Rabby, Robinhood Wallet, WalletConnect</dd>
              </div>
            </dl>
            <p>
              Deploying on Robinhood Chain does <strong>not</strong> mean ${TOKEN_TICKER} is
              listed or buyable inside the Robinhood brokerage app.
            </p>
          </section>

          <section id="rules" className="pf-wp-section scroll-mt-28">
            <h2 className="pf-wp-h">06 · Rules of the field</h2>
            <ul className="pf-wp-list">
              <li>One farmer name per wallet — shown on the leaderboard.</li>
              <li>Season Points are earned in-game; they are never sold as a product.</li>
              <li>Proof pages and public stats stay readable without a wallet.</li>
              <li>Ops reserve and payout curve are published before each Season.</li>
              <li>We may pause, patch, or reseat seasons if contracts or feeds fail.</li>
            </ul>
          </section>

          <section id="risks" className="pf-wp-section scroll-mt-28">
            <h2 className="pf-wp-h">07 · Risks</h2>
            <p>
              This is <strong>not</strong> financial advice. ${TOKEN_TICKER} has no
              intrinsic value. Season rewards are entertainment incentives. Smart contracts,
              bridges, wallets, and markets can fail. You can lose everything you spend on
              gas, tokens, or time.
            </p>
            <p className="rounded-none border-2 border-[var(--wood-dark)] bg-[#efe0bc] px-4 py-3 text-[12px] leading-relaxed text-[var(--ink-muted)]">
              {DISCLAIMER}
            </p>
          </section>

          <footer className="flex flex-col items-start gap-4 border-t-2 border-[var(--rule)] pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="pf-display text-[11px] text-[var(--ink-muted)]">
              Ready to plant?
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/play" className="pf-btn pf-btn-primary text-sm">
                Enter the farm
              </Link>
              <Link href="/leaderboard" className="pf-btn pf-btn-secondary text-sm">
                View ranks
              </Link>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
