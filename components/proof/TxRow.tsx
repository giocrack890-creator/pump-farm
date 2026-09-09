"use client";

import { Badge } from "@/components/ui/badge";
import { truncateAddress, cn } from "@/lib/utils";

export type TreasuryTx = {
  id: string;
  type: "deposit" | "payout";
  amount: number;
  txHash: string;
  note?: string;
  createdAt: string;
};

type Props = {
  tx: TreasuryTx;
};

export function TxRow({ tx }: Props) {
  const explorer = `https://robinhoodchain.blockscout.com/tx/${tx.txHash}`;
  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.03]">
      <td className="px-4 py-3">
        <Badge variant={tx.type === "deposit" ? "default" : "gold"}>
          {tx.type}
        </Badge>
      </td>
      <td className="px-4 py-3 tabular-nums">
        {tx.amount.toFixed(4)} ETH
      </td>
      <td className="px-4 py-3">
        <a
          href={explorer}
          target="_blank"
          rel="noreferrer"
          className={cn("tabular-nums text-sky hover:underline")}
        >
          {truncateAddress(tx.txHash, 6)}
        </a>
      </td>
      <td className="px-4 py-3 text-muted">{tx.note ?? "—"}</td>
      <td className="px-4 py-3 tabular-nums text-muted">
        {new Date(tx.createdAt).toLocaleString()}
      </td>
    </tr>
  );
}
