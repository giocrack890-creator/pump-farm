import type { Metadata } from "next";
import { AdminPanel } from "./AdminPanel";

export const metadata: Metadata = {
  title: "Hood Harvest · ops",
  robots: { index: false, follow: false },
};

/**
 * The ops panel shell carries no data: it asks for a credential in the browser
 * and sends it as a header on every call, so this page being public gives away
 * an empty screen and keeps the token out of URLs and server logs.
 */
export default function AdminPage() {
  return <AdminPanel />;
}
