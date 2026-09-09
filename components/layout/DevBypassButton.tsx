"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/store/useWalletStore";

/** Localhost-only play bypass — never shown on production hosts. */
export function DevBypassButton() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const setAuth = useWalletStore((s) => s.setAuth);
  const jwt = useWalletStore((s) => s.jwt);

  useEffect(() => {
    const host = window.location.hostname;
    setShow(host === "localhost" || host === "127.0.0.1");
  }, []);

  if (!show || jwt) return null;

  return (
    <Button
      size="sm"
      variant="gold"
      className="rounded-full"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/auth/dev-bypass", { method: "POST" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Bypass failed");
          setAuth(data.address, data.token);
          window.location.href = "/play";
        } catch (e) {
          alert(e instanceof Error ? e.message : "Bypass failed");
        } finally {
          setBusy(false);
        }
      }}
      aria-label="Dev bypass login"
    >
      {busy ? "…" : "🛠 Dev play"}
    </Button>
  );
}
