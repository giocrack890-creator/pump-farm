"use client";

import { cn } from "@/lib/utils";

type Props = {
  weather: string;
  className?: string;
};

/** Field color-grade overlay driven by market weather — pointer-events none. */
export function WeatherLayer({ weather, className }: Props) {
  const storm = /storm/i.test(weather);
  const rainbow = /rainbow/i.test(weather);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden transition-[background,opacity] duration-700",
        storm &&
          "bg-[radial-gradient(ellipse_at_top,rgba(40,55,90,0.28),rgba(20,30,50,0.18)_55%,transparent_75%)]",
        rainbow &&
          "bg-[conic-gradient(from_180deg_at_50%_0%,rgba(61,255,122,0.18),rgba(126,200,255,0.14),rgba(255,201,77,0.18),rgba(61,255,122,0.12))]",
        !storm &&
          !rainbow &&
          "bg-[radial-gradient(ellipse_at_30%_0%,rgba(255,230,160,0.12),transparent_55%)]",
        className,
      )}
    >
      {storm
        ? Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-8 w-px bg-white/35 motion-safe:animate-[pf-bob_1.2s_ease-in-out_infinite]"
              style={{
                left: `${10 + i * 8}%`,
                top: `${(i * 13) % 55}%`,
                animationDelay: `${i * 80}ms`,
              }}
            />
          ))
        : null}
      {rainbow ? (
        <div className="absolute -top-8 left-1/2 h-24 w-[120%] -translate-x-1/2 rounded-[100%] bg-gradient-to-r from-[#FF4D4D]/20 via-[#FFC94D]/30 to-[#3DFF7A]/30 blur-2xl" />
      ) : null}
    </div>
  );
}
