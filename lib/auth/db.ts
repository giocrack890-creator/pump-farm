/**
 * True when Prisma AuthNonce / Wallet can be used (usable DATABASE_URL).
 * DEMO_MODE alone does not block SIWX if a real DB URL is configured.
 */
export function canUseAuthDb(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  if (!url || url.includes("REPLACE_ME") || url.includes("[YOUR-PASSWORD]")) {
    return false;
  }
  return true;
}
