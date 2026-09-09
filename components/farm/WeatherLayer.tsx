"use client";

import { cn } from "@/lib/utils";

type Props = {
  weather: string;
  className?: string;
};

export function WeatherLayer({ weather, className }: Props) {
  const storm = /storm/i.test(weather);
  const rainbow = /rainbow/i.test(weather);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden transition-colors duration-700",
        storm &&
          "bg-[radial-gradient(circle_at_top,rgba(255,77,77,0.16),transparent_55%)]",
        rainbow &&
          "bg-[conic-gradient(from_180deg_at_50%_0%,rgba(61,255,122,0.2),rgba(126,200,255,0.15),rgba(255,201,77,0.2),rgba(61,255,122,0.15))]",
        !storm &&
          !rainbow &&
          "bg-[radial-gradient(circle_at_30%_0%,rgba(126,200,255,0.08),transparent_50%)]",
        className,
      )}
    >
      {storm
        ? Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-8 w-px bg-white/35"
              style={{
                left: `${10 + i * 8}%`,
                top: `${(i * 13) % 55}%`,
                animation: `float-y ${1.2 + (i % 3) * 0.25}s ease-in-out infinite`,
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
