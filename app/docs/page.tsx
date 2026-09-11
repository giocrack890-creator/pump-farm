import type { Metadata } from "next";
import { WhitepaperPage } from "@/components/docs/WhitepaperPage";
import { TOKEN_TICKER } from "@/lib/game/config";

export const metadata: Metadata = {
  title: `Whitepaper — Hood Harvest`,
  description: `Season rules, Season Points math, and Silo payout curve for $${TOKEN_TICKER} on Robinhood Chain.`,
};

export default function DocsPage() {
  return <WhitepaperPage />;
}
