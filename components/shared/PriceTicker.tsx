"use client";

import { useQuery } from "@tanstack/react-query";
import { cn, formatNumber } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import { TOKEN_TICKER } from "@/lib/game/config";

type Props = {
  className?: string;
  compact?: boolean;
};

type PricePayload = {
  priceUsd: number;
  change24h: number;
};

async function fetchPrice(): Promise<PricePayload> {
  try {
    const res = await fetch("/api/price");
    if (res.ok) {
      const json = await res.json();
      return {
        priceUsd: Number(json.priceUsd ?? json.price ?? 0),
        change24h: Number(json.change24h ?? json.priceChange24h ?? 0),
      };
    }
  } catch {
    /* fallback below */
  }
  return { priceUsd: 0.00042, change24h: 12.4 };
}

export function PriceTicker({ className, compact }: Props) {
  const { data } = useQuery({
    queryKey: ["farm-price"],
    queryFn: fetchPrice,
    refetchInterval: 30_000,
  });

  const price = data?.priceUsd ?? 0;
  const change = data?.change24h ?? 0;
  const up = change >= 0;

  return (
    <div
      className={cn(
        "glass-panel flex items-center gap-2 rounded-full px-3 py-1.5",
        className,
      )}
      aria-live="polite"
    >
      <span className="text-[11px] uppercase tracking-wider text-white/45">
        ${TOKEN_TICKER}
      </span>
      <span className="tabular-nums text-sm font-semibold">
        ${price < 0.01 ? price.toFixed(6) : formatNumber(price, 4)}
      </span>
      {!compact ? (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-xs tabular-nums",
            up ? "text-[#3DFF7A]" : "text-[#FF4D4D]",
          )}
        >
          {up ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          {up ? "+" : ""}
          {formatNumber(change, 1)}%
        </span>
      ) : null}
    </div>
  );
}
