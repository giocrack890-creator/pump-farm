import type { Metadata } from "next";
import { Fredoka, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { NavBar } from "@/components/layout/NavBar";
import { AppShell } from "@/components/layout/AppShell";

const display = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const body = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"],
});

const ticker = process.env.NEXT_PUBLIC_TOKEN_TICKER ?? "FARM";

export const metadata: Metadata = {
  title: "Pump Farm — Grow Green Candles. Literally.",
  description: `A gamified Robinhood Chain farm where harvests earn Season Points and real $${ticker} fee rewards.`,
  openGraph: {
    title: "Pump Farm",
    description: "Grow green candles. Earn Season Points. Share the Silo.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body className="grain-overlay flex min-h-full flex-col font-[family-name:var(--font-body)] antialiased">
        <Providers>
          <NavBar />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
