import { describe, expect, it } from "vitest";
import { validateDisplayName } from "@/lib/farm/displayName";

describe("validateDisplayName", () => {
  it("accepts simple farmer names", () => {
    expect(validateDisplayName("SiloKing")).toEqual({
      ok: true,
      name: "SiloKing",
    });
  });

  it("rejects wallet-like names and short names", () => {
    expect(validateDisplayName("0xabc").ok).toBe(false);
    expect(validateDisplayName("ab").ok).toBe(false);
  });
});
