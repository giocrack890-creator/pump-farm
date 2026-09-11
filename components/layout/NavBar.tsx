"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletButton } from "@/components/layout/WalletButton";
import { useWalletStore } from "@/store/useWalletStore";
import { useSoundStore } from "@/store/useSoundStore";

const LINKS = [
  { href: "/play", label: "Play" },
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

  // Landing, play, and whitepaper use their own chrome
  if (pathname === "/" || pathname.startsWith("/play") || pathname.startsWith("/docs")) {
    return null;
  }

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-4">
      <nav className="pointer-events-auto flex w-full max-w-4xl items-center justify-between gap-3">
        <div className="glass-panel flex items-center gap-1 rounded-full px-2 py-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
          <Link
            href="/"
            className="mr-1 rounded-full px-3 py-1.5 font-[family-name:var(--font-display)] text-sm font-semibold text-[#3DFF7A]"
          >
            Hood Harvest
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
