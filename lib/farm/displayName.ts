/** Farmer display names shown on leaderboards (never wallet addresses). */

export const DISPLAY_NAME_MIN = 3;
export const DISPLAY_NAME_MAX = 16;

const NAME_RE = /^[a-zA-Z0-9_ ]+$/;

export function normalizeDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateDisplayName(raw: unknown):
  | { ok: true; name: string }
  | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "Name is required" };
  }
  const name = normalizeDisplayName(raw);
  if (name.length < DISPLAY_NAME_MIN) {
    return { ok: false, error: `Name must be at least ${DISPLAY_NAME_MIN} characters` };
  }
  if (name.length > DISPLAY_NAME_MAX) {
    return { ok: false, error: `Name must be at most ${DISPLAY_NAME_MAX} characters` };
  }
  if (!NAME_RE.test(name)) {
    return { ok: false, error: "Use letters, numbers, spaces, or underscores only" };
  }
  if (/^0x/i.test(name)) {
    return { ok: false, error: "Name cannot look like a wallet address" };
  }
  return { ok: true, name };
}
