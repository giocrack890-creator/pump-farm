"use client";

import { TxRow, type TreasuryTx } from "@/components/proof/TxRow";

type Props = {
  txs: TreasuryTx[];
};

export function TreasuryLog({ txs }: Props) {
  return (
    <div className="glass-panel overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-black/30 text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Tx</th>
              <th className="px-4 py-3 font-medium">Note</th>
              <th className="px-4 py-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {txs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No treasury movements logged yet.
                </td>
              </tr>
            ) : (
              txs.map((tx) => <TxRow key={tx.id} tx={tx} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
