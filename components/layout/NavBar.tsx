"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Volume2, VolumeX, Menu, X, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletButton } from "@/components/layout/WalletButton";
import { useWalletStore } from "@/store/useWalletStore";
import { useSoundStore } from "@/store/useSoundStore";

const LINKS = [
  { href: "/play", label: "Farm" },
  { href: "/rewards", label: "Silo" },
  { href: "/leaderboard", label: "Ranks" },
  { href: "/proof", label: "Proof" },
  { href: "/docs", label: "Lore" },
] as const;

export function NavBar() {
  const pathname = usePathname();
  const address = useWalletStore((s) => s.address);
  const muted = useSoundStore((s) => s.muted);
  const toggleMuted = useSoundStore((s) => s.toggleMuted);
  const [open, setOpen] = useState(false);
  const isHome = pathname === "/";

  if (pathname.startsWith("/play")) return null;

  if (isHome) {
    return (
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-5 sm:pt-6">
        <div className="pointer-events-auto relative w-fit max-w-[calc(100vw-1.5rem)]">
          <nav
            className="relative flex items-center gap-2 rounded-full border border-white/15 bg-[rgba(10,11,46,0.55)] px-2.5 py-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:gap-3 sm:px-3 md:max-w-[680px] md:px-4"
            aria-label="Primary"
          >
            <Link
              href="/"
              className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 font-[family-name:var(--font-display)] text-sm font-bold text-white"
            >
              <Sprout className="h-4 w-4 text-[#3DFF7A]" aria-hidden />
              Pump Farm
            </Link>

            <ul className="mx-1 hidden items-center gap-4 lg:mx-2 lg:flex lg:gap-5">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-semibold text-white/70 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                aria-label={muted ? "Unmute" : "Mute"}
                onClick={toggleMuted}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              <button
                type="button"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 lg:hidden"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <div className="hidden lg:block [&_button]:rounded-full [&_button]:bg-[#3DFF7A] [&_button]:px-4 [&_button]:font-semibold [&_button]:text-[#06140C] [&_button]:hover:bg-[#2aee6a]">
                <WalletButton />
              </div>
            </div>
          </nav>

          {open && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-white/15 bg-[rgba(10,11,46,0.92)] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl lg:hidden">
              <ul className="flex flex-col gap-1">
                {LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/5"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t border-white/10 pt-3 [&_button]:w-full [&_button]:rounded-full [&_button]:bg-[#3DFF7A] [&_button]:font-semibold [&_button]:text-[#06140C]">
                <WalletButton />
              </div>
            </div>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-4">
      <nav className="pointer-events-auto flex w-full max-w-4xl items-center justify-between gap-3">
        <div className="glass-panel flex items-center gap-1 rounded-full px-2 py-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
          <Link
            href="/"
            className="mr-1 rounded-full px-3 py-1.5 font-[family-name:var(--font-display)] text-sm font-semibold text-[#3DFF7A]"
          >
            Pump Farm
          </Link>
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "hidden rounded-full px-3 py-1.5 text-sm font-medium transition sm:inline-flex",
                  active
                    ? "bg-[#3DFF7A]/15 text-[#3DFF7A]"
                    : "text-white/55 hover:bg-white/5 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="glass-panel flex items-center gap-2 rounded-full px-2 py-1.5">
          <button
            type="button"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={toggleMuted}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white/60 hover:bg-white/5"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-[#3DFF7A]" />}
          </button>
          {address ? (
            <WalletButton />
          ) : (
            <Link
              href="/play"
              className="animate-pulse-glow cursor-pointer rounded-full bg-[#3DFF7A] px-4 py-1.5 text-sm font-semibold text-[#06140C]"
            >
              Play
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
