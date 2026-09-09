"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { TOKEN_MINT, TOKEN_TICKER } from "@/lib/game/config";
import { useState } from "react";

const features = [
  { title: "Plant seeds", body: "Drop Pump Seeds into your plots and start a real-time growth loop." },
  { title: "Grow your farm", body: "Upgrade tiers, stack streaks, and expand your candle crop empire." },
  { title: "Earn Season Points", body: "Every harvest feeds the weekly leaderboard — no pay-to-win SP." },
  { title: `Backed by real $${TOKEN_TICKER} fees`, body: "The Silo fills from trading fees. Payouts are on-chain and public." },
];

function CopyCA() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 font-mono text-xs text-white/70 hover:border-[#3DFF7A]/40"
      onClick={async () => {
        await navigator.clipboard.writeText(TOKEN_MINT);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label="Copy token contract address"
    >
      CA: {TOKEN_MINT.slice(0, 6)}…{TOKEN_MINT.slice(-4)}
      <span className="text-[#3DFF7A]">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

export default function LobbyPage() {
  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-20">
      <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-8">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-[family-name:var(--font-display)] text-4xl leading-tight text-white sm:text-5xl lg:text-6xl"
          >
            Grow Green Candles.{" "}
            <span className="text-[#3DFF7A]">Literally.</span>
          </motion.h1>
          <p className="mt-4 max-w-xl text-base text-white/65 sm:text-lg">
            Pump Farm is a real farming game where every harvest earns Season Points — and real $
            {TOKEN_TICKER} rewards for the biggest farms each week.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/play"
              className="rounded-2xl bg-gradient-to-b from-[#3DFF7A] to-[#1FCF63] px-6 py-3 text-base font-bold text-[#06140C] shadow-[0_0_30px_rgba(61,255,122,0.4)]"
            >
              🌱 Start Farming
            </Link>
            <CopyCA />
          </div>
          <p className="mt-3 text-sm text-white/40">Free to play · Wallet required · No SP for sale</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 120 }}
          className="relative"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/farm-island.svg"
            alt="Isometric floating Pump Farm island with candlestick beanstalk"
            className="animate-float mx-auto w-full max-w-lg drop-shadow-[0_20px_60px_rgba(61,255,122,0.25)]"
          />
        </motion.div>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
          >
            <Card className="h-full">
              <h3 className="font-[family-name:var(--font-display)] text-lg text-[#3DFF7A]">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-white/55">{f.body}</p>
            </Card>
          </motion.div>
        ))}
      </section>

      <a
        href="https://x.com"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 left-6 z-40 rounded-full border border-white/10 bg-[#0B0F0E]/90 px-4 py-2 text-sm text-white/80 shadow-lg backdrop-blur hover:border-[#3DFF7A]/40"
      >
        Follow us on X
      </a>
    </div>
  );
}
