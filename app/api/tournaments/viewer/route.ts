import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Per-viewer state for the tournament page. Never cached, so the page itself can be. */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const headers = { "Cache-Control": "private, no-store" };
  if (!user) return NextResponse.json({ loggedIn: false }, { headers });

  const [profile, tournament, sub, application, team, owner] = await Promise.all([
    supabase.from("profiles").select("city_id, onboarded_at").eq("id", user.id).maybeSingle(),
    supabase.from("public_tournaments").select("city_id, status, allow_player_applications, team_entry, squad_mode").eq("id", id).maybeSingle(),
    supabase.rpc("has_active_subscription", { uid: user.id }),
    supabase.from("player_applications").select("status").eq("tournament_id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("teams").select("id, status").eq("tournament_id", id).eq("manager_id", user.id).maybeSingle(),
    supabase.from("tournaments").select("id").eq("id", id).eq("organizer_id", user.id).maybeSingle(),
  ]);

  return NextResponse.json(
    {
      loggedIn: true,
      onboarded: Boolean(profile.data?.onboarded_at),
      cityMatch: profile.data?.city_id === tournament.data?.city_id,
      subscribed: sub.data === true,
      applicationStatus: application.data?.status ?? null,
      teamStatus: team.data?.status ?? null,
      isOrganizer: Boolean(owner.data),
    },
    { headers }
  );
}
