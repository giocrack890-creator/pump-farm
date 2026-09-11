"use client";

import Link from "next/link";
import {
  PAYOUT_TIER_1_PCT,
  PAYOUT_TIER_1_SHARE,
  PAYOUT_TIER_2_PCT,
  PAYOUT_TIER_2_SHARE,
  PAYOUT_TIER_3_SHARE,
  TOKEN_TICKER,
} from "@/lib/game/config";
import { PixelIcon, PixelMedallion, type PixelIconId } from "@/components/landing/PixelIcon";

const HOW: {
  title: string;
  body: string;
  icon: PixelIconId;
  seeds?: PixelIconId[];
}[] = [
  {
    title: "Plant",
    body: "Spend Hype on seeds, drop them into tilled plots, and start a real-time growth timer.",
    icon: "seed_basic",
    seeds: ["seed_basic", "seed_hybrid", "seed_golden", "seed_mythic"],
  },
  {
    title: "Harvest",
    body: "Tap ready crops for Season Points (SP). Streaks and better seeds stack your score.",
    icon: "crop_wheat_4",
  },
  {
    title: "Climb",
    body: "SP ranks you on the Season board. Hire workers to auto-harvest while you're away.",
    icon: "rank_gold",
  },
  {
    title: "Share the Silo",
    body: `Every $${TOKEN_TICKER} trade fee feeds the Silo. When the Season closes, the pot splits by rank.`,
    icon: "building_silo",
  },
];

const TOKENOMICS_ROWS: { label: string; note: string; icon: PixelIconId }[] = [
  {
    label: "Trade fees → Silo",
    note: "Fund the Season pot (on-chain treasury)",
    icon: "coin_farm",
  },
  {
    label: `Top ${PAYOUT_TIER_1_PCT * 100}% farmers`,
    note: `${Math.round(PAYOUT_TIER_1_SHARE * 100)}% of distributable pot`,
    icon: "rank_gold",
  },
  {
    label: `Next ${PAYOUT_TIER_2_PCT * 100}%`,
    note: `${Math.round(PAYOUT_TIER_2_SHARE * 100)}% of distributable pot`,
    icon: "rank_silver",
  },
  {
    label: "Active rest",
    note: `${Math.round(PAYOUT_TIER_3_SHARE * 100)}% of distributable pot`,
    icon: "rank_bronze",
  },
  {
    label: "Season Points",
    note: "Earned only by playing — never sold",
    icon: "xp_star",
  },
];

const ROADMAP: {
  phase: string;
  title: string;
  items: readonly string[];
  icon: PixelIconId;
  status: PixelIconId;
  statusLabel: string;
}[] = [
  {
    phase: "Season 0",
    title: "Farm opens",
    items: ["Plant / harvest loop", "Silo fee pot live", "Public demo on /play"],
    icon: "building_farmhouse",
    status: "status_check",
    statusLabel: "Live",
  },
  {
    phase: "Season 1",
    title: "Token launch",
    items: ["$HOOD ERC-20 + CA", "DEX chart wired", "First on-chain payout"],
    icon: "coin_farm",
    status: "status_clock",
    statusLabel: "Soon",
  },
  {
    phase: "Later",
    title: "Expand the land",
    items: ["More crops & workers", "Cross-season XP prestige", "Mobile polish"],
    icon: "building_greenhouse",
    status: "status_lock",
    statusLabel: "Locked",
  },
];

const FAQ = [
  {
    q: "Is this free to play?",
    a: "Yes. Claim daily Hype, plant, and harvest. Season Points are earned in-game — never purchased.",
  },
  {
    q: "How do Silo payouts work?",
    a: `At Season close the fee pot splits ${Math.round(PAYOUT_TIER_1_SHARE * 100)}% / ${Math.round(PAYOUT_TIER_2_SHARE * 100)}% / ${Math.round(PAYOUT_TIER_3_SHARE * 100)}% across Top ${PAYOUT_TIER_1_PCT * 100}% / Next ${PAYOUT_TIER_2_PCT * 100}% / active rest, pro-rata by SP.`,
  },
  {
    q: `Is $${TOKEN_TICKER} safe?`,
    a: "Treat every memecoin as high risk. Payout math is open-source. Nothing here is financial advice.",
  },
  {
    q: "Can I buy Season Points?",
    a: "No. SP cannot be purchased. That is intentional anti-pay-to-win design.",
  },
] as const;

export function LandingContent() {
  return (
    <div className="relative flex flex-col gap-12 pb-8">
      <span className="pf-ambient pf-ambient-a" aria-hidden>
        <PixelIcon id="animal_chicken" size={28} />
      </span>
      <span className="pf-ambient pf-ambient-b" aria-hidden>
        <PixelIcon id="crop_wheat_1" size={24} />
      </span>
      <span className="pf-ambient pf-ambient-c" aria-hidden>
        <PixelIcon id="status_flame" size={22} />
      </span>

      <section id="how" className="scroll-mt-20">
        <h2 className="pf-display text-lg text-[var(--wood-dark)]">How it works</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--ink-muted)]">
          Four steps. No pay-to-win SP. The Silo is the real prize.
        </p>
        <ol className="mt-6 space-y-4">
          {HOW.map((step) => (
            <li key={step.title} className="pf-card flex gap-4 p-4">
              <PixelMedallion id={step.icon} size={28} />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-[var(--ink)]">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">{step.body}</p>
                {step.seeds ? (
                  <div className="mt-2 flex items-center gap-1.5" aria-hidden>
                    {step.seeds.map((sid) => (
                      <span key={sid} className="pf-seed-chip">
                        <PixelIcon id={sid} size={18} />
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="tokenomics" className="scroll-mt-20">
        <p className="pf-display text-[11px] tracking-wide text-[var(--wood-mid)]">TOKENOMICS</p>
        <h2 className="pf-display mt-1 text-lg text-[var(--wood-dark)]">
          Where the payout comes from
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          How the Silo fills and how rank splits the pot — full CA numbers land with the ERC-20
          launch.
        </p>
        <div className="pf-card mt-4 overflow-hidden p-2">
          <ul className="flex flex-col gap-1.5">
            {TOKENOMICS_ROWS.map((row) => (
              <li key={row.label} className="pf-chrome-row">
                <span className="pf-chrome-slot" aria-hidden>
                  <PixelIcon id={row.icon} size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--ink)]">{row.label}</p>
                  <p className="text-[13px] leading-snug text-[var(--ink-muted)]">{row.note}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="roadmap" className="scroll-mt-20">
        <h2 className="pf-display text-lg text-[var(--wood-dark)]">Roadmap</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {ROADMAP.map((r) => (
            <article key={r.phase} className="pf-card relative overflow-hidden p-4">
              <div className="pf-status-ribbon" title={r.statusLabel}>
                <PixelIcon id={r.status} size={14} />
                <span>{r.statusLabel}</span>
              </div>
              <div className="mt-1 flex items-start gap-2">
                <span className="pf-chrome-slot !h-10 !w-10" aria-hidden>
                  <PixelIcon id={r.icon} size={26} />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]">
                    {r.phase}
                  </p>
                  <h3 className="mt-0.5 text-base font-bold">{r.title}</h3>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-[13px] text-[var(--ink-muted)]">
                {r.items.map((item) => (
                  <li key={item} className="flex gap-1.5">
                    <span className="mt-0.5 shrink-0 text-[var(--gold)]" aria-hidden>
                      ·
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="pf-card overflow-hidden border-[var(--wood-mid)] bg-[linear-gradient(135deg,#efe0bc_0%,#f6ecd4_50%,#e8d09a_100%)] p-6 text-center sm:p-8">
        <h2 className="pf-display text-xl text-[var(--wood-dark)]">Ready to till?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--ink-muted)]">
          Jump into the demo farm — plant a turnip, bank SP, and watch the Silo meter.
        </p>
        <Link href="/play" className="pf-btn pf-btn-primary mt-5">
          Play the Game
        </Link>
      </section>

      <section id="faq" className="scroll-mt-20">
        <h2 className="pf-display text-lg text-[var(--wood-dark)]">FAQ</h2>
        <div className="mt-4 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="pf-card group open:shadow-md">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-[var(--ink)] marker:content-none">
                <span className="flex items-center justify-between gap-3">
                  {f.q}
                  <span className="text-[var(--ink-muted)] group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="border-t border-[var(--rule)] px-4 py-3 text-sm leading-relaxed text-[var(--ink-muted)]">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
