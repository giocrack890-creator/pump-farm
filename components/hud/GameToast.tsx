"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useToastStore, type ToastKind } from "@/store/useToastStore";
import { hudInk, hudInkMuted } from "@/components/hud/hudChrome";

const KIND_STYLE: Record<ToastKind, { bar: string; label: string }> = {
  info: { bar: "bg-[#4a7fae]", label: "Note" },
  success: { bar: "bg-[#3d7a2e]", label: "Done" },
  error: { bar: "bg-[#a8433a]", label: "Oops" },
  levelup: { bar: "bg-[#d69a2d]", label: "Level up!" },
  quest: { bar: "bg-[#5c8a3a]", label: "Quest" },
};

/**
 * In-game wood/parchment toasts — replaces native browser alert().
 * Max 3 visible (store truncates); never blocks input under them except OK.
 */
export function GameToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const reduce = useReducedMotion();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-16 z-[80] flex flex-col items-center gap-2 px-3 sm:top-20"
      aria-live="polite"
      aria-relevant="additions"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastCard
            key={t.id}
            id={t.id}
            message={t.message}
            kind={t.kind}
            ttlMs={t.ttlMs}
            reduce={Boolean(reduce)}
            onDismiss={() => dismiss(t.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({
  id,
  message,
  kind,
  ttlMs,
  reduce,
  onDismiss,
}: {
  id: string;
  message: string;
  kind: ToastKind;
  ttlMs: number;
  reduce: boolean;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, ttlMs);
    return () => window.clearTimeout(t);
  }, [id, ttlMs, onDismiss]);

  const style = KIND_STYLE[kind];
  const celebratory = kind === "levelup" || kind === "quest";

  return (
    <motion.div
      role="status"
      initial={reduce ? false : { y: -16, opacity: 0, scale: 0.92 }}
      animate={{ y: 0, opacity: 1, scale: celebratory && !reduce ? 1.02 : 1 }}
      exit={reduce ? undefined : { y: -10, opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={`pointer-events-auto relative flex w-[min(92vw,380px)] overflow-hidden border-[3px] border-[#3a2414] bg-[#f6e6c4] shadow-[4px_4px_0_#1a1008] ${
        kind === "levelup" ? "ring-2 ring-[#d69a2d]/70" : ""
      }`}
    >
      {kind === "levelup" && !reduce && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-sm bg-[#d69a2d]"
              style={{
                left: `${8 + ((i * 17) % 84)}%`,
                top: `${10 + ((i * 23) % 70)}%`,
                animation: `pf-confetti ${0.9 + (i % 4) * 0.15}s ease-out forwards`,
                animationDelay: `${i * 40}ms`,
                opacity: 0.85,
              }}
            />
          ))}
        </div>
      )}
      <div className={`relative z-[1] w-1.5 shrink-0 ${style.bar}`} aria-hidden />
      <div className="relative z-[1] min-w-0 flex-1 px-3 py-2.5">
        <p className={`text-[9px] uppercase tracking-wide ${hudInkMuted}`}>{style.label}</p>
        <p className={`mt-0.5 text-[11px] leading-snug ${hudInk}`}>{message}</p>
        <div className="mt-2 h-1 overflow-hidden bg-[#3a2414]/15">
          <motion.div
            className={`h-full ${style.bar}`}
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: ttlMs / 1000, ease: "linear" }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="relative z-[1] flex shrink-0 cursor-pointer items-center border-l-[3px] border-[#3a2414] bg-[#efe0bc] px-3 text-[10px] font-bold text-[#3a2414] hover:brightness-105"
        aria-label="Dismiss"
      >
        OK
      </button>
    </motion.div>
  );
}
