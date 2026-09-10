/** Browser-side demo farm save — survives Vercel serverless cold starts. */

import { demoSaveScore } from "@/lib/demo/demoSaveScore";

export const DEMO_SAVE_STORAGE_KEY = "pumpfarm_demo_save_v2";

export { demoSaveScore };

export function readDemoSaveLocal(): unknown | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(DEMO_SAVE_STORAGE_KEY) ??
      window.localStorage.getItem("pumpfarm_demo_save_v1");
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Never overwrite a richer local save with a weaker/empty server snapshot. */
export function writeDemoSaveLocal(save: unknown): void {
  if (typeof window === "undefined" || !save || typeof save !== "object") return;
  try {
    const next = save as Parameters<typeof demoSaveScore>[0];
    const prev = readDemoSaveLocal() as Parameters<typeof demoSaveScore>[0] | null;
    if (prev && demoSaveScore(next) + 1 < demoSaveScore(prev)) {
      return;
    }
    window.localStorage.setItem(DEMO_SAVE_STORAGE_KEY, JSON.stringify(save));
    window.localStorage.setItem("pumpfarm_demo_save_v1", JSON.stringify(save));
  } catch {
    /* quota */
  }
}

/**
 * Push local save into the current server instance before farm API calls.
 * Server rejects downgrades — safe even if local is momentarily stale.
 */
export async function hydrateDemoFromLocal(jwt: string): Promise<void> {
  const save = readDemoSaveLocal();
  if (!save || !jwt) return;
  try {
    await fetch("/api/farm/demo-hydrate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ save }),
    });
  } catch {
    /* network — next call may hit a warm instance */
  }
}
