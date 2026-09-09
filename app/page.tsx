"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TOKEN_TICKER, TOKEN_MINT } from "@/lib/game/config";

const features = [
  {
    title: "Plant seeds",
    body: "Drop Pump Seeds into living plots and start a real-time growth loop.",
  },
  {
    title: "Grow your farm",
    body: "Upgrade tiers, stack streaks, and expand your candle crop empire.",
  },
  {
    title: "Earn Season Points",
    body: "Every harvest feeds the weekly leaderboard — no pay-to-win SP.",
  },
  {
    title: `Backed by real $${TOKEN_TICKER} fees`,
    body: "The Silo fills from trading fees. Payouts are on-chain and public.",
  },
] as const;

function CopyCA() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="mx-auto mt-8 inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#c4a574]/35 bg-white/55 px-5 py-2.5 font-mono text-xs text-[#3a2a14] shadow-sm backdrop-blur-md transition hover:bg-white/75"
      onClick={async () => {
        await navigator.clipboard.writeText(TOKEN_MINT);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label="Copy token contract address"
    >
      CA: {TOKEN_MINT.slice(0, 6)}…{TOKEN_MINT.slice(-4)}
      <span className="font-sans font-semibold text-[#c47a2a]">
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

export default function LobbyPage() {
  const reduce = useReducedMotion();

  return (
    <div className="relative min-h-screen text-[#1a1408]">
      {/* ─── HERO ─── */}
      <section className="relative isolate min-h-[100svh] overflow-hidden">
        {/* Full-bleed illustrated farm — the color story */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/hero-farm-bg.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_42%] md:object-center"
          width={1024}
          height={571}
          fetchPriority="high"
        />
        {/* Subtle top scrim for nav only — do not wash out the painting */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-28 bg-gradient-to-b from-black/15 to-transparent"
        />

        {/* Hero copy sits in upper sky negative space */}
        <div className="relative z-10 flex min-h-[100svh] flex-col items-center px-4 pb-24 pt-[7.5rem] text-center sm:pt-32 md:pt-36">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="flex max-w-4xl flex-col items-center"
          >
            <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/55 px-3.5 py-1 text-[11px] font-semibold tracking-wide text-[#3a2a14] shadow-sm backdrop-blur-md sm:text-xs">
              🌱 SEASON 1 · LIVE
            </span>

            <h1 className="font-[family-name:var(--font-display)] text-[clamp(3.25rem,10vw,6rem)] font-bold leading-[0.95] tracking-tight text-[#1a1408] drop-shadow-[0_2px_0_rgba(255,255,255,0.35)]">
              <span className="block">Grow Green Candles.</span>
              <span className="mt-1 block text-[#c47a2a]">Literally.</span>
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-[#3a2a14]/85 sm:text-lg">
              A cozy on-chain farm where harvests earn Season Points — and the Silo pays real $
              {TOKEN_TICKER}.
            </p>

            <div className="mt-8 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
              <Link
                href="/play"
                className="cursor-pointer rounded-full bg-[#1a1408] px-8 py-3.5 text-center text-base font-bold text-[#fff8ee] shadow-[0_12px_32px_rgba(26,20,8,0.35)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#2a1e0c] hover:shadow-[0_16px_40px_rgba(26,20,8,0.4)] active:translate-y-0"
              >
                🌱 Start Farming
              </Link>
              <Link
                href="/docs"
                className="cursor-pointer px-2 py-3 text-center text-base font-semibold text-[#3a2a14]/80 transition hover:text-[#1a1408]"
              >
                Read the Lore →
              </Link>
            </div>
          </motion.div>

          <motion.a
            href="#features"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 0.75 }}
            transition={{ delay: 0.8 }}
            className={`absolute bottom-7 left-1/2 z-20 -translate-x-1/2 cursor-pointer rounded-full border border-white/45 bg-white/40 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#3a2a14] backdrop-blur-md ${
              reduce ? "" : "animate-bounce-soft"
            }`}
          >
            Scroll ↓
          </motion.a>
        </div>

        {/* Harvest toast — frosted glass */}
        <motion.aside
          initial={reduce ? false : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.55, duration: 0.45 }}
          className="absolute right-4 top-[5.5rem] z-30 hidden max-w-[230px] rounded-2xl border border-white/50 bg-white/55 p-3 shadow-[0_12px_40px_rgba(26,20,8,0.18)] backdrop-blur-xl sm:right-6 md:block"
        >
          <div className="flex gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/sprites/crops/basic_3.png"
              alt=""
              className="h-11 w-10 object-contain"
            />
            <div className="text-left">
              <p className="text-xs font-semibold leading-snug text-[#1a1408]">
                First harvest is ready
              </p>
              <Link
                href="/play"
                className="mt-2 inline-block cursor-pointer rounded-full bg-[#c47a2a] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white transition hover:bg-[#a86520]"
              >
                Collect
              </Link>
            </div>
          </div>
        </motion.aside>

        {/* Side utility circles */}
        <div className="absolute right-4 top-[14.5rem] z-30 hidden flex-col gap-2 md:flex">
          <Link
            href="/play"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/50 bg-white/55 text-lg shadow-md backdrop-blur-md transition hover:bg-white/75"
            aria-label="Open farm"
            title="Farm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/icons/shop.png" alt="" className="h-6 w-6 object-contain" />
          </Link>
          <Link
            href="/docs"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/50 bg-white/55 shadow-md backdrop-blur-md transition hover:bg-white/75"
            aria-label="Lore"
            title="Lore"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/icons/almanac.png" alt="" className="h-6 w-6 object-contain" />
          </Link>
        </div>
      </section>

      {/* ─── Below the fold — warm frosted system ─── */}
      <section
        id="features"
        className="relative bg-[linear-gradient(180deg,#f3e6c8_0%,#e8d4a8_40%,#d4c49a_100%)] px-4 py-20 md:py-28"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 20% 0%, rgba(255,200,120,0.45), transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(120,160,90,0.25), transparent 45%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl">
          <div className="mb-10 flex items-end justify-between gap-4">
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-[#1a1408] md:text-4xl">
              How the farm works
            </h2>
            <Link
              href="/play"
              className="hidden cursor-pointer text-sm font-semibold text-[#c47a2a] transition hover:text-[#a86520] sm:inline"
            >
              Jump in →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.article
                key={f.title}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="rounded-[1.5rem] border border-white/60 bg-white/50 p-6 shadow-[0_8px_32px_rgba(26,20,8,0.08)] backdrop-blur-md"
              >
                <h3 className="font-[family-name:var(--font-display)] text-xl text-[#1a1408]">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#3a2a14]/75">{f.body}</p>
              </motion.article>
            ))}
          </div>

          <CopyCA />

          <div className="mx-auto mt-16 max-w-2xl rounded-[2rem] border border-white/60 bg-white/45 px-8 py-12 text-center shadow-[0_12px_40px_rgba(26,20,8,0.1)] backdrop-blur-md">
            <p className="font-[family-name:var(--font-display)] text-3xl text-[#1a1408] md:text-4xl">
              The Silo is filling.
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm text-[#3a2a14]/70">
              Free to play. Wallet on Robinhood Chain. No Season Points for sale.
            </p>
            <Link
              href="/play"
              className="mt-7 inline-flex cursor-pointer rounded-full bg-[#c47a2a] px-8 py-3.5 text-sm font-bold text-white shadow-[0_10px_28px_rgba(196,122,42,0.35)] transition hover:-translate-y-0.5 hover:bg-[#a86520]"
            >
              Start Farming
            </Link>
          </div>

          <p className="mx-auto mt-12 max-w-xl text-center text-[11px] leading-relaxed text-[#3a2a14]/45">
            Pump Farm is entertainment software. Token rewards depend on protocol fees and
            eligibility rules. Not financial advice. Dig into{" "}
            <Link href="/docs" className="underline hover:text-[#3a2a14]/70">
              Docs
            </Link>{" "}
            and{" "}
            <Link href="/proof" className="underline hover:text-[#3a2a14]/70">
              Proof
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
