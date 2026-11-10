import type { Metadata } from "next";
import Link from "next/link";
import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import { requireTeamAccess } from "@/lib/team/guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatTile } from "@/components/ui/stat-tile";
import { TeamLogo } from "@/components/ui/team-logo";
import { SquadTab, type SquadRow } from "@/components/domain/team/squad-tab";
import { TeamProfileForm } from "@/components/domain/team/team-profile-form";
import { FixtureTicket } from "@/components/domain/public/fixture-ticket";
import { teamMapFrom } from "@/components/domain/public/team-map";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Team workspace" };

const TABS = [["overview", "Overview"], ["squad", "Squad"], ["invites", "Invites"], ["fixtures", "Fixtures"], ["profile", "Team profile"]] as const;

export default async function TeamWorkspacePage({ params, searchParams }: { params: Promise<{ teamId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { teamId } = await params;
  const sp = await searchParams;
  const { team, tournament: t, access, userId } = await requireTeamAccess(teamId);
  const tab = TABS.find(([k]) => k === sp.tab)?.[0] ?? "overview";
  const base = `/manager/teams/${team.id}`;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <header className="flex items-center gap-4">
        <TeamLogo src={team.logo_url} name={team.name} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl font-bold">{team.name}</h1>
          <p className="text-sm text-muted"><Link href={`/tournaments/${t.slug}`} className="hover:text-primary">{t.name}</Link> · <Badge variant={team.status === "approved" ? "open" : "neutral"}>{team.status}</Badge></p>
        </div>
      </header>
      {t.squad_mode === "auction" && (
        <Button asChild variant="secondary" className="self-start"><Link href={`/manager/teams/${team.id}/auction`}>Auction prep</Link></Button>
      )}
      <nav aria-label="Team sections" className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`${base}?tab=${k}`} aria-current={k === tab ? "page" : undefined} className={cn("inline-flex min-h-11 shrink-0 items-center border-b-[3px] px-3 text-sm font-semibold", k === tab ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink")}>{l}</Link>
        ))}
      </nav>
      <React.Suspense fallback={<div className="h-40 animate-pulse rounded-card bg-surface" aria-hidden />}>
        {tab === "overview" && <Overview team={team} t={t} />}
        {tab === "squad" && <Squad team={team} t={t} access={access} />}
        {tab === "invites" && (
          <EmptyState title="No pending invites" description="Inviting players by link is manual in this version: share the sign-up link from the Squad tab, then add them after they join. Assistant-manager invites are planned." />
        )}
        {tab === "fixtures" && <Fixtures team={team} t={t} />}
        {tab === "profile" && (
          <TeamProfileForm
            teamId={team.id}
            userId={userId}
            nameLocked={!["draft", "paid", "registration_open"].includes(t.status) && access === "manager"}
            initial={{ name: team.name, logoUrl: team.logo_url, colorPrimary: team.color_primary ?? "", colorSecondary: team.color_secondary ?? "", description: team.description ?? "", homeGround: team.home_ground ?? "" }}
          />
        )}
      </React.Suspense>
    </div>
  );
}

type Team = Awaited<ReturnType<typeof requireTeamAccess>>["team"];
type Tour = Awaited<ReturnType<typeof requireTeamAccess>>["tournament"];

async function Overview({ team, t }: { team: Team; t: Tour }) {
  const supabase = await createClient();
  const [members, next, st, ann, au] = await Promise.all([
    supabase.from("squad_members").select("id", { count: "exact", head: true }).eq("team_id", team.id),
    supabase.from("matches").select("scheduled_at").eq("tournament_id", t.id).eq("fixture_published", true).is("result_published_at", null).gte("scheduled_at", new Date().toISOString()).or(`team_a_id.eq.${team.id},team_b_id.eq.${team.id}`).order("scheduled_at").limit(1).maybeSingle(),
    supabase.from("standings").select("position, points").eq("team_id", team.id).maybeSingle(),
    supabase.from("announcements").select("id, title, body, created_at").eq("tournament_id", t.id).order("created_at", { ascending: false }).limit(3),
    supabase.from("auction_settings").select("status, scheduled_at").eq("tournament_id", t.id).maybeSingle(),
  ]);
  const size = members.count ?? 0;
  const min = t.squad_min ?? 0;
  const beforeDeadline = !t.squad_lock_deadline || new Date(t.squad_lock_deadline) > new Date();
  const checklist: Array<[string, boolean]> = [
    ["Add a team logo", Boolean(team.logo_url)],
    [`Reach the minimum squad of ${min}`, size >= min],
    [team.squad_locked ? "Squad confirmed" : `Confirm your squad${t.squad_lock_deadline ? ` before ${formatDate(t.squad_lock_deadline)}` : ""}`, team.squad_locked],
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Squad" value={`${size}/${t.squad_max ?? "–"}`} />
        <StatTile label="Next match" value={next.data?.scheduled_at ? formatDateTime(next.data.scheduled_at) : "None yet"} />
        <StatTile label="Standing" value={st.data?.position ? `#${st.data.position}` : "–"} subValue={st.data ? `${st.data.points} pts` : undefined} />
        <StatTile label="Auction" value={t.squad_mode !== "auction" ? "Not used" : au.data?.status === "completed" ? "Done" : au.data?.scheduled_at ? formatDate(au.data.scheduled_at) : "Not scheduled"} />
      </div>
      <section className="rounded-card border border-line bg-card p-5" aria-label="Checklist">
        <h2 className="mb-3 font-display text-xl font-bold">Checklist</h2>
        <ul className="flex flex-col gap-2">
          {checklist.map(([label, done]) => (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span aria-hidden className={cn("flex h-5 w-5 items-center justify-center rounded-full border text-xs", done ? "border-primary bg-primary text-primary-ink" : "border-line")}>{done ? "✓" : ""}</span>
              <span className={done ? "text-muted line-through" : ""}>{label}</span>
              <span className="sr-only">{done ? "done" : "to do"}</span>
            </li>
          ))}
        </ul>
        {!beforeDeadline && !team.squad_locked && <p className="mt-3 text-sm text-danger">The squad deadline has passed. Contact the organizer.</p>}
      </section>
      <section className="rounded-card border border-line bg-card p-5" aria-label="Announcements">
        <h2 className="mb-3 font-display text-xl font-bold">Announcements</h2>
        {(ann.data ?? []).length === 0 ? <p className="text-sm text-muted">No announcements yet.</p> : (
          <ul className="divide-y divide-line">{(ann.data ?? []).map((a) => <li key={a.id} className="py-3"><p className="font-semibold">{a.title}</p><p className="whitespace-pre-line text-sm text-muted">{a.body}</p></li>)}</ul>
        )}
      </section>
    </div>
  );
}

async function Squad({ team, t, access }: { team: Team; t: Tour; access: "manager" | "organizer" | "admin" }) {
  const supabase = await createClient();
  const { data } = await supabase.from("squad_members").select("id, user_id, jersey_no, source, price").eq("team_id", team.id).order("jersey_no", { ascending: true, nullsFirst: false }).limit(40);
  const uids = (data ?? []).map((m) => m.user_id);
  const profiles = uids.length ? await supabase.from("public_profiles").select("id, full_name, username, avatar_url").in("id", uids) : { data: [] };
  const apps = uids.length ? await supabase.from("player_applications").select("user_id, role").eq("tournament_id", t.id).in("user_id", uids) : { data: [] };
  const pm = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  const role = new Map((apps.data ?? []).map((a) => [a.user_id, a.role]));
  const rows: SquadRow[] = (data ?? []).map((m) => ({ id: m.id, name: pm.get(m.user_id)?.full_name ?? "Player", username: pm.get(m.user_id)?.username ?? null, avatar_url: pm.get(m.user_id)?.avatar_url ?? null, role: role.get(m.user_id) ?? null, jersey_no: m.jersey_no, source: m.source, price: m.price }));
  return (
    <SquadTab
      teamId={team.id}
      tournamentName={t.name}
      slug={t.slug}
      rows={rows}
      min={t.squad_min ?? 1}
      max={t.squad_max ?? 25}
      mode={t.squad_mode}
      locked={team.squad_locked}
      canEdit={!["completed", "cancelled"].includes(t.status)}
      canUnlock={access !== "manager"}
      teamApproved={team.status === "approved"}
    />
  );
}

async function Fixtures({ team, t }: { team: Team; t: Tour }) {
  const supabase = await createClient();
  const { data } = await supabase.from("matches").select("id, team_a_id, team_b_id, label_a, label_b, scheduled_at, venue, status, result_text, result_published_at, score_a, score_b, winner_team_id").eq("tournament_id", t.id).eq("fixture_published", true).or(`team_a_id.eq.${team.id},team_b_id.eq.${team.id}`).order("scheduled_at", { ascending: true, nullsFirst: false }).limit(100);
  const matches = data ?? [];
  const ids = [...new Set(matches.flatMap((m) => [m.team_a_id, m.team_b_id]).filter((x): x is string => !!x))];
  const teams = ids.length ? (await supabase.from("public_teams").select("id, name, logo_url, slug").in("id", ids)).data ?? [] : [];
  const sport = (await supabase.from("sports").select("slug").eq("id", t.sport_id).maybeSingle()).data?.slug ?? "cricket";
  if (matches.length === 0) return <EmptyState title="No fixtures yet" description="Fixtures appear here once the organizer publishes them." />;
  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="secondary" className="self-start"><a href={`/manager/teams/${team.id}/calendar`}>Add to calendar (.ics)</a></Button>
      <ul className="grid gap-3 md:grid-cols-2">
        {matches.map((m) => <li key={m.id}><FixtureTicket m={m} teams={teamMapFrom(teams)} sport={sport} href={`/tournaments/${t.slug}/matches/${m.id}`} /></li>)}
      </ul>
    </div>
  );
}
