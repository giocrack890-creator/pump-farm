import { existsSync } from "fs";
import path from "path";
import { LandingPage } from "@/components/landing/LandingPage";

function publicAsset(rel: string): string | null {
  const abs = path.join(process.cwd(), "public", rel);
  return existsSync(abs) ? `/${rel.replace(/\\/g, "/")}` : null;
}

export default function HomePage() {
  const heroSrc =
    publicAsset("assets/landing/hero-fondo-farm.jpg") ??
    publicAsset("assets/landing/hero-background.jpg") ??
    publicAsset("assets/landing/hero-background.png");
  const logoSrc = publicAsset("assets/landing/logo-hood-harvest.png");

  return <LandingPage heroSrc={heroSrc} logoSrc={logoSrc} />;
}
