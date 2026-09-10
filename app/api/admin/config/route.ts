import { requireAdmin, isAdminError, auditAdmin } from "@/lib/admin/auth";
import {
  CONFIG_KEYS,
  getAppConfig,
  setConfig,
  type ConfigKey,
} from "@/lib/config/appConfig";
import { forgetLaunch } from "@/lib/pons/launch";

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if (isAdminError(guard)) return guard.error;

  return Response.json({
    config: await getAppConfig({ fresh: true }),
    keys: CONFIG_KEYS,
  });
}

/**
 * Repoint the game — most often at a new token.
 *
 * The launch discovery cache is dropped on every write, because keeping the old
 * curve and pool for a new address is how the pot ends up showing one coin's
 * fees next to another coin's market cap, with nothing erroring.
 */
export async function POST(request: Request) {
  const guard = await requireAdmin(request);
  if (isAdminError(guard)) return guard.error;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const writes = Object.entries(body)
    .filter(([key]) => (CONFIG_KEYS as readonly string[]).includes(key))
    .map(([key, value]) => ({
      key: key as ConfigKey,
      value: value === null || value === undefined ? "" : String(value),
    }));

  if (writes.length === 0) {
    return Response.json(
      { error: `no known config keys — expected one of: ${CONFIG_KEYS.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const config = await setConfig(writes, guard.identity.actor);
    forgetLaunch();
    await auditAdmin(guard.identity.actor, "config.set", writes);
    return Response.json({ ok: true, config });
  } catch (err) {
    const message = err instanceof Error ? err.message : "config write failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
