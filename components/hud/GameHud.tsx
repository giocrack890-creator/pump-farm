"use client";

import { motion } from "framer-motion";
import { formatNumber } from "@/lib/utils";
import { useXpBar } from "@/store/usePlayerStore";
import { nextUnlockLabel, unlocksAtLevel } from "@/lib/game/xp";
import { BARN_MILESTONE_LABELS, barnVisualFromLevel } from "@/lib/game/barnVisual";
import { HUD } from "@/components/hud/hudAssets";

/** Chunky pixel-panel frame (Sprout Lands–adjacent wood chrome). */
const panel =
  "pointer-events-auto border-[3px] border-[#3a2414] bg-[#c4a06a] shadow-[4px_4px_0_#1a1008] [image-rendering:pixelated]";
const panelDark =
  "pointer-events-auto border-[3px] border-[#2a1810] bg-[#5c3d24] shadow-[4px_4px_0_#140c08] [image-rendering:pixelated]";
const ink = "font-[family-name:var(--font-pixel)] tracking-tight text-[#1a1008]";
const inkLight = "font-[family-name:var(--font-pixel)] tracking-tight text-[#fff8e8]";

function ArtIcon({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`${className ?? "h-7 w-7"} object-contain [image-rendering:pixelated]`}
      draggable={false}
    />
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
  const nextUnlock = nextUnlockLabel(level);
  const barnLabel = BARN_MILESTONE_LABELS[barnVisualFromLevel(level)];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 md:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className={`${panel} flex items-center gap-2 py-1.5 pl-1.5 pr-3`} title={nextUnlock}>
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden border-[3px] border-[#3a2414] bg-[#8f6b3e]">
              <ArtIcon src="/assets/sprites/companions/pet.png" alt="" className="h-10 w-10" />
            </div>
            <span
              className={`absolute -bottom-1 left-1/2 -translate-x-1/2 border-2 border-[#3a2414] bg-[#ffc94d] px-1.5 text-[9px] font-bold ${ink}`}
            >
              {level}
            </span>
          </div>
          <div className="min-w-[140px] max-w-[200px]">
            <p className={`text-[11px] ${ink}`}>{name}</p>
            <div className="mt-1 h-3 overflow-hidden border-2 border-[#3a2414] bg-[#3a2414]">
              <motion.div
                className="h-full bg-[#3dff7a]"
                animate={{ width: `${ratio * 100}%` }}
              />
            </div>
            <p className={`mt-0.5 text-[8px] tabular-nums text-[#3a2414]/70`}>
              {formatNumber(current, 0)}/{formatNumber(next, 0)} XP — next: {nextUnlock}
            </p>
            <p className="mt-0.5 truncate text-[7px] text-[#3a2414]/55">{barnLabel}</p>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <CurrencyPill
            iconSrc="/assets/sprites/ui/farm_coin.png"
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

      <div className="mx-auto mt-3 max-w-md">
        <div className={`${panelDark} px-3 py-2 text-center`}>
          <p className={`text-[10px] leading-snug ${inkLight}`}>{seasonLabel}</p>
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
      className={`flex items-center gap-2 border-[3px] px-2.5 py-1 shadow-[3px_3px_0_#1a1008] [image-rendering:pixelated] ${
        tone === "gold"
          ? "border-[#8a5a10] bg-[#ffe08a]"
          : "border-[#1a5c30] bg-[#9dffb8]"
      }`}
    >
      <ArtIcon src={iconSrc} alt="" className="h-5 w-5" />
      <span className={`text-[11px] tabular-nums ${ink}`}>{value}</span>
      <span className={`text-[8px] uppercase text-[#3a2414]/60`}>{label}</span>
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
    "pointer-events-auto relative flex h-12 w-12 cursor-pointer items-center justify-center hover:brightness-110";
  return (
    <div className="absolute left-3 top-28 z-20 flex flex-col gap-2 md:left-4">
      {(
        [
          { label: "Share", onClick: onShare, icon: HUD.share },
          {
            label: "Toggle sound",
            onClick: onToggleMute,
            icon: muted ? HUD.soundOff : HUD.soundOn,
          },
          {
            label: "Screenshot",
            onClick: () => alert("Screenshot: use your OS capture for now"),
            icon: HUD.camera,
          },
          { label: "Menu", onClick: onMenu, icon: HUD.settings },
        ] as const
      ).map((b) => (
        <button key={b.label} type="button" className={btn} aria-label={b.label} onClick={b.onClick}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HUD.navFrame}
            alt=""
            className="absolute inset-0 h-full w-full object-fill [image-rendering:pixelated]"
            draggable={false}
          />
          <ArtIcon src={b.icon} alt="" className="relative z-10 h-7 w-7" />
        </button>
      ))}
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
    { id: "silo", label: "Premios", icon: HUD.silo },
    { id: "shop", label: "Shop", icon: HUD.seed },
    { id: "farmers", label: "Hire", icon: HUD.heart },
    { id: "almanac", label: "Book", icon: HUD.bag },
    { id: "decorate", label: "Decor", icon: HUD.axe },
    { id: "friends", label: "Friends", icon: HUD.share },
  ];
  return (
    <nav
      className="pointer-events-auto absolute inset-x-2 bottom-2 z-20 mx-auto max-w-xl p-2 md:inset-x-auto"
      style={{
        backgroundImage: `url(${HUD.panel})`,
        backgroundSize: "100% 100%",
        imageRendering: "pixelated",
      }}
    >
      <ul className="flex items-center justify-between gap-0.5">
        {tabs.map((t) => {
          const selected = active === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                className="relative flex w-[52px] cursor-pointer flex-col items-center px-0.5 py-1 text-[8px] font-[family-name:var(--font-pixel)] text-[#1a1008]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected ? HUD.navFrameSelected : HUD.navFrame}
                  alt=""
                  className="mb-0.5 h-10 w-10 object-fill [image-rendering:pixelated]"
                  draggable={false}
                />
                <span className="absolute top-1.5 flex h-7 w-7 items-center justify-center">
                  <ArtIcon src={t.icon} alt="" className="h-6 w-6" />
                </span>
                {t.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function QuestTicket({ text, progress }: { text: string; progress: string }) {
  return (
    <div className={`${panel} absolute bottom-24 left-3 z-20 max-w-[210px] p-2.5 md:left-4`}>
      <div className="flex items-start gap-2">
        <ArtIcon src={HUD.bag} alt="" className="h-7 w-7" />
        <div>
          <p className={`text-[9px] leading-snug ${ink}`}>{text}</p>
          <p className={`mt-1 text-[10px] tabular-nums text-[#1a5c30]`}>{progress}</p>
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
    "relative flex w-14 cursor-pointer flex-col items-center gap-0.5 p-1 text-[8px] font-[family-name:var(--font-pixel)] text-[#1a1008] hover:brightness-110";
  return (
    <div className="absolute right-3 top-[9.5rem] z-20 flex flex-col gap-2 md:right-4">
      <button type="button" className={item} onClick={onRewards}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HUD.navFrame}
          alt=""
          className="h-12 w-12 object-fill [image-rendering:pixelated]"
          draggable={false}
        />
        <span className="absolute top-2.5 flex h-7 w-7 items-center justify-center">
          <ArtIcon src={HUD.silo} alt="" className="h-7 w-7" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 border border-[#3a2414] bg-[#ff4d4d]" />
        </span>
        Premios
      </button>
      <button type="button" className={item} onClick={onLeaderboard}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HUD.navFrame}
          alt=""
          className="h-12 w-12 object-fill [image-rendering:pixelated]"
          draggable={false}
        />
        <span className="absolute top-2.5">
          <ArtIcon src={HUD.medal} alt="" className="h-7 w-7" />
        </span>
        Ranking
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
  const unlocks = unlocksAtLevel(level);
  const barn = BARN_MILESTONE_LABELS[barnVisualFromLevel(level)];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[70] flex cursor-pointer items-center justify-center bg-black/55"
      onClick={onDone}
    >
      <motion.div
        initial={{ scale: 0.7, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className={`${panel} relative max-w-sm overflow-hidden px-8 py-6 text-center`}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 18 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute h-2 w-2 rounded-sm"
              style={{
                left: `${(i * 17) % 100}%`,
                background: i % 3 === 0 ? "#3dff7a" : i % 3 === 1 ? "#ffc94d" : "#ffe08a",
              }}
              initial={{ top: "-10%", opacity: 1 }}
              animate={{ top: "110%", opacity: 0.2 }}
              transition={{ duration: 1.4 + (i % 5) * 0.15, repeat: Infinity, delay: i * 0.05 }}
            />
          ))}
        </div>
        <p className={`relative text-sm ${ink}`}>LEVEL UP!</p>
        <p className={`relative mt-2 text-3xl ${ink}`}>{level}</p>
        <p className="relative mt-2 text-[11px] font-semibold text-[#1a5c30]">
          {unlocks.join(" · ")}
        </p>
        <p className="relative mt-1 text-[9px] text-[#3a2414]/65">{barn}</p>
        <p className="relative mt-3 text-[10px] text-[#3a2414]/70">Tap to continue</p>
      </motion.div>
    </motion.div>
  );
}
