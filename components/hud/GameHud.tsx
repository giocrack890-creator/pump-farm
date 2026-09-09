"use client";

import { motion } from "framer-motion";
import { Share2, Volume2, VolumeX, Camera, Menu } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { useXpBar } from "@/store/usePlayerStore";

function ArtIcon({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className ?? "h-7 w-7 object-contain"} draggable={false} />
  );
}

export function TopHud({
  sp,
  hype,
  seasonLabel,
}: {
  sp: number;
  hype: number;
  seasonLabel: string;
}) {
  const { level, current, next, ratio } = useXpBar();
  const name = "Farmer";

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 md:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-[#0B0F0E]/75 py-1.5 pl-1.5 pr-4 shadow-lg backdrop-blur-md">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#3DFF7A]/40 to-[#1FCF63]/20 ring-2 ring-white/20">
              <ArtIcon
                src="/assets/sprites/companions/hype_hound.png"
                alt=""
                className="h-10 w-10 object-contain"
              />
            </div>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[#FFC94D] px-1.5 text-[10px] font-bold text-[#1A1200] shadow">
              {level}
            </span>
          </div>
          <div className="min-w-[110px]">
            <p className="text-xs font-semibold text-white">{name}</p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/15">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#3DFF7A] to-[#FFC94D]"
                animate={{ width: `${ratio * 100}%` }}
              />
            </div>
            <p className="mt-0.5 text-[10px] tabular-nums text-white/50">
              {formatNumber(current, 0)} / {formatNumber(next, 0)} XP
            </p>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <CurrencyPill
            iconSrc="/assets/icons/sp.png"
            value={formatNumber(sp, 1)}
            label="SP"
            tone="gold"
          />
          <CurrencyPill
            iconSrc="/assets/icons/hype.png"
            value={formatNumber(hype, 0)}
            label="Hype"
            tone="green"
          />
        </div>
      </div>

      <div className="pointer-events-auto mx-auto mt-3 max-w-md">
        <div className="rounded-2xl border border-white/10 bg-[#0B0F0E]/7 px-4 py-2 text-center text-sm text-white/80 shadow backdrop-blur">
          {seasonLabel}
        </div>
      </div>
    </div>
  );
}

function CurrencyPill({
  iconSrc,
  value,
  label,
  tone,
}: {
  iconSrc: string;
  value: string;
  label: string;
  tone: "gold" | "green";
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-lg backdrop-blur-md ${
        tone === "gold"
          ? "border-[#FFC94D]/30 bg-[#1a1408]/8"
          : "border-[#3DFF7A]/30 bg-[#08140c]/8"
      }`}
    >
      <ArtIcon src={iconSrc} alt="" className="h-6 w-6 object-contain" />
      <span className="tabular-nums text-sm font-bold text-white">{value}</span>
      <span className="text-[10px] uppercase text-white/45">{label}</span>
    </div>
  );
}

export function LeftIconColumn({
  muted,
  onToggleMute,
  onShare,
  onMenu,
}: {
  muted: boolean;
  onToggleMute: () => void;
  onShare: () => void;
  onMenu: () => void;
}) {
  const btn =
    "pointer-events-auto flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-[#0B0F0E]/75 text-white shadow-lg backdrop-blur hover:bg-white/10";
  return (
    <div className="absolute left-3 top-28 z-20 flex flex-col gap-2 md:left-4">
      <button type="button" className={btn} aria-label="Share" onClick={onShare}>
        <Share2 className="h-4 w-4" />
      </button>
      <button type="button" className={btn} aria-label="Toggle sound" onClick={onToggleMute}>
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-[#3DFF7A]" />}
      </button>
      <button
        type="button"
        className={btn}
        aria-label="Screenshot"
        onClick={() => alert("Screenshot: use your OS capture for now")}
      >
        <Camera className="h-4 w-4" />
      </button>
      <button type="button" className={btn} aria-label="Menu" onClick={onMenu}>
        <Menu className="h-4 w-4" />
      </button>
    </div>
  );
}

export function BottomNav({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  const tabs = [
    { id: "silo", label: "Silo", icon: "/assets/icons/silo.png" },
    { id: "shop", label: "Shop", icon: "/assets/icons/shop.png" },
    { id: "companion", label: "Pets", icon: "/assets/icons/companion.png" },
    { id: "almanac", label: "Almanac", icon: "/assets/icons/almanac.png" },
    { id: "decorate", label: "Decor", icon: "/assets/icons/decorate.png" },
    { id: "friends", label: "Friends", icon: "/assets/icons/friends.png" },
  ];
  return (
    <nav className="pointer-events-auto absolute inset-x-3 bottom-3 z-20 mx-auto max-w-lg rounded-3xl border border-white/10 bg-[#0B0F0E]/8 px-2 py-2 shadow-2xl backdrop-blur-xl md:inset-x-auto">
      <ul className="flex items-center justify-between gap-1">
        {tabs.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onSelect(t.id)}
              className={`flex w-[52px] cursor-pointer flex-col items-center rounded-2xl px-1 py-1.5 text-[10px] ${
                active === t.id ? "bg-white/10 text-[#3DFF7A]" : "text-white/60"
              }`}
            >
              <ArtIcon src={t.icon} alt="" className="mb-0.5 h-8 w-8 object-contain" />
              {t.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function QuestTicket({ text, progress }: { text: string; progress: string }) {
  return (
    <div className="pointer-events-auto absolute bottom-24 left-3 z-20 max-w-[200px] rounded-2xl border border-white/10 bg-[#0B0F0E]/8 p-3 shadow-lg backdrop-blur md:left-4">
      <div className="flex items-start gap-2">
        <ArtIcon src="/assets/icons/almanac.png" alt="" className="h-8 w-8 object-contain" />
        <div>
          <p className="text-xs font-semibold text-white">{text}</p>
          <p className="mt-1 text-[11px] tabular-nums text-[#3DFF7A]">{progress}</p>
        </div>
      </div>
    </div>
  );
}

export function ShortcutIcons({
  onRewards,
  onLeaderboard,
}: {
  onRewards: () => void;
  onLeaderboard: () => void;
}) {
  const item =
    "pointer-events-auto flex w-14 cursor-pointer flex-col items-center gap-1 rounded-2xl border border-white/10 bg-[#0B0F0E]/7 p-2 text-[10px] text-white/70 shadow backdrop-blur";
  return (
    <div className="absolute right-3 top-36 z-20 flex flex-col gap-2 md:right-4">
      <button type="button" className={item} onClick={onRewards}>
        <span className="relative">
          <ArtIcon src="/assets/icons/rewards.png" alt="" className="h-8 w-8 object-contain" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#FF4D4D]" />
        </span>
        Rewards
      </button>
      <button type="button" className={item} onClick={onLeaderboard}>
        <ArtIcon src="/assets/icons/ranks.png" alt="" className="h-8 w-8 object-contain" />
        Ranks
      </button>
    </div>
  );
}

export function LevelUpOverlay({
  level,
  onDone,
}: {
  level: number;
  onDone: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[70] flex cursor-pointer items-center justify-center bg-black/50"
      onClick={onDone}
    >
      <motion.div
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        className="rounded-3xl border border-[#FFC94D]/40 bg-[#0B0F0E] px-10 py-8 text-center shadow-2xl"
      >
        <p className="text-sm uppercase tracking-widest text-[#FFC94D]">Level Up!</p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-5xl text-white">{level}</p>
        <p className="mt-2 text-sm text-white/55">New farm powers unlocked</p>
      </motion.div>
    </motion.div>
  );
}
