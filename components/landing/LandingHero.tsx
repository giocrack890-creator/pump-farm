"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { TOKEN_TICKER } from "@/lib/game/config";

/** Inline SVG fallback if hero art is missing. */
function HeroSvgFallback() {
  return (
    <svg
      aria-hidden
      className="h-full w-full"
      viewBox="0 0 1024 704"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <linearGradient id="pf-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8782a" />
          <stop offset="55%" stopColor="#f4c84a" />
          <stop offset="100%" stopColor="#f7e08a" />
        </linearGradient>
      </defs>
      <rect width="1024" height="704" fill="url(#pf-sky)" />
      <circle cx="780" cy="360" r="80" fill="#ffe9a0" />
      <ellipse cx="280" cy="420" rx="220" ry="70" fill="#4f7a32" />
      <ellipse cx="620" cy="450" rx="280" ry="80" fill="#5c8a3a" />
      <rect x="240" y="360" width="70" height="50" fill="#a8433a" />
      <rect x="318" y="340" width="28" height="70" fill="#7a7a7a" />
      <rect x="0" y="520" width="1024" height="184" fill="#d69a2d" />
    </svg>
  );
}

function LogoSvgFallback() {
  return (
    <div className="pf-display text-center text-[clamp(2.5rem,10vw,4.5rem)] leading-[0.95] text-[#c99645] [text-shadow:3px_3px_0_#3a2414]">
      <div>HOOD</div>
      <div>HARVEST</div>
    </div>
  );
}

export function LandingHero({
  heroSrc,
  logoSrc,
}: {
  heroSrc?: string | null;
  logoSrc?: string | null;
}) {
  return (
    <section className="pf-hero">
      <div className="pf-hero-art" aria-hidden>
        {heroSrc ? (
          // Native img — full-bleed cover; Next/Image span can visually "shrink" the art
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroSrc}
            alt=""
            width={1024}
            height={704}
            decoding="async"
            fetchPriority="high"
          />
        ) : (
          <HeroSvgFallback />
        )}
        <div className="pf-hero-fade" />
      </div>

      <div className="pf-hero-content">
        <div className="w-full max-w-[min(92vw,480px)] drop-shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
          {logoSrc ? (
            <Image
              src={logoSrc}
              alt="Hood Harvest"
              width={640}
              height={512}
              priority
              className="mx-auto h-auto w-full object-contain"
            />
          ) : (
            <LogoSvgFallback />
          )}
        </div>

        <div className="mt-5 max-w-xl space-y-2 text-center">
          <p className="text-lg font-bold leading-snug text-[#fff6e4] drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:text-xl">
            You&apos;re not just farming crops. You&apos;re farming the trade fees.
          </p>
          <p className="text-sm font-medium leading-relaxed text-[#fff6e4]/85 drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] sm:text-base">
            A cozy on-chain farm. Harvest Season Points. Share the Silo when the Season closes.
          </p>
        </div>

        <div className="pf-hero-cta flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/play" className="pf-btn pf-btn-primary w-full sm:w-auto">
            Play the Game
          </Link>
          <a href="#contract" className="pf-btn pf-btn-secondary w-full sm:w-auto">
            Buy ${TOKEN_TICKER}
          </a>
        </div>
      </div>

      <a
        href="#intro"
        className="pf-scroll-cue absolute bottom-5 left-1/2 z-10 flex h-10 w-10 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--wood-dark)] bg-[var(--card)]/90 text-[var(--ink)]"
        aria-label="Scroll to intro"
      >
        <ChevronDown className="h-5 w-5" />
      </a>
    </section>
  );
}
