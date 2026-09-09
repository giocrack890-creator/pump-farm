"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { Button } from "@/components/ui/button";
import { truncateAddress } from "@/lib/utils";
import { useWalletStore } from "@/store/useWalletStore";
import { ACTIVE_CHAIN } from "@/lib/chain/robinhood";
import { DevBypassButton } from "@/components/layout/DevBypassButton";

export function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connectAsync, isPending: connecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const { address: authAddress, jwt, setAuth, clearAuth } = useWalletStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = useMemo(() => {
    if (authAddress) return truncateAddress(authAddress);
    if (address) return truncateAddress(address);
    return "Connect Wallet";
  }, [authAddress, address]);

  const login = useCallback(async () => {
    if (!address) return;
    setBusy(true);
    setError(null);
    try {
      if (chainId !== ACTIVE_CHAIN.id) {
        await switchChainAsync({ chainId: ACTIVE_CHAIN.id });
      }
      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`);
      if (!nonceRes.ok) throw new Error("Could not get nonce");
      const { nonce, timestamp, message } = await nonceRes.json();
      const signature = await signMessageAsync({
        message: message ?? `Pump Farm login\nNonce: ${nonce}\nTimestamp: ${timestamp}`,
      });
      const params = new URLSearchParams(window.location.search);
      const referredBy = params.get("ref") ?? undefined;
      const authRes = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          signature,
          nonce,
          timestamp,
          referredBy,
        }),
      });
      if (!authRes.ok) {
        const err = await authRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Auth failed");
      }
      const data = await authRes.json();
      setAuth(data.address, data.token);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Connect failed");
    } finally {
      setBusy(false);
    }
  }, [address, chainId, signMessageAsync, switchChainAsync, setAuth]);

  useEffect(() => {
    if (isConnected && address && !jwt) {
      void login();
    }
  }, [isConnected, address, jwt, login]);

  const onConnect = async () => {
    setError(null);
    try {
      const preferred =
        connectors.find((c) => c.id === "metaMask" || c.name.toLowerCase().includes("metamask")) ??
        connectors.find((c) => c.type === "injected") ??
        connectors[0];
      if (!preferred) {
        setError("No wallet found. Install MetaMask.");
        return;
      }
      await connectAsync({ connector: preferred, chainId: ACTIVE_CHAIN.id });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Wallet connect failed");
    }
  };

  if (authAddress || isConnected) {
    return (
      <div className="flex items-center gap-2">
        <DevBypassButton />
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full"
          disabled={busy}
          onClick={async () => {
            clearAuth();
            await disconnectAsync();
          }}
          aria-label="Disconnect wallet"
        >
          {busy ? "Signing…" : label}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <DevBypassButton />
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full"
          disabled={connecting || busy}
          onClick={() => void onConnect()}
          aria-label="Connect wallet"
        >
          {connecting || busy ? "Connecting…" : "Connect Wallet"}
        </Button>
      </div>
      {error ? <p className="max-w-[220px] text-right text-[10px] text-[#FF4D4D]">{error}</p> : null}
    </div>
  );
}
