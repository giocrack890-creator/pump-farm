import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { computePayouts, payoutIdempotencyKey } from "@/lib/game/payout";

describe("payout", () => {
  it("returns empty for zero active wallets and folds pool into reserve", () => {
    const r = computePayouts({ wallets: [], poolAmount: 100, opsReservePct: 0.05 });
    expect(r.payouts).toEqual([]);
    expect(r.reserve.toFixed()).toBe("100");
    expect(r.distributable.toFixed()).toBe("95");
  });

  it("splits tiers with exact pool accounting", () => {
    const wallets = Array.from({ length: 100 }, (_, i) => ({
      address: `W${String(i).padStart(3, "0")}`,
      points: 100 - i,
    }));
    const r = computePayouts({ wallets, poolAmount: "1000", opsReservePct: 0.05 });
    expect(r.activeCount).toBe(100);
    const sum = r.payouts.reduce((a, p) => a.plus(p.amount), new Decimal(0));
    // Paid amounts should equal distributable minus any empty-tier foldback (none here)
    expect(sum.plus(r.reserve).toFixed(9)).toBe(new Decimal(1000).toFixed(9));
    expect(r.tiers[0].wallets.length).toBeGreaterThanOrEqual(1);
  });

  it("excludes flagged sybils and zero points", () => {
    const r = computePayouts({
      wallets: [
        { address: "a", points: 10 },
        { address: "b", points: 0 },
        { address: "c", points: 5, flaggedSybil: true },
      ],
      poolAmount: 100,
      opsReservePct: 0,
    });
    expect(r.activeCount).toBe(1);
    expect(r.payouts[0].address).toBe("a");
  });

  it("idempotency key is stable", () => {
    expect(payoutIdempotencyKey("s1", "w1")).toBe("s1:w1");
  });

  it("handles single wallet season", () => {
    const r = computePayouts({
      wallets: [{ address: "solo", points: 42 }],
      poolAmount: 10,
      opsReservePct: 0,
    });
    expect(r.payouts).toHaveLength(1);
    expect(r.payouts[0].amount.gt(0)).toBe(true);
  });
});
