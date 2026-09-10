"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/layout/Footer";

/** Routes that bring their own header and footer. */
const OWN_CHROME = ["/play", "/docs", "/admin"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ownChrome =
    pathname === "/" || OWN_CHROME.some((prefix) => pathname.startsWith(prefix));

  return (
    <>
      <main className={ownChrome ? "flex-1" : "flex-1 pt-24"}>{children}</main>
      {!ownChrome && <Footer />}
    </>
  );
}
