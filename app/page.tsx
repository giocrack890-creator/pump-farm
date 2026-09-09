"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { TOKEN_TICKER } from "@/lib/game/config";
import { LandingBelowFold } from "@/components/landing/LandingBelowFold";

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

export default function LobbyPage() {
  const reduce = useReducedMotion();

  return (
    <div className="relative min-h-screen text-[#f5f0ff]">
      {/* ─── HERO ─── */}
      <section className="landing-gradient relative isolate min-h-[100svh] overflow-hidden">
        <CloudBlob className="-left-16 top-24 h-40 w-72" drift="animate-drift" />
        <CloudBlob className="right-[-4rem] top-40 h-48 w-80 bg-[#c4b5fd]/15" drift="animate-drift-slow" />
        <CloudBlob className="bottom-32 left-1/3 h-28 w-56 bg-white/8" drift="animate-drift" />

        <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-6xl items-center gap-10 px-4 pb-28 pt-[8.5rem] sm:pt-36 md:grid-cols-[1.05fr_0.95fr] md:gap-8 md:pb-20 md:pt-32">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center md:items-start md:text-left"
          >
            <span className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-[#3DFF7A]/35 bg-[#3DFF7A]/10 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-[#3DFF7A] sm:mb-7 sm:text-xs">
              🌱 SEASON 1 · LIVE
            </span>

            <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.75rem,8.5vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-white">
              <span className="block">Grow Green</span>
              <span className="mt-1 block text-accent-gradient">Candles.</span>
              <span className="mt-1 block text-white/90">Literally.</span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-[#c4b5fd]/90 sm:mt-7 sm:text-lg">
              A cozy on-chain farm where harvests earn Season Points — and the Silo pays real $
              {TOKEN_TICKER}.
            </p>

            <div className="mt-9 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:items-center md:justify-start">
              <Link
                href="/play"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#3DFF7A] px-7 py-3.5 text-base font-bold leading-none text-[#06140C] shadow-[0_0_32px_rgba(61,255,122,0.35)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#2aee6a] sm:px-8"
              >
                <span aria-hidden className="text-lg leading-none">
                  🌱
                </span>
                Start Farming
              </Link>
              <Link
                href="/docs"
                className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/40 bg-transparent px-7 py-3.5 text-base font-semibold text-white transition hover:border-white hover:bg-white/5 sm:px-8"
              >
                Read the Lore →
              </Link>
            </div>
          </motion.div>

          {/* Coin + chart composition */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="relative mx-auto flex w-full max-w-lg flex-col items-center md:max-w-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/landing/farm-platform-clay.png"
              alt=""
              className={`absolute -bottom-6 left-1/2 z-0 w-[92%] max-w-md -translate-x-1/2 opacity-90 ${
                reduce ? "" : "animate-float-slow"
              }`}
            />

            <div className="relative z-10 mb-4 w-[88%] max-w-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/landing/farm-chart-panel.png"
                alt={`Stylized $${TOKEN_TICKER} candlestick chart trending up`}
                className="w-full rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
              />
              {!reduce && (
                <svg
                  aria-hidden
                  className="pointer-events-none absolute inset-x-[12%] bottom-[28%] h-10 w-[76%]"
                  viewBox="0 0 200 40"
                  fill="none"
                >
                  <path
                    d="M0 32 C40 28 50 18 80 16 C110 14 120 8 150 6 C170 5 185 4 200 2"
                    stroke="#3DFF7A"
                    strokeWidth="2.5"
                    className="animate-draw-line"
                    style={{ filter: "drop-shadow(0 0 6px #3DFF7A)" }}
                  />
                </svg>
              )}
            </div>

            <div className={`relative z-20 -mt-8 ${reduce ? "" : "animate-float"}`}>
              <div className="absolute inset-0 rounded-full bg-[#FFC94D]/25 blur-3xl" />
              {!reduce && (
                <>
                  <span className="animate-sparkle absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-[#FFC94D]" />
                  <span className="animate-sparkle-2 absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-[#3DFF7A]" />
                </>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/landing/farm-coin-clay.png"
                alt={`$${TOKEN_TICKER} coin`}
                className="relative h-40 w-40 object-contain drop-shadow-[0_0_40px_rgba(255,201,77,0.45)] sm:h-48 sm:w-48"
              />
            </div>
          </motion.div>
        </div>

        <motion.a
          href="#features"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 0.75 }}
          transition={{ delay: 0.8 }}
          className={`absolute bottom-8 left-1/2 z-20 -translate-x-1/2 cursor-pointer rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur-md ${
            reduce ? "" : "animate-bounce-soft"
          }`}
        >
          Scroll ↓
        </motion.a>
      </section>

      <LandingBelowFold />
    </div>
  );
}
