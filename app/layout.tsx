import type { Metadata } from "next";
import { Fredoka, Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";

const display = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
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
          <main className="flex-1 pt-24">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
