import { NextResponse } from "next/server";
import { publicDb } from "@/lib/public/client";

export const dynamic = "force-dynamic";

/** Uptime check: the app is up and can reach the database. Returns no data and nothing secret. */
export async function GET() {
  const started = Date.now();
  const { error } = await publicDb.from("cities").select("id", { head: true, count: "exact" }).limit(1);
  const body = { ok: !error, db: error ? "down" : "up", ms: Date.now() - started };
  return NextResponse.json(body, { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } });
}
