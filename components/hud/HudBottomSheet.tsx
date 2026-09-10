"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

import { hudInk, hudInkMuted, hudPanel } from "@/components/hud/hudChrome";

const wood = hudPanel;
const ink = hudInk;
const inkMuted = hudInkMuted;

export function HudBottomSheet({
  open,
  onClose,
  title,
  subtitle,
  ariaLabel,
  children,
  maxHeightClass = "max-h-[78vh]",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  ariaLabel?: string;
  children: ReactNode;
  maxHeightClass?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className={`fixed inset-x-0 bottom-0 z-50 overflow-y-auto ${maxHeightClass} ${wood} rounded-t-none border-b-0 p-4 pb-10`}
            role="dialog"
            aria-label={ariaLabel ?? title}
          >
            <div className="mx-auto mb-3 h-2 w-14 border-2 border-[#6b3e1f] bg-[#a86f3a]" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className={`text-[12px] leading-snug md:text-[13px] ${ink}`}>{title}</h2>
                {subtitle ? (
                  <p className={`mt-1.5 text-sm leading-relaxed ${inkMuted}`}>{subtitle}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center border-[3px] border-[#6b3e1f] bg-[#c44] text-sm font-bold text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="mt-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
