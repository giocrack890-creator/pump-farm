import { DISCLAIMER } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TOKEN_TICKER } from "@/lib/game/config";

const FAQ = [
  {
    q: "What is Pump Farm?",
    a: `A browser farming game wrapped around $${TOKEN_TICKER} fee-sharing. Plant seeds, harvest Season Points, and compete for weekly Silo payouts.`,
  },
  {
    q: "How are Season Points calculated?",
    a: "Harvest yield = base seed tier × stake multiplier × streak multiplier × Golden Harvest multiplier. Blighted crops take up to 40% penalty. All math is recomputed server-side from timestamps — the client cannot forge SP.",
  },
  {
    q: "What chain is this on?",
    a: `Pump Farm runs on Robinhood Chain (EVM, chain ID 4663). Connect MetaMask, Robinhood Wallet, or WalletConnect. Gas is ETH. $${TOKEN_TICKER} is an ERC-20 — not an SPL token. Being on Robinhood Chain does not mean the token is listed in the Robinhood brokerage app.`,
  },
  {
    q: "Is this financial advice?",
    a: `No. $${TOKEN_TICKER} is a memecoin with no intrinsic value. Season rewards are entertainment incentives, not investment returns.`,
  },
  {
    q: "How do payouts work?",
    a: "Each Season, the Silo pool (minus a disclosed ops reserve) is split by the published curve: top 1% / next 9% / remaining active farmers.",
  },
] as const;

export default function DocsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24">
      <h1 className="font-[family-name:var(--font-display)] mb-2 text-3xl font-bold md:text-4xl">
        Docs
      </h1>
      <p className="mb-8 text-white/55">
        FAQ & whitepaper stub. Full mechanics live in the product brief and
        on-chain payout rules.
      </p>

      <div className="space-y-4">
        {FAQ.map((item) => (
          <Card key={item.q}>
            <CardHeader>
              <CardTitle className="text-lg text-[#3DFF7A]">{item.q}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-white/60">
              {item.a}
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator className="my-10 bg-white/10" />

      <section className="space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Risk disclosure
        </h2>
        <p className="text-sm leading-relaxed text-white/55">{DISCLAIMER}</p>
      </section>
    </div>
  );
}
