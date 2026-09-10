import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isAdminError, auditAdmin } from "@/lib/admin/auth";

type Body = {
  action?: "paid" | "void" | "amount";
  txHash?: string;
  amountEth?: string | number;
  note?: string;
};

/**
 * Settle one payout row.
 *
 *   paid    record the transaction hash that actually sent it. Idempotent: a
 *           second call on a paid row reports it rather than paying twice.
 *   void    take it out of the owed list, with a reason.
 *   amount  correct the figure before it is sent.
 *
 * Marking paid requires a hash. There is no "trust me" path, because the whole
 * point of the row is to be the record that the money went out.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(request);
  if (isAdminError(guard)) return guard.error;

  const { id } = await params;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.payoutTx.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "payout not found" }, { status: 404 });
  }

  if (body.action === "paid") {
    const txHash = body.txHash?.trim();
    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return Response.json(
        { error: "txHash must be a 0x-prefixed 32-byte hash" },
        { status: 400 },
      );
    }
    if (existing.status === "paid") {
      return Response.json({
        ok: true,
        alreadyPaid: true,
        txHash: existing.txHash,
      });
    }

    const updated = await prisma.payoutTx.update({
      where: { id },
      data: { status: "paid", txHash, paidAt: new Date(), note: body.note ?? existing.note },
    });
    // The public proof page reads TreasuryTx, so a payment has to land there too.
    await prisma.treasuryTx.create({
      data: {
        type: "payout",
        amount: updated.amount,
        txHash,
        note: `season payout → ${updated.walletId}`,
      },
    });
    await auditAdmin(guard.identity.actor, "payout.paid", { id, txHash });
    return Response.json({ ok: true, payout: { id, status: "paid", txHash } });
  }

  if (body.action === "void") {
    if (existing.status === "paid") {
      return Response.json(
        { error: "cannot void a payout that was already sent" },
        { status: 409 },
      );
    }
    await prisma.payoutTx.update({
      where: { id },
      data: { status: "void", note: body.note ?? "voided by ops" },
    });
    await auditAdmin(guard.identity.actor, "payout.void", { id, note: body.note });
    return Response.json({ ok: true, payout: { id, status: "void" } });
  }

  if (body.action === "amount") {
    if (existing.status === "paid") {
      return Response.json(
        { error: "cannot amend a payout that was already sent" },
        { status: 409 },
      );
    }
    let amount: Decimal;
    try {
      amount = new Decimal(body.amountEth ?? "");
    } catch {
      return Response.json({ error: "invalid amountEth" }, { status: 400 });
    }
    if (amount.isNeg()) {
      return Response.json({ error: "amountEth cannot be negative" }, { status: 400 });
    }
    await prisma.payoutTx.update({
      where: { id },
      data: { amount: amount.toFixed(), note: body.note ?? existing.note },
    });
    await auditAdmin(guard.identity.actor, "payout.amount", {
      id,
      from: existing.amount.toString(),
      to: amount.toFixed(),
    });
    return Response.json({ ok: true, payout: { id, amountEth: amount.toFixed() } });
  }

  return Response.json(
    { error: "action must be one of: paid, void, amount" },
    { status: 400 },
  );
}
