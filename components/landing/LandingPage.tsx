"use client";

import { useQuery } from "@tanstack/react-query";
import { Silkscreen, Rubik, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingSidebar } from "@/components/landing/LandingSidebar";
import { LandingContent } from "@/components/landing/LandingContent";
import { PixelIcon } from "@/components/landing/PixelIcon";
import { DISCLAIMER } from "@/components/layout/Footer";
import { TOKEN_TICKER } from "@/lib/game/config";
import "./landing.css";

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

type SeasonCurrent = {
  season: { number: number };
};

export function LandingPage({
  heroSrc,
  logoSrc,
}: {
  heroSrc: string | null;
  logoSrc: string | null;
}) {
  const seasonQ = useQuery({
    queryKey: ["season-current-intro"],
    queryFn: async () => {
      const res = await fetch("/api/season/current");
      if (!res.ok) throw new Error("season");
      return (await res.json()) as SeasonCurrent;
    },
    staleTime: 30_000,
  });

  const seasonN = seasonQ.data?.season.number ?? 1;

  return (
    <div
      className={`pf-landing ${silkscreen.variable} ${rubik.variable} ${jetbrains.variable}`}
    >
      <LandingNav />
      <LandingHero heroSrc={heroSrc} logoSrc={logoSrc} />

      <section
        id="why"
        className="scroll-mt-20 border-b border-[var(--rule)] bg-[var(--parchment)]"
        aria-labelledby="why-play-heading"
      >
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
          <p className="pf-display text-[11px] tracking-wide text-[var(--wood-mid)]">WHY PLAY</p>
          <h2
            id="why-play-heading"
            className="mt-1 max-w-2xl text-2xl font-bold leading-snug text-[var(--ink)] sm:text-3xl"
          >
            Every trade on ${TOKEN_TICKER} fills a pot. Your rank decides your cut.
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {(
              [
                {
                  icon: "coin_farm" as const,
                  title: "Trade fees fund it",
                  body: `Every $${TOKEN_TICKER} trade sends a cut straight into the Silo. Not a promise — an on-chain pot, filling in real time.`,
                },
                {
                  icon: "rank_gold" as const,
                  title: "Your rank decides your cut",
                  body: "Top 1% take 50%. Next 9% take 30%. Everyone active splits the rest. No rank, no payout.",
                },
                {
                  icon: "building_silo" as const,
                  title: "No hidden treasury theater",
                  body: "No SP for sale. No pre-mine payout. Just the real fee pot, split by how you actually played.",
                },
              ] as const
            ).map((col) => (
              <li key={col.title} className="pf-card flex flex-col gap-3 p-4">
                <span className="pf-chrome-slot !h-11 !w-11" aria-hidden>
                  <PixelIcon id={col.icon} size={26} />
                </span>
                <h3 className="text-base font-bold text-[var(--ink)]">{col.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{col.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="intro" className="scroll-mt-20 border-b border-[var(--rule)] bg-[var(--cream)]">
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-12">
          <span className="pf-ambient pf-ambient-intro" aria-hidden>
            <PixelIcon id="crop_wheat_1" size={20} />
          </span>
          <p className="pf-season-eyebrow">
            <span className="pf-live-dot" aria-hidden />
            <PixelIcon id="status_flame" size={14} />
            <span>
              Season {seasonN} is live
            </span>
          </p>
          <h2 className="mt-2 max-w-2xl text-2xl font-bold leading-snug text-[var(--ink)] sm:text-3xl">
            Farm green candles. Cash Season Points into the Silo.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-muted)]">
            Hood Harvest is a cozy on-chain farming game. You plant, harvest, and earn Season Points
            (SP). A cut of every ${TOKEN_TICKER} trade fee fills the Silo — and when the Season
            closes, that pot pays out by rank. No SP for sale. No hidden treasury theater.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 min-[900px]:grid-cols-[minmax(0,1fr)_336px] min-[900px]:items-start">
        {/* Mobile / <900px: sidebar first */}
        <div className="order-1 min-[900px]:order-2 min-[900px]:sticky min-[900px]:top-20">
          <LandingSidebar />
        </div>
        <div className="order-2 min-[900px]:order-1">
          <LandingContent />
        </div>
      </div>

      <footer className="border-t border-[var(--rule)] bg-[var(--parchment)] px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="pf-footer-coin" aria-hidden>
                <PixelIcon id="coin_farm" size={18} />
              </span>
              <p className="pf-display text-sm text-[var(--wood-dark)]">HOOD HARVEST</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm font-semibold text-[var(--ink-muted)]">
              <Link href="/docs" className="hover:text-[var(--ink)]">
                Docs
              </Link>
              <Link href="/docs" className="hover:text-[var(--ink)]">
                Privacy
              </Link>
              <Link href="/docs" className="hover:text-[var(--ink)]">
                Terms
              </Link>
              <Link href="/play" className="hover:text-[var(--ink)]">
                Play
              </Link>
            </div>
          </div>
          <p className="max-w-3xl text-[11px] leading-relaxed text-[var(--ink-muted)]">
            {DISCLAIMER}
          </p>
        </div>
      </footer>
    </div>
  );
}
