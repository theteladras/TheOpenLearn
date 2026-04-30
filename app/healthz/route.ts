import { NextResponse } from "next/server";

/** Plain LB probe path; kept separate from `/api/*` to avoid proxy/middleware edge cases. */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
