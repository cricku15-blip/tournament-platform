import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation/auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/check-email?expired=1`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/auth/check-email?expired=1`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("onboarded_at").eq("id", user.id).maybeSingle()
    : { data: null };

  const target = profile?.onboarded_at ? next : `/onboarding${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`;
  return NextResponse.redirect(`${origin}${target}`);
}
