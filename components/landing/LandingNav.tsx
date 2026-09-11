"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#why", label: "Why play" },
  { href: "#how", label: "How it works" },
  { href: "#tokenomics", label: "Payouts" },
  { href: "#roadmap", label: "Roadmap" },
  { href: "/play", label: "Play" },
  { href: "/docs", label: "Whitepaper" },
  { href: "#faq", label: "FAQ" },
] as const;

const SOCIALS = [
  { href: "https://x.com/PumpFarmer", label: "X", aria: "Hood Harvest on X" },
] as const;

export function LandingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="pf-nav sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Hood Harvest home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/landing/logo-hood-harvest.png?v=2"
            alt=""
            className="h-9 w-auto object-contain drop-shadow-[0_2px_0_#1a1008]"
            width={120}
            height={48}
          />
          <span className="pf-display hidden text-[13px] leading-none text-[var(--nav-cream)] sm:inline">
            HOOD HARVEST
          </span>
        </Link>

        <nav className="hidden items-center gap-5 min-[760px]:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="pf-nav-link">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 sm:flex">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.aria}
                className="pf-nav-social"
              >
                {s.label}
              </a>
            ))}
          </div>
          <button
            type="button"
            className="pf-nav-menu-btn flex h-10 w-10 cursor-pointer items-center justify-center rounded-full min-[760px]:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="pf-nav-drawer border-t border-[var(--wood-mid)] px-4 py-4 min-[760px]:hidden">
          <ul className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="pf-nav-link block rounded-lg px-3 py-3"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2 border-t border-[var(--wood-mid)] pt-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.aria}
                className="pf-nav-social flex h-10 flex-1 items-center justify-center rounded-lg"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
