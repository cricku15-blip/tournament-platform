import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatTile } from "@/components/ui/stat-tile";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Organizer" };

interface Attention {
  key: string;
  text: string;
  href: string;
}

export default async function OrganizerHome() {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();

  // Two round trips: the tournaments themselves, then everything that hangs off them in parallel.
  const { data } = await supabase
    .from("tournaments")
    .select("id, name, status, start_date, approved_team_count, approved_player_count, team_count, squad_mode")
    .eq("organizer_id", user.id)
    .neq("status", "cancelled")
    .order("start_date", { ascending: true, nullsFirst: false })
    .limit(100);
  const list = data ?? [];
  const ids = list.map((t) => t.id);

  const [apps, teams, pools, openMatches] = ids.length
    ? await Promise.all([
        supabase.from("player_applications").select("tournament_id").in("tournament_id", ids).eq("status", "pending").limit(1000),
        supabase.from("teams").select("tournament_id").in("tournament_id", ids).eq("status", "pending").limit(1000),
        supabase.from("auction_settings").select("tournament_id, pool_locked").in("tournament_id", ids).eq("pool_locked", false),
        supabase.from("matches").select("tournament_id").in("tournament_id", ids).eq("fixture_published", true).is("result_published_at", null).not("team_a_id", "is", null).not("team_b_id", "is", null).lt("scheduled_at", new Date().toISOString()).limit(1000),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const count = (rows: Array<{ tournament_id: string }> | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.tournament_id, (m.get(r.tournament_id) ?? 0) + 1);
    return m;
  };
  const pendingApps = count(apps.data);
  const pendingTeams = count(teams.data);
  const needResult = count(openMatches.data);
  const unlockedPools = new Set((pools.data ?? []).map((p) => p.tournament_id));

  const attention: Attention[] = [];
  for (const t of list) {
    const href = `/organizer/tournaments/${t.id}`;
    if (t.status === "draft") attention.push({ key: `d${t.id}`, text: `${t.name} is a draft. Finish setup and pay to publish.`, href: `/organizer/tournaments/new?draft=${t.id}` });
    if (t.status === "paid") attention.push({ key: `p${t.id}`, text: `${t.name} is paid but not published yet.`, href });
    if (pendingApps.get(t.id)) attention.push({ key: `a${t.id}`, text: `${pendingApps.get(t.id)} player application${pendingApps.get(t.id) === 1 ? "" : "s"} to review in ${t.name}.`, href: `${href}?tab=applications` });
    if (pendingTeams.get(t.id)) attention.push({ key: `t${t.id}`, text: `${pendingTeams.get(t.id)} team approval${pendingTeams.get(t.id) === 1 ? "" : "s"} waiting in ${t.name}.`, href: `${href}?tab=teams` });
    if (needResult.get(t.id)) attention.push({ key: `r${t.id}`, text: `${needResult.get(t.id)} played match${needResult.get(t.id) === 1 ? "" : "es"} need a result in ${t.name}.`, href: `${href}?tab=results` });
    if (t.squad_mode === "auction" && t.status === "registration_closed" && unlockedPools.has(t.id)) attention.push({ key: `l${t.id}`, text: `Lock the player pool for ${t.name}.`, href: `${href}?tab=pool` });
  }

  const live = list.filter((t) => t.status === "live").length;
  const open = list.filter((t) => t.status === "registration_open").length;
  const totalTeams = list.reduce((n, t) => n + (t.approved_team_count ?? 0), 0);
  const totalPlayers = list.reduce((n, t) => n + (t.approved_player_count ?? 0), 0);
  const upcoming = list.filter((t) => t.status !== "draft" && t.status !== "completed" && t.start_date && t.start_date >= new Date().toISOString().slice(0, 10)).slice(0, 5);

  if (list.length === 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 font-display text-3xl font-bold">Organizer</h1>
        <EmptyState title="Run your first tournament" description="Set up a tournament in a few minutes: pick a format, invite teams and publish." action={<Button asChild><Link href="/organizer/tournaments/new">Create tournament</Link></Button>} />
      </div>
    );
  }
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Organizer</h1>
        <Button asChild>
          <Link href="/organizer/tournaments/new">Create tournament</Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Tournaments" value={list.length} />
        <StatTile label="Registration open" value={open} />
        <StatTile label="Live now" value={live} />
        <StatTile label="Teams and players" value={`${totalTeams} / ${totalPlayers}`} />
      </div>
      <section className="rounded-card border border-line bg-card p-5" aria-label="Needs your attention">
        <h2 className="mb-3 font-display text-xl font-bold">Needs your attention</h2>
        {attention.length === 0 ? (
          <p className="text-sm text-muted">You&apos;re all caught up.</p>
        ) : (
          <ul className="divide-y divide-line">
            {attention.map((a) => (
              <li key={a.key}>
                <Link href={a.href} className="block min-h-11 py-3 text-sm hover:text-primary">
                  {a.text}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-card border border-line bg-card p-5" aria-label="Next up">
        <h2 className="mb-3 font-display text-xl font-bold">Next up</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted">No upcoming tournaments.</p>
        ) : (
          <ul className="divide-y divide-line">
            {upcoming.map((t) => (
              <li key={t.id} className="flex min-h-11 items-center justify-between py-3">
                <Link href={`/organizer/tournaments/${t.id}`} className="font-semibold hover:text-primary">
                  {t.name}
                </Link>
                <span className="text-sm text-muted">{formatDate(t.start_date!)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
