import { requireAuth, isAuthError } from "@/lib/auth/verify";
import {
  hydrateDemoWallet,
  isDemoDbMode,
} from "@/lib/demo/farmMemory";

/** Restore demo farm from browser localStorage after a cold start. */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth.error;

  if (!isDemoDbMode()) {
    return Response.json({ error: "Not in demo mode" }, { status: 400 });
  }

  let body: { save?: unknown };
  try {
    body = (await request.json()) as { save?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ok = hydrateDemoWallet(body.save);
  if (!ok) {
    return Response.json({ error: "Invalid save payload" }, { status: 400 });
  }

  return Response.json({ ok: true });
}
