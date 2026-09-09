/**
 * Lightweight in-memory rate limiter for Hype-earning / mutating actions.
 * Replace with Redis/Upstash at scale.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || cur.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (cur.count >= limit) {
    return { ok: false, remaining: 0 };
  }
  cur.count += 1;
  return { ok: true, remaining: limit - cur.count };
}
