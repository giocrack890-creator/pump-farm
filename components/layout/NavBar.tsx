"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletButton } from "@/components/layout/WalletButton";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/store/useWalletStore";
import { useSoundStore } from "@/store/useSoundStore";

const LINKS = [
  { href: "/", label: "Lobby" },
  { href: "/rewards", label: "Rewards" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/proof", label: "Proof" },
] as const;

export function NavBar() {
  const pathname = usePathname();
  const address = useWalletStore((s) => s.address);
  const muted = useSoundStore((s) => s.muted);
  const toggleMuted = useSoundStore((s) => s.toggleMuted);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-4">
      <nav className="pointer-events-auto flex w-full max-w-4xl items-center justify-between gap-3">
        <div className="glass-panel glow-green flex items-center gap-1 rounded-full px-2 py-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
          <Link
            href="/"
            className="mr-1 rounded-full px-3 py-1.5 font-[family-name:var(--font-display)] text-sm font-semibold text-[#3DFF7A]"
          >
            Pump Farm
          </Link>
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={muted ? "Unmute sounds" : "Mute sounds"}
            onClick={toggleMuted}
            className="h-9 w-9"
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-white/50" />
            ) : (
              <Volume2 className="h-4 w-4 text-[#3DFF7A]" />
            )}
          </Button>
          {address ? (
            <WalletButton />
          ) : (
            <Button asChild size="sm" className="animate-pulse-glow">
              <Link href="/play">Play</Link>
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
