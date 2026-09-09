"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/store/useWalletStore";

function demoPlayEnabled() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return true;
  return process.env.NEXT_PUBLIC_DEMO_PLAY === "true";
}

/** Demo / local play bypass — enabled on localhost or when NEXT_PUBLIC_DEMO_PLAY=true. */
export function DevBypassButton({ auto = false }: { auto?: boolean }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const setAuth = useWalletStore((s) => s.setAuth);
  const jwt = useWalletStore((s) => s.jwt);

  const runBypass = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/dev-bypass", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Demo play failed");
      setAuth(data.address, data.token);
      window.location.href = "/play";
    } catch (e) {
      alert(e instanceof Error ? e.message : "Demo play failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setShow(demoPlayEnabled());
  }, []);

  useEffect(() => {
    if (!auto || !show || jwt || busy) return;
    void runBypass();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, show, jwt]);

  if (!show || jwt) return null;

  return (
    <Button
      size="sm"
      variant="gold"
      className="rounded-full"
      disabled={busy}
      onClick={() => void runBypass()}
      aria-label="Play demo"
    >
      {busy ? "Entering farm…" : "▶ Play demo"}
    </Button>
  );
}
