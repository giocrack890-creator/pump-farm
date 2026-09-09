"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWalletStore } from "@/store/useWalletStore";
import { TOKEN_TICKER } from "@/lib/game/config";

export function StakePanel() {
  const { isConnected } = useAccount();
  const jwt = useWalletStore((s) => s.jwt);
  const [amount, setAmount] = useState("100");
  const [lockDays, setLockDays] = useState(7);
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const stakeInfo = useQuery({
    queryKey: ["stake-escrow"],
    queryFn: async () => (await fetch("/api/stake")).json(),
  });

  const onStake = async () => {
    if (!isConnected || !jwt) {
      setMessage("Connect your Robinhood Chain wallet first.");
      return;
    }
    const res = await fetch("/api/stake", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, lockDays, txHash }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage((data as { error?: string }).error ?? "Stake failed");
      return;
    }
    setMessage("Stake recorded (escrow v1 on Robinhood Chain).");
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-white">
          Stake ${TOKEN_TICKER}
        </h2>
        <Badge className="border-[#FFC94D]/30 text-[#FFC94D]">Growth multiplier</Badge>
      </div>
      <p className="mt-2 text-sm text-white/50">
        {/* TODO: replace with audited on-chain staking program before mainnet. */}
        Lock ${TOKEN_TICKER} on Robinhood Chain for a growth multiplier. Escrow v1 —
        paste the tx hash after transferring to the escrow address.
      </p>
      <p className="mt-2 font-mono text-xs text-white/40">
        Escrow: {stakeInfo.data?.escrowWallet ?? "not configured"}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <input
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          aria-label="Stake amount"
        />
        <select
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
          value={lockDays}
          onChange={(e) => setLockDays(Number(e.target.value))}
          aria-label="Lock duration"
        >
          <option value={7}>7 days (+10%)</option>
          <option value={30}>30 days (+25%)</option>
        </select>
        <input
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="0x… tx hash"
          aria-label="Transaction hash"
        />
      </div>
      <Button className="mt-4" variant="gold" onClick={() => void onStake()}>
        Record stake
      </Button>
      {message ? <p className="mt-2 text-xs text-white/50">{message}</p> : null}
    </Card>
  );
}
