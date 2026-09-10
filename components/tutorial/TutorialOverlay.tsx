"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  hudBtnPrimary,
  hudBtnSecondary,
  hudInk,
  hudInkMuted,
  hudPanel,
} from "@/components/hud/hudChrome";

export type TutorialStepId =
  | "welcome"
  | "tap-plot"
  | "pick-seed"
  | "growth"
  | "harvest"
  | "xp"
  | "silo"
  | "nav"
  | "done";

type Props = {
  open: boolean;
  step: TutorialStepId;
  onSkip: () => void;
  onNext: () => void;
  onInstantGrow: () => void;
};

const COPY: Record<
  TutorialStepId,
  { title: string; body: string; cta?: string; showInstant?: boolean; spotlight?: string }
> = {
  welcome: {
    title: "Bienvenido a Pump Farm",
    body: "Plantá, cosechá y ganá SP. Al final de la Season, tus SP te dan una parte del pozo de premios.",
    cta: "Vamos",
  },
  "tap-plot": {
    title: "Plantá tu primera semilla",
    body: "Tocá un plot vacío (anillo verde) en tu granja.",
  },
  "pick-seed": {
    title: "Elegí una semilla",
    body: "Empezá con Turnip (Basic) — desbloqueada desde el nivel 1.",
  },
  growth: {
    title: "Los cultivos crecen en tiempo real",
    body: "Volvé más tarde — o acelerá este solo para el tutorial.",
    cta: "Seguir",
    showInstant: true,
  },
  harvest: {
    title: "¡Cosechá!",
    body: "Tocá el cultivo listo. Sumás Season Points (SP).",
  },
  xp: {
    title: "Farm Level",
    body: "Cada cosecha sube tu nivel: mejores semillas, más tierra y mejoras en la granja.",
    cta: "Entendido",
    spotlight: "xp",
  },
  silo: {
    title: "Premios (el Silo)",
    body: "El Silo es el pozo de la Season. Más SP = más parte del bote cuando cierra. Abrilo con Premios.",
    cta: "Ok",
    spotlight: "silo",
  },
  nav: {
    title: "Tus herramientas",
    body: "Premios · Shop · Hire · Almanac · Decor · Friends — barra de abajo.",
    cta: "Terminar tutorial",
    spotlight: "nav",
  },
  done: {
    title: "Listo",
    body: "Podés repetir el tutorial desde el Menú. A cosechar.",
    cta: "A la granja",
  },
};

/** Screen-space spotlight holes for HUD chrome steps. */
function Spotlight({ kind }: { kind?: string }) {
  if (!kind) return null;
  const box =
    kind === "xp"
      ? "left-3 top-3 h-24 w-[220px] md:left-4"
      : kind === "silo"
        ? "right-3 top-36 h-20 w-16 md:right-4"
        : kind === "nav"
          ? "inset-x-2 bottom-2 h-16 max-w-xl mx-auto"
          : "";
  if (!box) return null;
  return (
    <div
      className={`pointer-events-none absolute z-[61] rounded-sm ring-4 ring-[#3dff7a] ring-offset-2 ring-offset-transparent ${box}`}
      aria-hidden
    />
  );
}

export function TutorialOverlay({ open, step, onSkip, onNext, onInstantGrow }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !open) return null;

  const copy = COPY[step];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pointer-events-none fixed inset-0 z-[60]"
      >
        <div className="absolute inset-0 bg-black/50" />
        <Spotlight kind={copy.spotlight} />
        <div className="pointer-events-auto absolute inset-x-4 bottom-28 mx-auto max-w-md md:bottom-32">
          <div className={`p-4 ${hudPanel}`}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className={`text-[11px] ${hudInk}`}>{copy.title}</p>
              <button
                type="button"
                onClick={onSkip}
                className={`cursor-pointer text-[10px] font-semibold underline ${hudInkMuted}`}
              >
                Skip
              </button>
            </div>
            <p className={`text-sm leading-relaxed ${hudInkMuted}`}>{copy.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {copy.showInstant && (
                <button type="button" onClick={onInstantGrow} className={hudBtnPrimary}>
                  Instant-grow (tutorial only)
                </button>
              )}
              {copy.cta && (
                <button type="button" onClick={onNext} className={hudBtnSecondary}>
                  {copy.cta}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
