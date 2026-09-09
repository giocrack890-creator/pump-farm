"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Particle = { id: number; x: number; y: number; color: string };

type Props = {
  active: boolean;
  x?: number;
  y?: number;
  onDone?: () => void;
};

const COLORS = ["#3DFF7A", "#FFC94D", "#7EC8FF", "#ffffff"];

export function HarvestBurst({ active, onDone }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) return;
    const next = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 140,
      y: -40 - Math.random() * 100,
      color: COLORS[i % COLORS.length],
    }));
    setParticles(next);
    const t = window.setTimeout(() => {
      setParticles([]);
      onDone?.();
    }, 700);
    return () => window.clearTimeout(t);
  }, [active, onDone]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            animate={{ opacity: 0, scale: 0.2, x: p.x, y: p.y }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className={cn("absolute left-1/2 top-1/2 h-2 w-2 rounded-full")}
            style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
