import { NextResponse } from "next/server";

/** Used by load balancers (e.g. Railway); bypasses i18n + Clerk middleware. */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
