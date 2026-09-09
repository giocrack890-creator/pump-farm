"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/layout/Footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = pathname === "/" || pathname.startsWith("/play");

  return (
    <>
      <main className={fullBleed ? "flex-1" : "flex-1 pt-24"}>{children}</main>
      {!pathname.startsWith("/play") && pathname !== "/" && <Footer />}
    </>
  );
}
