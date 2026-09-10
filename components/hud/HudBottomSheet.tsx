"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { hudInk, hudInkMuted, hudPanel } from "@/components/hud/hudChrome";

/**
 * Opaque bottom sheet — solid wood panel (no stretched PNG → no grass bleed / misaligned text).
 * NPC portrait + line only when `npc` is provided (opt-in).
 */
export function HudBottomSheet({
  open,
  onClose,
  title,
  subtitle,
  ariaLabel,
  children,
  maxHeightClass = "max-h-[82vh]",
  npc,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  ariaLabel?: string;
  children: ReactNode;
  maxHeightClass?: string;
  /** Optional — only show portrait tip when user opted in / clicked NPC. */
  npc?: { speaker: string; portraitSrc: string; line: string } | null;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-40 bg-[#1a1008]/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 28, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.65 }}
            className={`fixed inset-x-0 bottom-0 z-50 origin-bottom overflow-hidden ${maxHeightClass}`}
            role="dialog"
            aria-label={ariaLabel ?? title}
          >
            <div className={`mx-auto max-w-lg overflow-hidden ${hudPanel}`}>
              {/* Solid header — no transparent gaps */}
              <div className="flex items-start justify-between gap-3 border-b-[3px] border-[#5c3a1e] bg-[#a67c45] px-3 py-3">
                <div className="min-w-0 flex-1">
                  <h2 className={`text-[14px] leading-tight md:text-[15px] ${hudInk}`}>{title}</h2>
                  {subtitle ? (
                    <p className={`mt-1 text-[11px] leading-snug ${hudInkMuted}`}>{subtitle}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border-[3px] border-[#3a2414] bg-[#c44] text-sm font-bold text-white shadow-[2px_2px_0_#1a1008]"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {npc ? (
                <button
                  type="button"
                  className="flex w-full items-end gap-2 border-b-[3px] border-[#5c3a1e]/40 bg-[#efe0bc] px-3 py-2 text-left"
                  onClick={onClose}
                  aria-label={`${npc.speaker} tip`}
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center border-[3px] border-[#3a2414] bg-[#c9a46a]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={npc.portraitSrc}
                      alt=""
                      className="h-12 w-12 object-contain [image-rendering:pixelated]"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[9px] ${hudInkMuted}`}>{npc.speaker}</p>
                    <p className={`mt-0.5 text-[10px] leading-snug ${hudInk}`}>{npc.line}</p>
                  </div>
                </button>
              ) : null}

              <div className="max-h-[58vh] overflow-y-auto bg-[#efe0bc] px-3 py-3 pb-10">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
