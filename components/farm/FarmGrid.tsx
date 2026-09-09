"use client";

import { useFarmStore } from "@/store/useFarmStore";
import { Plot } from "@/components/farm/Plot";
import { WeatherLayer } from "@/components/farm/WeatherLayer";
import { cn } from "@/lib/utils";

type Props = {
  onRefresh: () => void;
  className?: string;
};

export function FarmGrid({ onRefresh, className }: Props) {
  const plots = useFarmStore((s) => s.plots);
  const weather = useFarmStore((s) => s.weather);

  return (
    <div
      className={cn(
        "glass-panel relative overflow-hidden rounded-3xl p-4 md:p-6",
        className,
      )}
    >
      <WeatherLayer weather={weather} className="rounded-3xl" />
      <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-white">
          Your Farm
        </h2>
        <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/55">
          Weather: {weather}
        </span>
      </div>
      <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plots.map((plot) => (
          <Plot key={plot.id} plot={plot} onChanged={onRefresh} />
        ))}
      </div>
    </div>
  );
}
