import { NextRequest } from "next/server";
import { requireAuth, isAuthError } from "@/lib/auth/verify";
import { demoExpand, isDemoDbMode } from "@/lib/demo/farmMemory";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (isAuthError(auth)) return auth.error;

  if (isDemoDbMode()) {
    try {
      return Response.json(demoExpand());
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "Expand failed" },
        { status: 400 },
      );
    }
  }

  return Response.json(
    { error: "Land expansion requires DB — use demo mode locally" },
    { status: 501 },
  );
}
