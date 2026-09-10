"use client";

import type { CaipNetworkId, SIWXConfig, SIWXMessage, SIWXSession } from "@reown/appkit";
import { useWalletStore } from "@/store/useWalletStore";

function referredByFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("ref") ?? undefined;
}

/**
 * Client SIWXConfig — all create/verify/session ops hit server API routes.
 * Prisma / AUTH_SECRET stay server-side. On verify success we set Zustand JWT.
 */
export const pumpFarmSIWX: SIWXConfig = {
  signOutOnDisconnect: true,

  getRequired: () => true,

  createMessage: async (input: SIWXMessage.Input): Promise<SIWXMessage> => {
    // Origin is sent automatically; server binds SIWE domain/uri to it (Phantom requirement).
    const res = await fetch("/api/auth/siwx/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountAddress: input.accountAddress,
        chainId: input.chainId,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Failed to create SIWX message");
    }
    const data = (await res.json()) as {
      accountAddress?: string;
      domain: string;
      uri: string;
      version: string;
      statement: string;
      nonce: string;
      issuedAt: string;
      expirationTime: string;
      message: string;
    };

    return {
      ...input,
      // Keep checksummed address from server so SIWX data matches signed text.
      accountAddress: data.accountAddress ?? input.accountAddress,
      domain: data.domain,
      uri: data.uri,
      version: data.version,
      statement: data.statement,
      nonce: data.nonce,
      issuedAt: data.issuedAt,
      expirationTime: data.expirationTime,
      toString: () => data.message,
    };
  },

  addSession: async (session: SIWXSession): Promise<void> => {
    const res = await fetch("/api/auth/siwx/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: session.data,
        message: session.message,
        signature: session.signature,
        referredBy: referredByFromUrl(),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg =
        (err as { error?: string }).error ?? "SIWX verification failed";
      console.error("[siwx] addSession failed", msg, {
        chainId: session.data?.chainId,
        address: session.data?.accountAddress,
      });
      throw new Error(msg);
    }
    const data = (await res.json()) as {
      address: string;
      token: string;
      displayName?: string | null;
      needsDisplayName?: boolean;
    };
    useWalletStore.getState().setAuth(
      data.address,
      data.token,
      data.displayName ?? null,
    );
  },

  getSessions: async (
    chainId: CaipNetworkId,
    address: string,
  ): Promise<SIWXSession[]> => {
    const { jwt, address: authAddress } = useWalletStore.getState();
    // AppKit may pass EIP-55 checksum; JWT stores lowercase — compare case-insensitively.
    if (
      !jwt ||
      !authAddress ||
      authAddress.toLowerCase() !== address.toLowerCase()
    ) {
      return [];
    }
    const qs = new URLSearchParams({
      address,
      chainId: String(chainId),
    });
    let res: Response;
    try {
      res = await fetch(`/api/auth/siwx/sessions?${qs}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
    } catch {
      // Network blip — keep JWT so /play does not unmount the farm.
      return [];
    }
    // Only drop the session on definitive auth failure — never on 5xx / timeouts.
    if (res.status === 401 || res.status === 403) {
      useWalletStore.getState().clearAuth();
      return [];
    }
    if (!res.ok) return [];
    const data = (await res.json()) as { sessions?: SIWXSession[] };
    return data.sessions ?? [];
  },

  setSessions: async (sessions: SIWXSession[]): Promise<void> => {
    // AppKit often calls setSessions([]) during reconnect / chain sync.
    // Clearing JWT here unmounted the whole Phaser farm for ~10s.
    // Explicit logout goes through revokeSession / WalletButton.clearAuth.
    if (sessions.length === 0) return;
    for (const session of sessions) {
      await pumpFarmSIWX.addSession(session);
    }
  },

  revokeSession: async (_chainId: CaipNetworkId, address: string): Promise<void> => {
    const { jwt, clearAuth } = useWalletStore.getState();
    try {
      await fetch("/api/auth/siwx/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify({ address }),
      });
    } finally {
      clearAuth();
    }
  },
};
