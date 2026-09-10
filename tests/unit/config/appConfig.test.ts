import { describe, expect, it } from "vitest";
import {
  validateConfig,
  CONFIG_KEYS,
  resolveNumericSetting,
} from "@/lib/config/appConfig";

const TOKEN = "0x3105e3f37a4ac1af16cc409fa7a787f4fc7b5eeb";

describe("validateConfig", () => {
  it("accepts a real address for every address field", () => {
    for (const key of [
      "tokenAddress",
      "creatorAddress",
      "treasuryAddress",
      "stakeEscrowAddress",
    ] as const) {
      expect(validateConfig({ key, value: TOKEN })).toBeNull();
    }
  });

  it("allows clearing an address", () => {
    expect(validateConfig({ key: "tokenAddress", value: "  " })).toBeNull();
  });

  it("rejects the zero address — a placeholder is not a configuration", () => {
    expect(
      validateConfig({
        key: "tokenAddress",
        value: "0x0000000000000000000000000000000000000000",
      }),
    ).toMatch(/zero address/);
  });

  it("rejects a malformed address rather than letting the pot resolve nothing", () => {
    expect(validateConfig({ key: "tokenAddress", value: "0xnope" })).toMatch(
      /0x address/,
    );
  });

  it("keeps the ops reserve inside [0, 1)", () => {
    expect(validateConfig({ key: "opsReservePct", value: "0" })).toBeNull();
    expect(validateConfig({ key: "opsReservePct", value: "0.05" })).toBeNull();
    expect(validateConfig({ key: "opsReservePct", value: "1" })).not.toBeNull();
    expect(validateConfig({ key: "opsReservePct", value: "-0.1" })).not.toBeNull();
    expect(validateConfig({ key: "opsReservePct", value: "abc" })).not.toBeNull();
  });

  it("requires a positive silo target", () => {
    expect(validateConfig({ key: "siloTargetEth", value: "100" })).toBeNull();
    expect(validateConfig({ key: "siloTargetEth", value: "0" })).not.toBeNull();
  });

  it("only accepts a literal boolean for the payout switch", () => {
    expect(validateConfig({ key: "payoutsEnabled", value: "true" })).toBeNull();
    expect(validateConfig({ key: "payoutsEnabled", value: "false" })).toBeNull();
    expect(validateConfig({ key: "payoutsEnabled", value: "1" })).not.toBeNull();
    expect(validateConfig({ key: "payoutsEnabled", value: "yes" })).not.toBeNull();
  });

  it("bounds the ticker", () => {
    expect(validateConfig({ key: "tokenTicker", value: "FARM" })).toBeNull();
    expect(validateConfig({ key: "tokenTicker", value: "" })).not.toBeNull();
    expect(
      validateConfig({ key: "tokenTicker", value: "A".repeat(17) }),
    ).not.toBeNull();
  });

  it("falls back rather than reading an unset number as zero", () => {
    // `Number(null)` is 0, so an unset ops reserve used to mean "hold back
    // nothing" instead of the 5% default.
    expect(resolveNumericSetting(null, 0.05, 1)).toBe(0.05);
    expect(resolveNumericSetting("", 0.05, 1)).toBe(0.05);
    expect(resolveNumericSetting("   ", 0.05, 1)).toBe(0.05);
    expect(resolveNumericSetting("0", 0.05, 1)).toBe(0);
    expect(resolveNumericSetting("0.1", 0.05, 1)).toBe(0.1);
    expect(resolveNumericSetting("2", 0.05, 1)).toBe(0.05);
    expect(resolveNumericSetting("nope", 0.05, 1)).toBe(0.05);
  });

  it("exposes every key the admin panel writes", () => {
    expect(CONFIG_KEYS).toContain("tokenAddress");
    expect(CONFIG_KEYS).toContain("payoutsEnabled");
  });
});
