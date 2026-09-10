"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWalletStore } from "@/store/useWalletStore";
import { TOKEN_TICKER } from "@/lib/game/config";
import {
  hudBtnPrimary,
  hudGold,
  hudInk,
  hudInkMuted,
  hudInput,
  hudPanel,
} from "@/components/hud/hudChrome";

export function StakePanel() {
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
    if (!jwt) {
      setMessage("Connect your wallet first.");
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
    setMessage("Stake verified on chain and recorded.");
  };

  return (
    <div className={`p-4 ${hudPanel}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-[11px] ${hudInk}`}>Stake ${TOKEN_TICKER}</p>
        <span
          className={`border-[2px] border-[#8a5a10] bg-[#ffe08a] px-2 py-0.5 text-[9px] font-bold ${hudGold}`}
        >
          Growth multiplier
        </span>
      </div>
      <p className={`mt-2 text-sm ${hudInkMuted}`}>
        Lock ${TOKEN_TICKER} on Robinhood Chain for a growth multiplier. Transfer to the escrow
        address below, then paste the transaction hash — it is verified on chain before any
        multiplier is granted.
      </p>
      <p className={`mt-2 font-mono text-[10px] ${hudInkMuted}`}>
        Escrow: {stakeInfo.data?.escrowWallet ?? "not configured"}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <input
          className={hudInput}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          aria-label="Stake amount"
        />
        <select
          className={hudInput}
          value={lockDays}
          onChange={(e) => setLockDays(Number(e.target.value))}
          aria-label="Lock duration"
        >
          <option value={7}>7 days (+10%)</option>
          <option value={30}>30 days (+25%)</option>
        </select>
        <input
          className={hudInput}
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="0x… tx hash"
          aria-label="Transaction hash"
        />
      </div>
      <button type="button" className={`mt-4 w-full sm:w-auto ${hudBtnPrimary}`} onClick={() => void onStake()}>
        Record stake
      </button>
      {message ? <p className={`mt-2 text-xs ${hudInkMuted}`}>{message}</p> : null}
    </div>
  );
}
