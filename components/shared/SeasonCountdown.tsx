"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  endsAt: string | null;
  className?: string;
  label?: string;
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return d > 0 ? `${d}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

export function SeasonCountdown({
  endsAt,
  className,
  label = "Season ends",
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = endsAt ? new Date(endsAt).getTime() - now : 0;

  return (
    <div className={cn("flex flex-col", className)}>
      <span className="text-[11px] uppercase tracking-wider text-muted">
        {label}
      </span>
      <span className="font-display tabular-nums text-lg text-foreground">
        {endsAt ? formatRemaining(remaining) : "—"}
      </span>
    </div>
  );
}
