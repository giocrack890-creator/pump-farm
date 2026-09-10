import { describe, it, expect } from "vitest";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import {
  isEvmWalletAddress,
  normalizeEvmAddress,
  verifyEvmMessageSignature,
} from "@/lib/auth/evm";
import { extractNonceFromMessage, buildSiwxMessageText } from "@/lib/auth/siwx-message";

describe("EVM SIWX helpers (Robinhood Chain)", () => {
  it("validates 0x addresses", () => {
    expect(isEvmWalletAddress("0x0000000000000000000000000000000000000001")).toBe(true);
    expect(isEvmWalletAddress("not-a-key")).toBe(false);
    expect(isEvmWalletAddress("So11111111111111111111111111111111111111112")).toBe(false);
  });

  it("normalizes to lowercase checksum form", () => {
    const a = normalizeEvmAddress("0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B");
    expect(a.startsWith("0x")).toBe(true);
    expect(a).toBe(a.toLowerCase());
  });

  it("verifies ECDSA personal_sign messages", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const address = account.address;
    const message = buildSiwxMessageText({
      accountAddress: address,
      chainId: "eip155:4663",
      nonce: "abc123",
      issuedAt: new Date().toISOString(),
    });
    expect(message).toContain("Chain ID: 4663");
    expect(message).not.toContain("eip155:4663");
    expect(extractNonceFromMessage(message)).toBe("abc123");

    const signature = await account.signMessage({ message });
    expect(
      await verifyEvmMessageSignature({ address, message, signature }),
    ).toBe(true);
    expect(
      await verifyEvmMessageSignature({
        address,
        message,
        signature:
          "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      }),
    ).toBe(false);
  });
});
