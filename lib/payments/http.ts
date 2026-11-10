import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { getErrorMessage } from "@/lib/errors";

const NO_STORE = { "Cache-Control": "private, no-store" };

export function jsonOk(body: unknown) {
  return NextResponse.json(body, { headers: NO_STORE });
}

export function jsonErr(code: string, status: number) {
  return NextResponse.json({ error: code, message: getErrorMessage(code) }, { status, headers: NO_STORE });
}

/** Authenticates and rate limits (10 per minute per user and route). */
export async function guard(route: string, max = 10) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: jsonErr("not_authenticated", 401) } as const;
  const limit = await rateLimit(`pay:${route}:${user.id}`, { max, windowSeconds: 60 });
  if (!limit.success) return { error: jsonErr("rate_limited", 429) } as const;
  return { supabase, user } as const;
}
