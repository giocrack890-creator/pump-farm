import { describe, it, expect } from "vitest";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { getAddress } from "viem";
import {
  isEvmWalletAddress,
  normalizeEvmAddress,
  verifyEvmMessageSignature,
} from "@/lib/auth/evm";
import {
  extractNonceFromMessage,
  buildSiwxMessageText,
  checksumEvmAddress,
  isAllowedSiwxHost,
  resolveSiwxDomainUri,
  SIWX_DOMAIN,
} from "@/lib/auth/siwx-message";

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

  it("checksums addresses with EIP-55 (Phantom SIWE)", () => {
    const mixed = "0xab5801a7d398351b8be11c439e05c5b3259aec9b";
    const checksummed = checksumEvmAddress(mixed);
    expect(checksummed).toBe(getAddress(mixed));
    expect(checksummed).not.toBe(mixed.toLowerCase());
  });

  it("allows production, localhost, and pump-farm Vercel hosts", () => {
    expect(isAllowedSiwxHost("pump-farm.vercel.app")).toBe(true);
    expect(isAllowedSiwxHost("localhost:3000")).toBe(true);
    expect(isAllowedSiwxHost("127.0.0.1")).toBe(true);
    expect(isAllowedSiwxHost("pump-farm-git-main-foo.vercel.app")).toBe(true);
    expect(isAllowedSiwxHost("evil.com")).toBe(false);
  });

  it("resolves SIWE domain from Origin header", () => {
    const req = new Request("https://pump-farm.vercel.app/api/auth/siwx/message", {
      headers: { origin: "http://localhost:3000" },
    });
    expect(resolveSiwxDomainUri(req)).toEqual({
      domain: "localhost:3000",
      uri: "http://localhost:3000",
    });
  });

  it("falls back to production domain when Origin is missing", () => {
    const req = new Request("https://pump-farm.vercel.app/api/auth/siwx/message");
    expect(resolveSiwxDomainUri(req)).toEqual({
      domain: SIWX_DOMAIN,
      uri: `https://${SIWX_DOMAIN}`,
    });
  });

  it("builds EIP-4361 message with checksum address and numeric chain id", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const address = account.address;
    const message = buildSiwxMessageText({
      accountAddress: address.toLowerCase(),
      chainId: "eip155:4663",
      nonce: "abc123",
      issuedAt: new Date().toISOString(),
      domain: "localhost:3000",
      uri: "http://localhost:3000",
    });
    expect(message).toContain("Chain ID: 4663");
    expect(message).not.toContain("eip155:4663");
    expect(message).toContain(getAddress(address));
    expect(message).toContain("localhost:3000 wants you to sign in");
    expect(message).toContain("URI: http://localhost:3000");
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
