import Link from "next/link";
import { TOKEN_TICKER } from "@/lib/game/config";
import { Separator } from "@/components/ui/separator";

export const DISCLAIMER = `Pump Farm is an entertainment product tied to $${TOKEN_TICKER}, a memecoin with no intrinsic value or expectation of financial return. The game and token target Robinhood Chain (EVM); Season Point rewards follow published on-chain rules and are not guaranteed. Deployment on Robinhood Chain does not mean $${TOKEN_TICKER} is listed or buyable inside the Robinhood brokerage app. Play responsibly.`;

const SOCIALS = [
  { href: "https://x.com/PumpFarmer", label: "X" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-[#070A09] px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="font-[family-name:var(--font-display)] text-lg text-[#3DFF7A]">
            Pump Farm
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 px-3 py-1.5 transition hover:border-[#3DFF7A]/40 hover:text-[#3DFF7A]"
              >
                {s.label}
              </a>
            ))}
            <Link
              href="/docs"
              className="rounded-full border border-white/10 px-3 py-1.5 transition hover:border-[#3DFF7A]/40 hover:text-[#3DFF7A]"
            >
              Docs
            </Link>
          </div>
        </div>
        <Separator className="bg-white/10" />
        <p className="max-w-4xl text-sm leading-relaxed text-white/45">
          {DISCLAIMER}
        </p>
      </div>
    </footer>
  );
}
