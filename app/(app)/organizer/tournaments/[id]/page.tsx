import type { Metadata } from "next";
import Link from "next/link";
import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import { requireOwnedTournament, type TournamentRow } from "@/lib/organizer/guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Stepper } from "@/components/ui/stepper";
import { CopyButton } from "@/components/ui/copy-button";
import { TournamentWizard } from "@/components/domain/organizer/wizard/wizard";
import { fromRow, type SportOption } from "@/components/domain/organizer/wizard/types";
import { NextStepCard, nextStepFor } from "@/components/domain/organizer/manager/next-step";
import { TeamsTab, type TeamRow } from "@/components/domain/organizer/manager/teams-tab";
import { ApplicationsTable, type ApplicationRow } from "@/components/domain/organizer/manager/applications-table";
import { PoolTab, type PoolRow } from "@/components/domain/organizer/manager/pool-tab";
import { AnnouncementForm } from "@/components/domain/organizer/manager/announcements-tab";
import { UpgradePlan } from "@/components/domain/payments/upgrade-plan";
import { ReceiptLink } from "@/components/domain/payments/receipt-link";
import { FixturesTab, type FxMatch } from "@/components/domain/organizer/manager/fixtures-tab";
import { ResultsTab, type ResMatch } from "@/components/domain/organizer/manager/results-tab";
import { AuctionTab, type SimpleLot, type SoldRow } from "@/components/domain/organizer/manager/auction-tab";
import { SettingsTab } from "@/components/domain/organizer/manager/settings-tab";
import { clientEnv } from "@/lib/env";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { STATUS_LABEL, statusVariant } from "@/lib/public/labels";
import { decodeCursor, encodeCursor, keysetFilter } from "@/lib/pagination/keyset";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Manage tournament" };

const TABS = [
  ["overview", "Overview"], ["setup", "Setup"], ["teams", "Teams"], ["applications", "Applications"], ["pool", "Players"],
  ["announcements", "Announcements"], ["plan", "Plan and payment"], ["settings", "Settings"],
  ["auction", "Auction"], ["fixtures", "Fixtures"], ["results", "Results"], ["chat", "Chat"],
] as const;
type TabKey = (typeof TABS)[number][0];

const FLOW = [
  ["draft", "Draft"], ["paid", "Paid"], ["registration_open", "Registration open"], ["registration_closed", "Registration closed"],
  ["auction", "Auction"], ["squads_locked", "Squads locked"], ["live", "Live"], ["completed", "Completed"],
];

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function ManageTournamentPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const { tournament: t, userId, isOwner } = await requireOwnedTournament(id);
  const tab: TabKey = (TABS.find(([k]) => k === sp.tab)?.[0] ?? "overview") as TabKey;
  const base = `/organizer/tournaments/${t.id}`;
  const stepIndex = Math.max(0, FLOW.findIndex(([s]) => s === t.status));
  const publicUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/tournaments/${t.slug}`;
  const showPool = t.squad_mode === "auction";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold">{t.name}</h1>
          <Badge variant={t.status === "draft" ? "draft" : statusVariant(t.status)}>{t.status === "draft" ? "Draft" : STATUS_LABEL[t.status] ?? t.status}</Badge>
        </div>
        {!["draft", "paid"].includes(t.status) && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link href={`/tournaments/${t.slug}`} className="font-semibold text-primary hover:underline" target="_blank">{publicUrl}</Link>
            <CopyButton value={publicUrl} />
          </div>
        )}
        {t.status !== "cancelled" && (
          <div className="overflow-x-auto pb-1">
            <Stepper steps={FLOW.map(([s, l]) => ({ id: s, label: l }))} currentStepIndex={stepIndex} />
          </div>
        )}
      </header>

      <nav aria-label="Tournament sections" className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1">
        {TABS.filter(([k]) => k !== "pool" || true).map(([k, label]) => (
          <Link key={k} href={`${base}?tab=${k}`} aria-current={k === tab ? "page" : undefined} className={cn("inline-flex min-h-11 shrink-0 items-center border-b-[3px] px-3 text-sm font-semibold", k === tab ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink")}>
            {k === "pool" ? (showPool ? "Player pool" : "Players") : label}
          </Link>
        ))}
      </nav>

      <React.Suspense fallback={<div className="h-40 animate-pulse rounded-card bg-surface" aria-hidden />}>
        {tab === "overview" && <OverviewTab t={t} />}
        {tab === "setup" && <SetupTab t={t} userId={userId} />}
        {tab === "teams" && <TeamsSection t={t} />}
        {tab === "applications" && <ApplicationsSection t={t} sp={sp} />}
        {tab === "pool" && <PoolSection t={t} />}
        {tab === "announcements" && <AnnouncementsSection t={t} />}
        {tab === "plan" && <PlanSection t={t} />}
        {tab === "settings" && <SettingsSection t={t} isOwner={isOwner} />}
        {tab === "auction" && (showPool ? <AuctionSection t={t} /> : <Placeholder title="Auction" text="This tournament uses direct squads, so there is no auction." />)}
        {tab === "fixtures" && <FixturesSection t={t} />}
        {tab === "results" && <ResultsSection t={t} />}
        {tab === "chat" && <Placeholder title="Chat" text="Tournament chat and moderation will appear here." />}
      </React.Suspense>
    </div>
  );
}

function Placeholder({ title, text, href, cta }: { title: string; text: string; href?: string; cta?: string }) {
  return <EmptyState title={title} description={text} action={href ? <Button asChild variant="secondary"><Link href={href}>{cta}</Link></Button> : undefined} />;
}

async function OverviewTab({ t }: { t: TournamentRow }) {
  const supabase = await createClient();
  const [pool, matches, apps, teams] = await Promise.all([
    supabase.from("auction_settings").select("pool_locked").eq("tournament_id", t.id).maybeSingle(),
    supabase.from("matches").select("id", { count: "exact", head: true }).eq("tournament_id", t.id).eq("fixture_published", true),
    supabase.from("player_applications").select("user_id, status, created_at").eq("tournament_id", t.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("teams").select("name, status, created_at").eq("tournament_id", t.id).order("created_at", { ascending: false }).limit(5),
  ]);
  const ids = (apps.data ?? []).map((a) => a.user_id);
  const names = new Map<string, string>();
  if (ids.length) {
    const { data } = await supabase.from("public_profiles").select("id, full_name").in("id", ids);
    for (const p of data ?? []) if (p.id) names.set(p.id, p.full_name ?? "Player");
  }
  const feed = [
    ...(apps.data ?? []).map((a) => ({ at: a.created_at, text: `${names.get(a.user_id) ?? "A player"} applied (${a.status})` })),
    ...(teams.data ?? []).map((x) => ({ at: x.created_at, text: `Team ${x.name} (${x.status})` })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  const step = nextStepFor(t, Boolean(pool.data?.pool_locked), (matches.count ?? 0) > 0);

  return (
    <div className="flex flex-col gap-6">
      {step ? <NextStepCard id={t.id} step={step} /> : <p className="rounded-card border border-line bg-card p-5 text-sm text-muted">Nothing left to do for this tournament.</p>}
      <section className="rounded-card border border-line bg-card p-5" aria-label="Recent activity">
        <h2 className="mb-3 font-display text-xl font-bold">Recent activity</h2>
        {feed.length === 0 ? <p className="text-sm text-muted">No activity yet.</p> : (
          <ul className="divide-y divide-line">{feed.map((f, i) => <li key={i} className="flex justify-between gap-3 py-2 text-sm"><span>{f.text}</span><span className="shrink-0 text-muted">{formatDateTime(f.at)}</span></li>)}</ul>
        )}
      </section>
    </div>
  );
}

async function SetupTab({ t, userId }: { t: TournamentRow; userId: string }) {
  const supabase = await createClient();
  const [cities, sports, tiers, auction] = await Promise.all([
    supabase.from("cities").select("id, name").eq("is_active", true).order("sort_order"),
    supabase.from("sports").select("id, slug, name, config").eq("is_active", true).order("name"),
    supabase.from("pricing_tiers").select("id, name, min_teams, max_teams, amount_paise").eq("is_active", true).order("sort_order"),
    supabase.from("auction_settings").select("*").eq("tournament_id", t.id).maybeSingle(),
  ]);
  const sportList = (sports.data ?? []) as unknown as SportOption[];
  const locked = t.status !== "draft";
  return (
    <div className="flex flex-col gap-3">
      {locked && <p className="rounded-input border border-line bg-surface p-3 text-sm">Sport, city, squad mode and team count are locked after payment. If you change dates, post an announcement so teams know.</p>}
      <TournamentWizard mode="setup" userId={userId} sports={sportList} cities={cities.data ?? []} tiers={tiers.data ?? []} initial={fromRow(t, sportList.find((s) => s.id === t.sport_id), auction.data)} initialId={t.id} locks={{ sport: locked, city: locked, squadMode: locked, teamCount: locked }} />
    </div>
  );
}

async function TeamsSection({ t }: { t: TournamentRow }) {
  const supabase = await createClient();
  const { data } = await supabase.from("teams").select("id, name, status, manager_id").eq("tournament_id", t.id).order("created_at").limit(100);
  const mids = [...new Set((data ?? []).map((x) => x.manager_id).filter((x): x is string => !!x))];
  const names = new Map<string, string>();
  if (mids.length) {
    const { data: ps } = await supabase.from("public_profiles").select("id, full_name").in("id", mids);
    for (const p of ps ?? []) if (p.id) names.set(p.id, p.full_name ?? "Manager");
  }
  const rows: TeamRow[] = (data ?? []).map((x) => ({ id: x.id, name: x.name, status: x.status, manager_name: x.manager_id ? names.get(x.manager_id) ?? "Manager" : null }));
  const canEdit = !["completed", "cancelled", "live", "squads_locked"].includes(t.status);
  return <TeamsTab tournamentId={t.id} slug={t.slug} teams={rows} teamCount={t.team_count} teamEntry={t.team_entry} canEdit={canEdit} />;
}

async function ApplicationsSection({ t, sp }: { t: TournamentRow; sp: Record<string, string | undefined> }) {
  const supabase = await createClient();
  const status = (["pending", "approved", "rejected"] as const).find((x) => x === sp.status) ?? "pending";
  const role = sp.role?.slice(0, 30);
  const exp = ["beginner", "intermediate", "advanced"].includes(sp.exp ?? "") ? sp.exp! : undefined;
  const q = sp.q?.trim().slice(0, 40);
  const cursor = decodeCursor(sp.cursor);

  const countOf = (s: "pending" | "approved" | "rejected") => supabase.from("player_applications").select("id", { count: "exact", head: true }).eq("tournament_id", t.id).eq("status", s);
  const [cP, cA, cR] = await Promise.all([countOf("pending"), countOf("approved"), countOf("rejected")]);

  let matchIds: string[] | null = null;
  if (q) {
    const { data } = await supabase.from("public_profiles").select("id").ilike("full_name", `%${q.replace(/[\\%_,()"]/g, " ")}%`).limit(200);
    matchIds = (data ?? []).map((p) => p.id).filter((x): x is string => !!x);
  }
  let query = supabase.from("player_applications").select("id, user_id, status, role, experience, notes, answers, created_at").eq("tournament_id", t.id).eq("status", status).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(31);
  if (role) query = query.eq("role", role);
  if (exp) query = query.eq("experience", exp);
  if (matchIds) query = matchIds.length ? query.in("user_id", matchIds) : query.eq("user_id", "00000000-0000-0000-0000-000000000000");
  if (cursor) query = query.or(keysetFilter(cursor));
  const { data } = await query;
  const page = (data ?? []).slice(0, 30);
  const last = page[page.length - 1];
  const more = (data ?? []).length > 30 && last;

  const uids = page.map((a) => a.user_id);
  const [profiles, bat, bowl, foot] = uids.length
    ? await Promise.all([
        supabase.from("public_profiles").select("id, full_name, username, avatar_url").in("id", uids),
        supabase.from("player_cricket_career").select("player_id, matches, runs").in("player_id", uids),
        supabase.from("player_bowling_career").select("player_id, wickets").in("player_id", uids),
        supabase.from("player_football_career").select("player_id, goals, assists").in("player_id", uids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const pm = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  const stats = (uid: string) => {
    const out: string[] = [];
    const b = (bat.data ?? []).find((x) => x.player_id === uid);
    const w = (bowl.data ?? []).find((x) => x.player_id === uid);
    const f = (foot.data ?? []).find((x) => x.player_id === uid);
    if (b) out.push(`Cricket: ${b.matches} matches, ${b.runs} runs`);
    if (w) out.push(`${w.wickets} wickets`);
    if (f) out.push(`Football: ${f.goals} goals, ${f.assists} assists`);
    return out;
  };
  const rows: ApplicationRow[] = page.map((a) => {
    const p = pm.get(a.user_id);
    return { id: a.id, user_id: a.user_id, status: a.status, role: a.role, experience: a.experience, notes: a.notes, created_at: a.created_at, answers: (a.answers ?? {}) as Record<string, unknown>, name: p?.full_name ?? null, username: p?.username ?? null, avatar_url: p?.avatar_url ?? null, stats: stats(a.user_id) };
  });
  const questions = ((Array.isArray(t.custom_questions) ? t.custom_questions : []) as Array<{ q?: string }>).map((x) => x.q ?? "");
  const base = `/organizer/tournaments/${t.id}?tab=applications`;
  const link = (s: string) => `${base}&status=${s}`;
  const canReview = !["completed", "cancelled"].includes(t.status);
  const nextHref = more && last ? `${base}&status=${status}${role ? `&role=${encodeURIComponent(role)}` : ""}${exp ? `&exp=${exp}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}&cursor=${encodeCursor({ t: last.created_at, id: last.id })}` : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {([["pending", cP.count], ["approved", cA.count], ["rejected", cR.count]] as const).map(([s, c]) => (
          <Link key={s} href={link(s)} aria-current={s === status ? "page" : undefined} className={cn("inline-flex min-h-11 items-center rounded-input px-4 text-sm font-semibold capitalize", s === status ? "bg-primary text-primary-ink" : "border border-line text-muted")}>
            {s} ({c ?? 0})
          </Link>
        ))}
      </div>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="tab" value="applications" />
        <input type="hidden" name="status" value={status} />
        <div><label htmlFor="f-q" className="mb-1 block text-xs font-semibold text-muted">Search name</label><input id="f-q" name="q" defaultValue={q} maxLength={40} className="h-11 rounded-input border border-line bg-card px-3" /></div>
        <div><label htmlFor="f-role" className="mb-1 block text-xs font-semibold text-muted">Role</label><input id="f-role" name="role" defaultValue={role} maxLength={30} className="h-11 w-36 rounded-input border border-line bg-card px-3" /></div>
        <div><label htmlFor="f-exp" className="mb-1 block text-xs font-semibold text-muted">Experience</label>
          <select id="f-exp" name="exp" defaultValue={exp ?? ""} className="h-11 rounded-input border border-line bg-card px-3"><option value="">Any</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
        <Button type="submit" variant="secondary">Filter</Button>
      </form>
      <ApplicationsTable tournamentId={t.id} rows={rows} canReview={canReview} questions={questions} />
      {nextHref && <Button asChild variant="secondary" className="self-center"><Link href={nextHref}>Load more</Link></Button>}
    </div>
  );
}

async function PoolSection({ t }: { t: TournamentRow }) {
  const supabase = await createClient();
  if (t.squad_mode === "auction") {
    const [{ data: pool }, { data: settings }] = await Promise.all([
      supabase.from("pool_players").select("id, user_id, category, base_price, sequence_no").eq("tournament_id", t.id).order("sequence_no", { ascending: true, nullsFirst: false }).order("created_at").limit(500),
      supabase.from("auction_settings").select("categories, sequence_mode, pool_locked").eq("tournament_id", t.id).maybeSingle(),
    ]);
    const uids = (pool ?? []).map((p) => p.user_id);
    const names = new Map<string, string>();
    for (let i = 0; i < uids.length; i += 100) {
      const { data } = await supabase.from("public_profiles").select("id, full_name").in("id", uids.slice(i, i + 100));
      for (const p of data ?? []) if (p.id) names.set(p.id, p.full_name ?? "Player");
    }
    const rows: PoolRow[] = (pool ?? []).map((p) => ({ id: p.id, name: names.get(p.user_id) ?? "Player", category: p.category, base_price: p.base_price, sequence_no: p.sequence_no }));
    return <PoolTab tournamentId={t.id} rows={rows} categories={((settings?.categories as string[]) ?? []) as string[]} sequenceMode={settings?.sequence_mode ?? "random"} locked={Boolean(settings?.pool_locked)} canLock={t.status === "registration_closed"} />;
  }
  const { data: squads } = await supabase.from("squad_members").select("team_id, user_id, teams(name)").eq("tournament_id", t.id).limit(500);
  if (!squads || squads.length === 0) return <EmptyState title="No squads yet" description="Squads appear here as managers add players." />;
  const names = new Map<string, string>();
  const uids = [...new Set(squads.map((s) => s.user_id))];
  for (let i = 0; i < uids.length; i += 100) {
    const { data } = await supabase.from("public_profiles").select("id, full_name").in("id", uids.slice(i, i + 100));
    for (const p of data ?? []) if (p.id) names.set(p.id, p.full_name ?? "Player");
  }
  const groups = new Map<string, string[]>();
  for (const s of squads) {
    const team = (s.teams as unknown as { name: string } | null)?.name ?? "Team";
    groups.set(team, [...(groups.get(team) ?? []), names.get(s.user_id) ?? "Player"]);
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[...groups.entries()].map(([team, players]) => (
        <section key={team} className="rounded-card border border-line bg-card p-4">
          <h2 className="font-display text-lg font-bold">{team} <span className="text-sm font-normal text-muted">({players.length})</span></h2>
          <ul className="mt-2 text-sm">{players.map((p, i) => <li key={i} className="py-1">{p}</li>)}</ul>
        </section>
      ))}
    </div>
  );
}

async function AnnouncementsSection({ t }: { t: TournamentRow }) {
  const supabase = await createClient();
  const { data } = await supabase.from("announcements").select("id, title, body, is_pinned, created_at").eq("tournament_id", t.id).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }).limit(30);
  return (
    <div className="flex flex-col gap-6">
      <AnnouncementForm tournamentId={t.id} />
      <ul className="flex flex-col gap-3">
        {(data ?? []).map((a) => (
          <li key={a.id} className="rounded-card border border-line bg-card p-4">
            <div className="flex items-center gap-2">{a.is_pinned && <Badge variant="neutral">Pinned</Badge>}<h3 className="font-semibold">{a.title}</h3></div>
            <p className="mt-1 whitespace-pre-line text-sm text-muted">{a.body}</p>
            <p className="mt-2 text-xs text-muted/70">{formatDateTime(a.created_at)}</p>
          </li>
        ))}
        {(data ?? []).length === 0 && <p className="text-sm text-muted">No announcements yet.</p>}
      </ul>
    </div>
  );
}

async function PlanSection({ t }: { t: TournamentRow }) {
  const supabase = await createClient();
  const [tier, pays, top] = await Promise.all([
    t.pricing_tier_id ? supabase.from("pricing_tiers").select("name, amount_paise, min_teams, max_teams").eq("id", t.pricing_tier_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("tournament_payments").select("id, kind, total_paise, status, paid_at, invoice_url, created_at").eq("tournament_id", t.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("pricing_tiers").select("max_teams").eq("is_active", true).order("max_teams", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const maxTeams = top.data?.max_teams ?? t.team_count;
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-card border border-line bg-card p-5">
        <p className="text-sm text-muted">Current plan</p>
        <p className="font-display text-2xl font-bold">{tier.data ? `${tier.data.name}: ${formatINR(tier.data.amount_paise)}` : "No plan"}</p>
        <p className="text-sm text-muted">{t.team_count} teams · status {STATUS_LABEL[t.status] ?? t.status}</p>
        <div className="mt-3 flex gap-2">
          {t.status === "draft" && <Button asChild><Link href={`/organizer/tournaments/${t.id}/checkout`}>Pay and publish</Link></Button>}
          {!["draft", "completed", "cancelled"].includes(t.status) && ["paid", "registration_open", "registration_closed"].includes(t.status) && <UpgradePlan id={t.id} current={t.team_count} max={maxTeams} />}
        </div>
      </section>
      <section className="rounded-card border border-line bg-card p-5" aria-label="Payments">
        <h2 className="mb-3 font-display text-xl font-bold">Payments</h2>
        {(pays.data ?? []).length === 0 ? <p className="text-sm text-muted">No payments yet.</p> : (
          <ul className="divide-y divide-line text-sm">
            {(pays.data ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>{p.kind === "upgrade" ? "Plan upgrade" : "Tournament fee"} · {formatINR(p.total_paise)}</span>
                <span className="flex items-center gap-3"><Badge variant={p.status === "paid" ? "open" : "neutral"}>{p.status}</Badge>{p.paid_at && <span className="text-muted">{formatDate(p.paid_at)}</span>}{p.invoice_url && <ReceiptLink kind="tournament" paymentId={p.id} label="Invoice" />}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

async function SettingsSection({ t, isOwner }: { t: TournamentRow; isOwner: boolean }) {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("tournament_assistants").select("user_id").eq("tournament_id", t.id).limit(5);
  const ids = (rows ?? []).map((r) => r.user_id);
  const { data: people } = ids.length ? await supabase.from("public_profiles").select("id, full_name, username").in("id", ids) : { data: [] };
  const assistants = ids.map((uid) => {
    const p = (people ?? []).find((x) => x.id === uid);
    return { id: uid, name: p?.full_name ?? "Member", username: p?.username ?? null };
  });
  return <SettingsTab id={t.id} name={t.name} status={t.status} visibility={t.visibility} isOwner={isOwner} assistants={assistants} />;
}

async function FixturesSection({ t }: { t: TournamentRow }) {
  const supabase = await createClient();
  const [m, teams, st] = await Promise.all([
    supabase.from("matches").select("id, stage, round_no, match_no, team_a_id, team_b_id, label_a, label_b, scheduled_at, venue, status, fixture_published, result_published_at").eq("tournament_id", t.id).order("match_no").limit(400),
    supabase.from("teams").select("id, name").eq("tournament_id", t.id).eq("status", "approved").order("name").limit(64),
    supabase.from("standings").select("team_id, position").eq("tournament_id", t.id).order("position").limit(8),
  ]);
  const matches: FxMatch[] = (m.data ?? []).map((x) => ({ ...x, has_result: x.result_published_at !== null }));
  const firstStage = t.format === "groups_knockout" ? "group" : "league";
  const leagueMatches = matches.filter((x) => x.stage === firstStage);
  const leagueDone = leagueMatches.length > 0 && leagueMatches.every((x) => x.has_result);
  const teamList = teams.data ?? [];
  const top = (st.data ?? []).slice(0, t.format === "groups_knockout" ? 0 : t.playoff_style === "top2_final" ? 2 : t.playoff_style === "top8_quarters" ? 8 : 4).map((x) => teamList.find((tm) => tm.id === x.team_id)?.name ?? "");
  const canGenerate = ["registration_closed", "auction", "squads_locked", "live"].includes(t.status) && teamList.length >= 3;
  return <FixturesTab tournamentId={t.id} status={t.status} format={t.format} legs={t.league_legs} playoffStyle={t.playoff_style} thirdPlace={t.third_place_match} groupCount={t.group_count} advancePerGroup={t.advance_per_group} teamCount={t.team_count} teams={teamList} matches={matches} standingsTop={top.filter(Boolean)} canGenerate={canGenerate} leagueDone={leagueDone} defaultStart={t.start_date ?? ""} />;
}

async function ResultsSection({ t }: { t: TournamentRow }) {
  const supabase = await createClient();
  const [m, teams] = await Promise.all([
    supabase.from("matches").select("id, match_no, team_a_id, team_b_id, label_a, label_b, scheduled_at, status, result_published_at").eq("tournament_id", t.id).eq("fixture_published", true).order("scheduled_at", { ascending: true, nullsFirst: false }).order("match_no").limit(400),
    supabase.from("teams").select("id, name").eq("tournament_id", t.id).limit(64),
  ]);
  const nm = (id: string | null, label: string | null) => (id ? teams.data?.find((x) => x.id === id)?.name : null) ?? label ?? "TBD";
  const rows: ResMatch[] = (m.data ?? []).map((x) => ({ id: x.id, match_no: x.match_no, a: nm(x.team_a_id, x.label_a), b: nm(x.team_b_id, x.label_b), ready: Boolean(x.team_a_id && x.team_b_id), scheduled_at: x.scheduled_at, status: x.status, published: x.result_published_at !== null }));
  return <ResultsTab tournamentId={t.id} matches={rows} canAct={["squads_locked", "live"].includes(t.status)} />;
}

async function AuctionSection({ t }: { t: TournamentRow }) {
  const supabase = await createClient();
  const [settings, teams, purses, pool, lots] = await Promise.all([
    supabase.from("auction_settings").select("mode, status, pool_locked, scheduled_at, sequence_mode").eq("tournament_id", t.id).maybeSingle(),
    supabase.from("teams").select("id, name, manager_id").eq("tournament_id", t.id).eq("status", "approved").order("name").limit(64),
    supabase.from("team_purses").select("team_id").eq("tournament_id", t.id).limit(64),
    supabase.from("pool_players").select("user_id, category, base_price, sequence_no, lot_status").eq("tournament_id", t.id).limit(1000),
    supabase.from("auction_lots").select("player_id, status, sold_price, sold_team_id").eq("tournament_id", t.id).in("status", ["sold", "unsold"]).limit(1000),
  ]);
  const s = settings.data;
  const approved = teams.data ?? [];
  const poolRows = pool.data ?? [];
  const ids = [...new Set([...(lots.data ?? []).map((l) => l.player_id), ...poolRows.filter((p) => p.lot_status !== "sold").map((p) => p.user_id)])];
  const names = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabase.from("public_profiles").select("id, full_name").in("id", ids.slice(i, i + 100));
    for (const p of data ?? []) if (p.id) names.set(p.id, p.full_name ?? "Player");
  }
  const checks = [
    { label: "Player pool is locked", ok: Boolean(s?.pool_locked), hint: "Set categories and base prices, then lock the pool." },
    { label: "At least 2 approved teams", ok: approved.length >= 2, hint: "Approve more teams in the Teams tab." },
    { label: "Every approved team has a manager", ok: approved.length > 0 && approved.every((x) => x.manager_id), hint: "Invite managers for teams without one." },
    { label: "Team purses are created", ok: approved.length > 0 && (purses.data ?? []).length >= approved.length, hint: "Purses are created when you lock the pool." },
    { label: "Player order is set", ok: s?.sequence_mode !== "manual" || (poolRows.length > 0 && poolRows.every((p) => p.sequence_no !== null)), hint: "Drag players into order in the Players tab." },
  ];
  const sold: SoldRow[] = (lots.data ?? []).map((l) => ({ player: names.get(l.player_id) ?? "Player", category: poolRows.find((p) => p.user_id === l.player_id)?.category ?? null, team: approved.find((x) => x.id === l.sold_team_id)?.name ?? null, price: l.sold_price, status: l.status }));
  const simple: SimpleLot[] = poolRows.filter((p) => p.lot_status === "upcoming" || p.lot_status === "unsold").map((p) => ({ id: p.user_id, name: names.get(p.user_id) ?? "Player", base: p.base_price, category: p.category }));
  return <AuctionTab tournamentId={t.id} mode={s?.mode === "simple" ? "simple" : "live"} status={s?.status ?? "not_scheduled"} poolLocked={Boolean(s?.pool_locked)} scheduledAt={s?.scheduled_at ?? ""} checks={checks} canLock={t.status === "registration_closed"} sold={sold} lots={simple} teams={approved.map((x) => ({ id: x.id, name: x.name }))} />;
}
