import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireTeamAccess } from "@/lib/team/guard";
import { buildIcs } from "@/lib/team/ics";

export async function GET(_req: Request, ctx: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await ctx.params;
  const { team, tournament } = await requireTeamAccess(teamId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("id, team_a_id, team_b_id, label_a, label_b, scheduled_at, venue")
    .eq("tournament_id", tournament.id)
    .eq("fixture_published", true)
    .not("scheduled_at", "is", null)
    .or(`team_a_id.eq.${team.id},team_b_id.eq.${team.id}`)
    .order("scheduled_at")
    .limit(200);
  const rows = data ?? [];
  const ids = [...new Set(rows.flatMap((m) => [m.team_a_id, m.team_b_id]).filter((x): x is string => !!x))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: teams } = await supabase.from("public_teams").select("id, name").in("id", ids);
    for (const t of teams ?? []) if (t.id) names.set(t.id, t.name ?? "Team");
  }
  const nm = (id: string | null, label: string | null) => (id ? names.get(id) : label) ?? "TBD";
  const ics = buildIcs(
    `${team.name} · ${tournament.name}`,
    rows.map((m) => ({ uid: m.id, start: m.scheduled_at!, durationMinutes: 180, summary: `${nm(m.team_a_id, m.label_a)} vs ${nm(m.team_b_id, m.label_b)}`, location: m.venue ?? tournament.venue_name, description: tournament.name }))
  );
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${team.slug}-fixtures.ics"`, "Cache-Control": "private, no-store" } });
}
