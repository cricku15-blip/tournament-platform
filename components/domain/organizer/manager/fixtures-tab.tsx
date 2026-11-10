"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { changeStatus } from "@/app/(app)/organizer/actions";
import { generateFixtures, setFixturesPublished, updateMatch } from "@/app/(app)/organizer/tournaments/[id]/matches/actions";
import { countMatches, type PlayoffStyle } from "@/lib/organizer/match-count";
import { isoToLocal } from "@/lib/organizer/datetime";
import { formatDateTime } from "@/lib/format";

export interface FxMatch {
  id: string;
  stage: string;
  round_no: number | null;
  match_no: number | null;
  team_a_id: string | null;
  team_b_id: string | null;
  label_a: string | null;
  label_b: string | null;
  scheduled_at: string | null;
  venue: string | null;
  status: string;
  fixture_published: boolean;
  has_result: boolean;
}
export interface FxTeam { id: string; name: string }

const STAGE: Record<string, string> = { league: "League", semi: "Semi-finals", final: "Final", third_place: "Third place", qualifier1: "Qualifier 1", qualifier2: "Qualifier 2", eliminator: "Eliminator", quarter: "Quarter-finals" };

export function FixturesTab({
  tournamentId, status, format, legs, playoffStyle, thirdPlace, teamCount, teams, matches, standingsTop, canGenerate, leagueDone, defaultStart,
}: {
  tournamentId: string; status: string; format: string; legs: number; playoffStyle: string | null; thirdPlace: boolean; teamCount: number;
  teams: FxTeam[]; matches: FxMatch[]; standingsTop: string[]; canGenerate: boolean; leagueDone: boolean; defaultStart: string;
}) {
  const router = useRouter();
  const [genOpen, setGenOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"generate" | "playoffs">("generate");
  const [start, setStart] = React.useState(defaultStart);
  const [perDay, setPerDay] = React.useState(2);
  const [times, setTimes] = React.useState("10:00, 14:00");
  const [venues, setVenues] = React.useState("");
  const [order, setOrder] = React.useState<string[] | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [edit, setEdit] = React.useState<FxMatch | null>(null);
  const [confirmRegen, setConfirmRegen] = React.useState(false);
  const nameOf = (id: string | null, label: string | null) => teams.find((t) => t.id === id)?.name ?? label ?? "TBD";
  const total = countMatches({ format: format as "league", teams: teams.length || teamCount, legs: legs === 2 ? 2 : 1, playoffStyle: (playoffStyle as PlayoffStyle) ?? null, thirdPlace });
  const published = matches.filter((m) => m.fixture_published).length;
  const hasResults = matches.some((m) => m.has_result);

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) {
    setBusy(key);
    setError(null);
    const r = await fn();
    setBusy(null);
    if (!r.ok) {
      setError(r.error ?? "Something went wrong.");
      return false;
    }
    if (okMsg) toast({ title: okMsg });
    router.refresh();
    return true;
  }

  async function generate() {
    const ok = await run("gen", () =>
      generateFixtures(tournamentId, {
        action: mode, startDate: start || undefined, matchesPerDay: perDay,
        times: times.split(",").map((x) => x.trim()).filter(Boolean),
        venues: venues.split(",").map((x) => x.trim()).filter(Boolean),
        manualOrder: mode === "generate" && order ? order : undefined,
      }),
      mode === "generate" ? "Fixtures generated (not published yet)" : "Playoffs created"
    );
    if (ok) setGenOpen(false);
  }

  const groups = new Map<string, FxMatch[]>();
  for (const m of matches) {
    const key = m.stage === "league" ? `League · Round ${m.round_no ?? 1}` : STAGE[m.stage] ?? m.stage;
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  const moveTeam = (i: number, d: -1 | 1) => {
    const o = [...(order ?? teams.map((t) => t.id))];
    const j = i + d;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]];
    setOrder(o);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2 rounded-card border border-line bg-card p-4">
        <div className="mr-auto">
          <p className="font-semibold">{matches.length === 0 ? "No fixtures yet" : `${matches.length} matches · ${published} published`}</p>
          <p className="text-sm text-muted">Format: {format.replace("_", " ")} · {teams.length} approved teams · {total.total} matches expected</p>
        </div>
        <Button onClick={() => { setMode("generate"); if (matches.length) setConfirmRegen(true); else setGenOpen(true); }} disabled={!canGenerate || hasResults} title={hasResults ? "Results exist, fixtures can't be regenerated" : undefined}>
          {matches.length ? "Regenerate" : "Generate fixtures"}
        </Button>
        {format === "league_playoffs" && (
          <Button variant="secondary" disabled={!leagueDone || !canGenerate} onClick={() => { setMode("playoffs"); setGenOpen(true); }}>Start playoffs</Button>
        )}
        {matches.length > 0 && (
          <>
            <Button variant="secondary" loading={busy === "pub"} onClick={() => run("pub", () => setFixturesPublished(tournamentId, "all", true), "Fixtures published")} disabled={published === matches.length}>Publish all</Button>
            <Button variant="secondary" disabled={selected.size === 0} loading={busy === "pubsel"} onClick={() => run("pubsel", () => setFixturesPublished(tournamentId, [...selected], true), "Selected fixtures published")}>Publish selected ({selected.size})</Button>
            {published > 0 && <Button variant="ghost" loading={busy === "unpub"} onClick={() => run("unpub", () => setFixturesPublished(tournamentId, "all", false), "Fixtures hidden")}>Unpublish</Button>}
          </>
        )}
        {status === "squads_locked" && published > 0 && <Button loading={busy === "live"} onClick={() => run("live", () => changeStatus(tournamentId, "goLive"), "Tournament is live")}>Go live</Button>}
        {status === "live" && <Button variant="secondary" loading={busy === "done"} onClick={() => run("done", () => changeStatus(tournamentId, "complete"), "Tournament completed")}>Complete tournament</Button>}
      </div>
      {!canGenerate && <p className="rounded-input border border-line bg-surface p-3 text-sm">Fixtures can be generated once registration is closed and at least 3 teams are approved.</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {[...groups.entries()].map(([label, ms]) => (
        <section key={label} aria-label={label}>
          <h2 className="mb-2 font-display text-lg font-bold">{label}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
            {ms.map((m) => (
              <li key={m.id} className="grid grid-cols-[24px_1fr_auto] items-center gap-3 p-3">
                <input type="checkbox" aria-label={`Select match ${m.match_no}`} checked={selected.has(m.id)} onChange={(e) => setSelected((s) => { const n = new Set(s); if (e.target.checked) n.add(m.id); else n.delete(m.id); return n; })} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">#{m.match_no} {nameOf(m.team_a_id, m.label_a)} vs {nameOf(m.team_b_id, m.label_b)}</p>
                  <p className="text-sm text-muted">{m.scheduled_at ? formatDateTime(m.scheduled_at) : "No date"}{m.venue ? ` · ${m.venue}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  {m.status !== "scheduled" && <Badge variant={m.status === "cancelled" ? "cancelled" : "neutral"}>{m.status}</Badge>}
                  <Badge variant={m.fixture_published ? "open" : "draft"}>{m.fixture_published ? "Published" : "Draft"}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => setEdit(m)}>Edit</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Sheet open={genOpen} onOpenChange={setGenOpen}>
        <SheetContent>
          <SheetHeader><SheetTitle>{mode === "generate" ? "Generate fixtures" : "Start playoffs"}</SheetTitle></SheetHeader>
          <div className="mt-4 flex flex-col gap-4 text-sm">
            <p className="rounded-input bg-surface p-3">{mode === "generate" ? `${format.replace("_", " ")} with ${teams.length} teams: ${total.league + (format === "knockout" ? total.playoffs : 0)} matches${format === "league_playoffs" ? ` now, ${total.playoffs} more in the playoffs` : ""}.` : `Qualifying teams: ${standingsTop.join(", ") || "from the table"}.`}</p>
            <label>Start date<Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label>Matches per day (limited to what avoids one team playing twice)<Input type="number" min={1} max={6} value={perDay} onChange={(e) => setPerDay(Math.max(1, Number(e.target.value) || 1))} /></label>
            <label>Time slots (HH:MM, comma separated)<Input value={times} onChange={(e) => setTimes(e.target.value)} /></label>
            <label>Venues or grounds (comma separated, optional)<Input value={venues} onChange={(e) => setVenues(e.target.value)} placeholder="Ground 1, Ground 2" /></label>
            {mode === "generate" && (
              <fieldset>
                <legend className="mb-1 font-semibold">Seeding</legend>
                <div className="mb-2 flex gap-2">
                  <Button type="button" size="sm" variant={order ? "secondary" : "primary"} onClick={() => setOrder(null)}>Random</Button>
                  <Button type="button" size="sm" variant={order ? "primary" : "secondary"} onClick={() => setOrder(teams.map((t) => t.id))}>Manual order</Button>
                </div>
                {order && (
                  <ol className="flex flex-col gap-1">
                    {order.map((id, i) => (
                      <li key={id} className="flex items-center gap-2 rounded-input border border-line px-3 py-1">
                        <span className="w-5 font-bold">{i + 1}</span><span className="flex-1">{teams.find((t) => t.id === id)?.name}</span>
                        <Button type="button" size="sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => moveTeam(i, -1)}>↑</Button>
                        <Button type="button" size="sm" variant="ghost" aria-label="Move down" disabled={i === order.length - 1} onClick={() => moveTeam(i, 1)}>↓</Button>
                      </li>
                    ))}
                  </ol>
                )}
              </fieldset>
            )}
            {error && <p role="alert" className="text-danger">{error}</p>}
            <Button onClick={generate} loading={busy === "gen"}>{mode === "generate" ? "Generate" : "Create playoffs"}</Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog open={confirmRegen} onOpenChange={setConfirmRegen} title="Regenerate fixtures?" description="This replaces the current draft schedule, including any edits. Published matches will be re-created as drafts." confirmLabel="Regenerate" variant="destructive" onConfirm={() => setGenOpen(true)} />
      <EditSheet match={edit} teams={teams} onClose={() => setEdit(null)} tournamentId={tournamentId} onDone={() => { setEdit(null); router.refresh(); }} />
    </div>
  );
}

function EditSheet({ match, teams, tournamentId, onClose, onDone }: { match: FxMatch | null; teams: FxTeam[]; tournamentId: string; onClose: () => void; onDone: () => void }) {
  const [when, setWhen] = React.useState("");
  const [venue, setVenue] = React.useState("");
  const [a, setA] = React.useState("");
  const [b, setB] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!match) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the selected match into the form
    setWhen(isoToLocal(match.scheduled_at)); setVenue(match.venue ?? ""); setA(match.team_a_id ?? ""); setB(match.team_b_id ?? ""); setReason(""); setError(null);
  }, [match]);
  if (!match) return null;
  const locked = match.has_result || ["live", "completed"].includes(match.status);
  async function save(status?: "postponed" | "cancelled" | "scheduled") {
    setBusy(true);
    setError(null);
    const r = await updateMatch(tournamentId, match!.id, { scheduledAt: when || null, venue, ...(locked || !match!.team_a_id ? {} : { teamAId: a || null, teamBId: b || null }), ...(status ? { status, reason } : {}) });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast({ title: "Match updated" });
    onDone();
  }
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader><SheetTitle>Edit match #{match.match_no}</SheetTitle></SheetHeader>
        <div className="mt-4 flex flex-col gap-3 text-sm">
          {match.has_result && <p role="alert" className="rounded-input border border-floodlight/60 bg-floodlight/15 p-3">This match already has a result. Changing its date or venue is fine, but teams are locked.</p>}
          <label>Date and time<Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
          <label>Venue<Input value={venue} maxLength={100} onChange={(e) => setVenue(e.target.value)} /></label>
          {!locked && match.team_a_id && (
            <div className="grid grid-cols-2 gap-2">
              <label>Team A<select className="h-11 w-full rounded-input border border-line bg-card px-2" value={a} onChange={(e) => setA(e.target.value)}>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
              <label>Team B<select className="h-11 w-full rounded-input border border-line bg-card px-2" value={b} onChange={(e) => setB(e.target.value)}>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            </div>
          )}
          <label>Reason (needed to postpone or cancel)<Input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} /></label>
          {error && <p role="alert" className="text-danger">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save()} loading={busy}>Save</Button>
            <Button variant="secondary" disabled={!reason.trim() || locked} onClick={() => save("postponed")}>Postpone</Button>
            <Button variant="destructive" disabled={!reason.trim() || locked} onClick={() => save("cancelled")}>Cancel match</Button>
            {["postponed", "cancelled"].includes(match.status) && <Button variant="ghost" onClick={() => save("scheduled")}>Reschedule</Button>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
