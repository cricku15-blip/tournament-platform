import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format";
import { STATUS_LABEL, statusVariant } from "@/lib/public/labels";

export const metadata: Metadata = { title: "My tournaments" };

export default async function MyTournamentsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: squads } = await supabase.from("squad_members").select("team_id, tournament_id, jersey_no, teams(name, slug)").eq("user_id", user.id).limit(100);
  const rows = squads ?? [];
  const tids = [...new Set(rows.map((r) => r.tournament_id))];
  const teamIds = rows.map((r) => r.team_id);

  const [tours, standings, matches] = tids.length
    ? await Promise.all([
        supabase.from("public_tournaments").select("id, name, slug, status, sport_name").in("id", tids),
        supabase.from("standings").select("tournament_id, team_id, position, points, played").in("team_id", teamIds),
        supabase.from("matches").select("tournament_id, team_a_id, team_b_id, scheduled_at, id").in("tournament_id", tids).eq("fixture_published", true).is("result_published_at", null).gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(200),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const tmap = new Map((tours.data ?? []).map((t) => [t.id, t]));

  const cards = rows.map((r) => {
    const t = tmap.get(r.tournament_id);
    const team = r.teams as unknown as { name: string; slug: string } | null;
    const st = (standings.data ?? []).find((s) => s.team_id === r.team_id);
    const next = (matches.data ?? []).find((m) => m.team_a_id === r.team_id || m.team_b_id === r.team_id);
    return { r, t, team, st, next };
  });
  const active = cards.filter((c) => c.t && c.t.status !== "completed" && c.t.status !== "cancelled");
  const done = cards.filter((c) => c.t && (c.t.status === "completed" || c.t.status === "cancelled"));

  const card = (c: (typeof cards)[number]) => (
    <li key={`${c.r.team_id}`} className="rounded-card border border-line bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/tournaments/${c.t!.slug}`} className="font-display text-lg font-bold hover:text-primary">{c.t!.name}</Link>
        <Badge variant={statusVariant(c.t!.status)}>{STATUS_LABEL[c.t!.status] ?? c.t!.status}</Badge>
      </div>
      <p className="text-sm text-muted">{c.t!.sport_name} · Team <Link href={`/tournaments/${c.t!.slug}/teams/${c.team?.slug}`} className="font-semibold text-ink hover:text-primary">{c.team?.name}</Link>{c.r.jersey_no !== null ? ` · #${c.r.jersey_no}` : ""}</p>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div><dt className="text-muted">Next match</dt><dd className="font-semibold">{c.next?.scheduled_at ? formatDateTime(c.next.scheduled_at) : "None yet"}</dd></div>
        <div><dt className="text-muted">Team standing</dt><dd className="font-semibold">{c.st?.position ? `#${c.st.position} · ${c.st.points} pts` : "–"}</dd></div>
        <div><dt className="text-muted">My stats</dt><dd className="font-semibold text-muted">Coming soon</dd></div>
      </dl>
    </li>
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="font-display text-3xl font-bold">My tournaments</h1>
      <div className="mt-5 flex flex-col gap-4">
        {cards.length === 0 ? (
          <EmptyState title="You're not in a squad yet" description="Once a team picks you, your tournaments show up here." action={<Button asChild><Link href="/tournaments">Find tournaments</Link></Button>} />
        ) : (
          <>
            <ul className="flex flex-col gap-4">{active.map(card)}</ul>
            {done.length > 0 && (
              <details className="rounded-card border border-line bg-card p-4">
                <summary className="min-h-11 cursor-pointer font-semibold">Completed ({done.length})</summary>
                <ul className="mt-3 flex flex-col gap-4">{done.map(card)}</ul>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}
