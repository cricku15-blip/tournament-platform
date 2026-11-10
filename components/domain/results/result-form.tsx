"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { saveResult } from "@/app/(app)/organizer/tournaments/[id]/matches/actions";
import { checkCricket, checkFootball, economy, nrrBalls, oversToBalls, strikeRate, suggestCricket, suggestFootball } from "@/lib/results/logic";
import { cn } from "@/lib/utils";
import { DISMISSALS, EVENT_TYPES, POSITIONS, type EventRow, type FormState, type Player, type Side, type TeamInfo } from "./types";

const sel = "h-11 w-full rounded-input border border-line bg-card px-2 text-sm focus-visible:outline-2 focus-visible:outline-primary";
const cell = "h-11 w-full min-w-14 rounded-input border border-line bg-card px-2 text-center tabular-nums text-sm";

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Num({ label, value, onChange, max }: { label: string; value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <input
      aria-label={label}
      className={cell}
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      value={Number.isNaN(value) ? "" : value}
      onFocus={(e) => e.target.select()}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Math.max(0, Math.floor(Number(e.target.value))))}
    />
  );
}

function PlayerSelect({ label, value, onChange, players, empty = "Choose player" }: { label: string; value: string; onChange: (v: string) => void; players: Player[]; empty?: string }) {
  return (
    <select aria-label={label} className={sel} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{empty}</option>
      {players.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

export function ResultForm({
  tournamentId,
  matchId,
  sport,
  teams,
  initial,
  updatedAt: initialUpdatedAt,
  published,
  overs,
  playersPerSide,
  dateLabel,
}: {
  tournamentId: string;
  matchId: string;
  sport: "cricket" | "football";
  teams: Record<Side, TeamInfo>;
  initial: FormState;
  updatedAt: string;
  published: boolean;
  overs: number;
  playersPerSide: number;
  dateLabel: string;
}) {
  const router = useRouter();
  const [s, setS] = React.useState(initial);
  const [updatedAt, setUpdatedAt] = React.useState(initialUpdatedAt);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState<"" | "draft" | "publish">("");
  const [error, setError] = React.useState<string | null>(null);
  const [stale, setStale] = React.useState(false);
  const [warnings, setWarnings] = React.useState<string[] | null>(null);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const cricket = sport === "cricket";
  const names: Record<Side, string> = { a: teams.a.name, b: teams.b.name };
  const set = (p: Partial<FormState>) => {
    setS((x) => ({ ...x, ...p }));
    setDirty(true);
  };
  const other = (x: Side): Side => (x === "a" ? "b" : "a");
  const batSide = (innings: 1 | 2): Side => (innings === 1 ? s.battedFirst : other(s.battedFirst));
  const allPlayers = [...teams.a.players, ...teams.b.players];

  const toPayload = React.useCallback(() => {
    const teamOf = (side: Side) => teams[side].id;
    const score = (side: Side) =>
      cricket
        ? (() => {
            const t = s.totals[side];
            const balls = oversToBalls(t.overs) ?? 0;
            return { runs: t.runs, wickets: t.wickets, balls, extras: t.extras, balls_nrr: nrrBalls({ wickets: t.wickets, balls, overs, playersPerSide }) };
          })()
        : (() => {
            const f = s.fb[side];
            const n = (v: string) => (v === "" ? null : Number(v));
            return { goals: f.goals, ht: n(f.ht), et: n(f.et), pens: n(f.pens) };
          })();
    return {
      matchId, sport, resultType: s.resultType, winnerTeamId: s.winnerTeamId || null, resultText: s.resultText, pomId: s.pomId || null, notes: s.notes,
      scoreA: score("a"), scoreB: score("b"),
      toss: cricket ? { winner: s.toss.winner || undefined, decision: s.toss.decision || undefined, batted_first: s.battedFirst } : null,
      batting: s.batting.filter((r) => r.playerId).map((r) => ({ innings: r.innings, teamId: teamOf(batSide(r.innings)), playerId: r.playerId, runs: r.runs, balls: r.balls, fours: r.fours, sixes: r.sixes, dismissal: r.dismissal || null, bowlerId: r.bowlerId || null, fielderId: r.fielderId || null })),
      bowling: s.bowling.filter((r) => r.playerId).map((r) => ({ innings: r.innings, teamId: teamOf(other(batSide(r.innings))), playerId: r.playerId, ballsBowled: oversToBalls(r.overs) ?? 0, maidens: r.maidens, runs: r.runs, wickets: r.wickets, wides: r.wides, noBalls: r.noBalls })),
      fielding: s.fielding.filter((r) => r.playerId).map((r) => ({ playerId: r.playerId, catches: r.catches, runOuts: r.runOuts, stumpings: r.stumpings })),
      lineups: s.lineups.filter((r) => r.playerId).map((r) => ({ teamId: teamOf(r.side), playerId: r.playerId, isStarter: r.isStarter, position: (r.position || null) as never })),
      events: s.events.filter((e) => e.type).map((e) => ({ type: e.type as never, teamId: e.side ? teamOf(e.side) : null, playerId: e.playerId || null, assistId: e.assistId || null, minute: e.minute === "" ? null : Number(e.minute) })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, teams, sport]);

  const persist = React.useCallback(
    async (publish: boolean, silent = false): Promise<boolean> => {
      if (!silent) setError(null);
      setSaving(publish ? "publish" : "draft");
      const r = await saveResult(tournamentId, toPayload(), updatedAt, publish);
      setSaving("");
      if (!r.ok) {
        if (r.error.startsWith("This result was updated")) setStale(true);
        if (!silent) setError(r.error);
        return false;
      }
      setUpdatedAt(r.updatedAt);
      setDirty(false);
      setSavedAt(new Date());
      return true;
    },
    [tournamentId, toPayload, updatedAt]
  );

  // Autosave a draft every 10 s while there are unsaved edits and nothing else is running.
  React.useEffect(() => {
    if (!dirty || saving || stale || !s.resultType) return;
    const t = setTimeout(() => void persist(false, true), 10000);
    return () => clearTimeout(t);
  }, [dirty, saving, stale, s, persist, published]);

  React.useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  function suggest() {
    if (cricket) {
      const bf = (side: Side) => ({ runs: s.totals[side].runs, wickets: s.totals[side].wickets, balls: oversToBalls(s.totals[side].overs) ?? 0 });
      const r = suggestCricket({ battedFirst: s.battedFirst, a: bf("a"), b: bf("b"), names, playersPerSide });
      set({ resultType: r.resultType, winnerTeamId: r.winner ? teams[r.winner].id : "", resultText: r.text });
    } else {
      const sc = (side: Side) => ({ goals: s.fb[side].goals, pens: s.fb[side].pens === "" ? null : Number(s.fb[side].pens) });
      const r = suggestFootball({ a: sc("a"), b: sc("b"), names });
      set({ resultType: r.resultType === "tie" ? "draw" : r.resultType, winnerTeamId: r.winner ? teams[r.winner].id : "", resultText: r.text });
    }
  }

  async function publish(force = false) {
    setError(null);
    if (!s.resultType) return setError("Choose how the match ended first.");
    if (["win", "walkover"].includes(s.resultType) && !s.winnerTeamId) return setError("Choose the winning team.");
    if (!force) {
      const w = cricket
        ? checkCricket({ totals: { a: s.totals.a, b: s.totals.b }, battedFirst: s.battedFirst, batting: s.batting.filter((r) => r.playerId).map((r) => ({ innings: r.innings, runs: r.runs, dismissal: r.dismissal })), bowling: s.bowling.filter((r) => r.playerId).map((r) => ({ innings: r.innings, wickets: r.wickets, runs: r.runs })) })
        : checkFootball({ goals: { a: s.fb.a.goals, b: s.fb.b.goals }, events: s.events.map((e) => ({ type: e.type, team: e.side || null })), lineupsA: s.lineups.filter((l) => l.side === "a").length, lineupsB: s.lineups.filter((l) => l.side === "b").length });
      if (w.length > 0) return setWarnings(w);
    }
    setWarnings(null);
    if (await persist(true)) {
      toast({ title: published ? "Result updated" : "Result published" });
      router.push(`/organizer/tournaments/${tournamentId}?tab=results`);
      router.refresh();
    }
  }

  async function draft() {
    if (await persist(false)) toast({ title: "Draft saved" });
  }

  const updateRow = <K extends "batting" | "bowling" | "fielding" | "lineups" | "events">(key: K, i: number, patch: Partial<FormState[K][number]>) =>
    set({ [key]: (s[key] as unknown[]).map((r, j) => (j === i ? { ...(r as object), ...patch } : r)) } as Partial<FormState>);
  const removeRow = (key: "batting" | "bowling" | "fielding" | "lineups" | "events", i: number) => set({ [key]: (s[key] as unknown[]).filter((_, j) => j !== i) } as Partial<FormState>);

  const RemoveBtn = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <Button type="button" variant="ghost" size="sm" aria-label={label} onClick={onClick}>
      <Trash2 className="h-4 w-4" aria-hidden />
    </Button>
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 pb-28">
      <header className="rounded-card border border-line bg-card p-5 text-center">
        <p className="text-sm text-muted">{dateLabel}</p>
        <h1 className="font-display text-3xl font-bold">
          {teams.a.name} <span className="text-muted">vs</span> {teams.b.name}
        </h1>
        {published && <p className="mt-1 text-sm text-primary">This result is published. Saving changes and publishing again recomputes standings.</p>}
      </header>

      {stale && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          <span>This result was updated by someone else. Reload to see changes.</span>
          <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      )}

      {cricket ? (
        <>
          <Card title="Toss">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">Toss won by<select className={sel} value={s.toss.winner} onChange={(e) => set({ toss: { ...s.toss, winner: e.target.value as "" | Side } })}><option value="">Not recorded</option><option value="a">{names.a}</option><option value="b">{names.b}</option></select></label>
              <label className="text-sm">Chose to<select className={sel} value={s.toss.decision} onChange={(e) => { const decision = e.target.value as "" | "bat" | "bowl"; const bf = s.toss.winner && decision ? (decision === "bat" ? s.toss.winner : other(s.toss.winner)) : s.battedFirst; set({ toss: { ...s.toss, decision }, battedFirst: bf as Side }); }}><option value="">Not recorded</option><option value="bat">Bat</option><option value="bowl">Bowl</option></select></label>
              <label className="text-sm">Batted first<select className={sel} value={s.battedFirst} onChange={(e) => set({ battedFirst: e.target.value as Side })}><option value="a">{names.a}</option><option value="b">{names.b}</option></select></label>
            </div>
          </Card>

          {([1, 2] as const).map((inn) => {
            const bat = batSide(inn);
            const bowl = other(bat);
            const t = s.totals[bat];
            return (
              <Card key={inn} title={`Innings ${inn}: ${names[bat]}`}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <label className="text-sm">Runs<Num label={`${names[bat]} runs`} value={t.runs} onChange={(n) => set({ totals: { ...s.totals, [bat]: { ...t, runs: n } } })} /></label>
                  <label className="text-sm">Wickets<Num label={`${names[bat]} wickets`} value={t.wickets} max={10} onChange={(n) => set({ totals: { ...s.totals, [bat]: { ...t, wickets: n } } })} /></label>
                  <label className="text-sm">Overs faced<input aria-label={`${names[bat]} overs`} className={cell} inputMode="decimal" value={t.overs} onFocus={(e) => e.target.select()} onChange={(e) => set({ totals: { ...s.totals, [bat]: { ...t, overs: e.target.value } } })} /></label>
                  <label className="text-sm">Extras<Num label={`${names[bat]} extras`} value={t.extras} onChange={(n) => set({ totals: { ...s.totals, [bat]: { ...t, extras: n } } })} /></label>
                </div>
                {oversToBalls(t.overs) === null && <p role="alert" className="mt-1 text-xs text-danger">Overs look like 13.4 (the digit after the dot is balls, 0 to 5).</p>}

                <h3 className="mb-2 mt-5 font-semibold">Batting</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="text-left text-xs uppercase text-muted"><tr><th className="pb-1">Batter</th><th>Dismissal</th><th>Bowler</th><th>Fielder</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th><th /></tr></thead>
                    <tbody>
                      {s.batting.map((r, i) => r.innings === inn && (
                        <tr key={i} className="align-top">
                          <td className="pr-1 pb-1"><PlayerSelect label="Batter" value={r.playerId} onChange={(v) => updateRow("batting", i, { playerId: v })} players={teams[bat].players} /></td>
                          <td className="pr-1"><select aria-label="Dismissal" className={sel} value={r.dismissal} onChange={(e) => updateRow("batting", i, { dismissal: e.target.value })}>{DISMISSALS.map((d) => <option key={d}>{d}</option>)}</select></td>
                          <td className="pr-1"><PlayerSelect label="Bowler" value={r.bowlerId} onChange={(v) => updateRow("batting", i, { bowlerId: v })} players={teams[bowl].players} empty="–" /></td>
                          <td className="pr-1"><PlayerSelect label="Fielder" value={r.fielderId} onChange={(v) => updateRow("batting", i, { fielderId: v })} players={teams[bowl].players} empty="–" /></td>
                          <td className="pr-1"><Num label="Runs" value={r.runs} onChange={(n) => updateRow("batting", i, { runs: n })} /></td>
                          <td className="pr-1"><Num label="Balls" value={r.balls} onChange={(n) => updateRow("batting", i, { balls: n })} /></td>
                          <td className="pr-1"><Num label="Fours" value={r.fours} onChange={(n) => updateRow("batting", i, { fours: n })} /></td>
                          <td className="pr-1"><Num label="Sixes" value={r.sixes} onChange={(n) => updateRow("batting", i, { sixes: n })} /></td>
                          <td className="px-1 pt-3 text-center tabular-nums text-muted">{strikeRate(r.runs, r.balls)}</td>
                          <td><RemoveBtn label="Remove batter" onClick={() => removeRow("batting", i)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => set({ batting: [...s.batting, { innings: inn, playerId: "", runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: "Not out", bowlerId: "", fielderId: "" }] })}><Plus className="h-4 w-4" aria-hidden /> Add batter</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { const have = new Set(s.batting.filter((r) => r.innings === inn).map((r) => r.playerId)); set({ batting: [...s.batting, ...teams[bat].players.filter((p) => !have.has(p.id)).slice(0, playersPerSide).map((p) => ({ innings: inn, playerId: p.id, runs: 0, balls: 0, fours: 0, sixes: 0, dismissal: "Not out", bowlerId: "", fielderId: "" }))] }); }}>Add whole squad</Button>
                </div>

                <h3 className="mb-2 mt-5 font-semibold">Bowling ({names[bowl]})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="text-left text-xs uppercase text-muted"><tr><th className="pb-1">Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Wd</th><th>Nb</th><th>Econ</th><th /></tr></thead>
                    <tbody>
                      {s.bowling.map((r, i) => r.innings === inn && (
                        <tr key={i} className="align-top">
                          <td className="pr-1 pb-1"><PlayerSelect label="Bowler" value={r.playerId} onChange={(v) => updateRow("bowling", i, { playerId: v })} players={teams[bowl].players} /></td>
                          <td className="pr-1"><input aria-label="Overs bowled" className={cell} inputMode="decimal" value={r.overs} onFocus={(e) => e.target.select()} onChange={(e) => updateRow("bowling", i, { overs: e.target.value })} /></td>
                          <td className="pr-1"><Num label="Maidens" value={r.maidens} onChange={(n) => updateRow("bowling", i, { maidens: n })} /></td>
                          <td className="pr-1"><Num label="Runs conceded" value={r.runs} onChange={(n) => updateRow("bowling", i, { runs: n })} /></td>
                          <td className="pr-1"><Num label="Wickets" value={r.wickets} max={10} onChange={(n) => updateRow("bowling", i, { wickets: n })} /></td>
                          <td className="pr-1"><Num label="Wides" value={r.wides} onChange={(n) => updateRow("bowling", i, { wides: n })} /></td>
                          <td className="pr-1"><Num label="No balls" value={r.noBalls} onChange={(n) => updateRow("bowling", i, { noBalls: n })} /></td>
                          <td className="px-1 pt-3 text-center tabular-nums text-muted">{economy(r.runs, oversToBalls(r.overs) ?? 0)}</td>
                          <td><RemoveBtn label="Remove bowler" onClick={() => removeRow("bowling", i)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => set({ bowling: [...s.bowling, { innings: inn, playerId: "", overs: "0.0", maidens: 0, runs: 0, wickets: 0, wides: 0, noBalls: 0 }] })}><Plus className="h-4 w-4" aria-hidden /> Add bowler</Button>
              </Card>
            );
          })}

          <Card title="Fielding (optional)">
            {s.fielding.map((r, i) => (
              <div key={i} className="mb-2 grid grid-cols-[1fr_70px_70px_70px_44px] items-center gap-2">
                <PlayerSelect label="Fielder" value={r.playerId} onChange={(v) => updateRow("fielding", i, { playerId: v })} players={allPlayers} />
                <Num label="Catches" value={r.catches} onChange={(n) => updateRow("fielding", i, { catches: n })} />
                <Num label="Run outs" value={r.runOuts} onChange={(n) => updateRow("fielding", i, { runOuts: n })} />
                <Num label="Stumpings" value={r.stumpings} onChange={(n) => updateRow("fielding", i, { stumpings: n })} />
                <RemoveBtn label="Remove fielder" onClick={() => removeRow("fielding", i)} />
              </div>
            ))}
            <p className="mb-2 text-xs text-muted">Columns: catches, run outs, stumpings.</p>
            <Button type="button" size="sm" variant="secondary" onClick={() => set({ fielding: [...s.fielding, { playerId: "", catches: 0, runOuts: 0, stumpings: 0 }] })}><Plus className="h-4 w-4" aria-hidden /> Add fielder</Button>
          </Card>
        </>
      ) : (
        <>
          <Card title="Score">
            <div className="grid gap-4 sm:grid-cols-2">
              {(["a", "b"] as const).map((side) => (
                <div key={side}>
                  <p className="mb-2 font-semibold">{names[side]}</p>
                  <div className="grid grid-cols-4 gap-2">
                    <label className="text-xs">Full time<Num label={`${names[side]} goals`} value={s.fb[side].goals} onChange={(n) => set({ fb: { ...s.fb, [side]: { ...s.fb[side], goals: n } } })} /></label>
                    {(["ht", "et", "pens"] as const).map((k) => (
                      <label key={k} className="text-xs">{k === "ht" ? "Half time" : k === "et" ? "Extra time" : "Penalties"}<input aria-label={`${names[side]} ${k}`} className={cell} inputMode="numeric" value={s.fb[side][k]} onFocus={(e) => e.target.select()} onChange={(e) => set({ fb: { ...s.fb, [side]: { ...s.fb[side], [k]: e.target.value.replace(/\D/g, "").slice(0, 3) } } })} /></label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Lineups" right={<Button type="button" size="sm" variant="ghost" onClick={() => { const have = new Set(s.lineups.map((l) => l.playerId)); const add = (["a", "b"] as const).flatMap((side) => teams[side].players.filter((p) => !have.has(p.id)).map((p) => ({ side, playerId: p.id, isStarter: true, position: "" }))); set({ lineups: [...s.lineups, ...add] }); }}>Add both squads</Button>}>
            <p className="mb-2 text-xs text-muted">Set the position for goalkeepers so clean sheets are counted.</p>
            {(["a", "b"] as const).map((side) => (
              <div key={side} className="mb-4">
                <p className="mb-1 font-semibold">{names[side]}</p>
                {s.lineups.map((r, i) => r.side === side && (
                  <div key={i} className="mb-2 grid grid-cols-[1fr_130px_90px_44px] items-center gap-2">
                    <PlayerSelect label="Player" value={r.playerId} onChange={(v) => updateRow("lineups", i, { playerId: v })} players={teams[side].players} />
                    <select aria-label="Position" className={sel} value={r.position} onChange={(e) => updateRow("lineups", i, { position: e.target.value })}><option value="">Position</option>{POSITIONS.map((p) => <option key={p}>{p}</option>)}</select>
                    <label className="flex min-h-11 items-center gap-1 text-sm"><input type="checkbox" checked={r.isStarter} onChange={(e) => updateRow("lineups", i, { isStarter: e.target.checked })} /> Starter</label>
                    <RemoveBtn label="Remove from lineup" onClick={() => removeRow("lineups", i)} />
                  </div>
                ))}
                <Button type="button" size="sm" variant="secondary" onClick={() => set({ lineups: [...s.lineups, { side, playerId: "", isStarter: true, position: "" }] })}><Plus className="h-4 w-4" aria-hidden /> Add player</Button>
              </div>
            ))}
          </Card>
          <Card title="Events">
            {s.events.map((e: EventRow, i) => {
              const pool = e.side ? teams[e.side].players : allPlayers;
              return (
                <div key={i} className="mb-2 grid grid-cols-2 items-center gap-2 sm:grid-cols-[130px_110px_1fr_1fr_70px_44px]">
                  <select aria-label="Event type" className={sel} value={e.type} onChange={(ev) => updateRow("events", i, { type: ev.target.value })}>{EVENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                  <select aria-label="Team" className={sel} value={e.side} onChange={(ev) => updateRow("events", i, { side: ev.target.value as Side | "" })}><option value="">Team</option><option value="a">{names.a}</option><option value="b">{names.b}</option></select>
                  <PlayerSelect label="Player" value={e.playerId} onChange={(v) => updateRow("events", i, { playerId: v })} players={pool} />
                  {["goal", "penalty_goal"].includes(e.type) ? <PlayerSelect label="Assist" value={e.assistId} onChange={(v) => updateRow("events", i, { assistId: v })} players={pool} empty="No assist" /> : <span />}
                  <input aria-label="Minute" className={cell} inputMode="numeric" placeholder="Min" value={e.minute} onChange={(ev) => updateRow("events", i, { minute: ev.target.value.replace(/\D/g, "").slice(0, 3) })} />
                  <RemoveBtn label="Remove event" onClick={() => removeRow("events", i)} />
                </div>
              );
            })}
            <Button type="button" size="sm" variant="secondary" onClick={() => set({ events: [...s.events, { type: "goal", side: "", playerId: "", assistId: "", minute: "" }] })}><Plus className="h-4 w-4" aria-hidden /> Add event</Button>
          </Card>
        </>
      )}

      <Card title="Result" right={<Button type="button" size="sm" variant="secondary" onClick={suggest}>Suggest from scores</Button>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">How did it end?
            <select className={sel} value={s.resultType} onChange={(e) => set({ resultType: e.target.value })}>
              <option value="">Choose</option><option value="win">Completed (a team won)</option><option value="tie">Tied</option><option value="draw">Drawn</option><option value="no_result">No result</option><option value="abandoned">Abandoned</option><option value="walkover">Walkover</option>
            </select>
          </label>
          <label className="text-sm">Winner
            <select className={sel} value={s.winnerTeamId} disabled={!["win", "walkover"].includes(s.resultType)} onChange={(e) => set({ winnerTeamId: e.target.value })}>
              <option value="">Choose</option><option value={teams.a.id}>{names.a}</option><option value={teams.b.id}>{names.b}</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2">Result line (shown publicly)<Input value={s.resultText} maxLength={200} onChange={(e) => set({ resultText: e.target.value })} placeholder="e.g. Strikers won by 12 runs" /></label>
          <label className="text-sm">Player of the match<PlayerSelect label="Player of the match" value={s.pomId} onChange={(v) => set({ pomId: v })} players={allPlayers} empty="Not chosen" /></label>
          <label className="text-sm sm:col-span-2">Notes<Textarea rows={2} maxLength={500} value={s.notes} onChange={(e) => set({ notes: e.target.value })} /></label>
        </div>
      </Card>

      {warnings && (
        <div role="alert" className="rounded-card border border-floodlight/60 bg-floodlight/15 p-4 text-sm">
          <p className="font-semibold">Check these before publishing:</p>
          <ul className="mt-2 list-disc pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => publish(true)} loading={saving === "publish"}>Publish anyway</Button><Button size="sm" variant="secondary" onClick={() => setWarnings(null)}>Go back and fix</Button></div>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 p-3 backdrop-blur-xs">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <p className={cn("text-sm", dirty ? "font-semibold" : "text-muted")} aria-live="polite">{saving ? "Saving…" : dirty ? "Unsaved changes (autosaves in 10 s)" : savedAt ? `Saved ${savedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : "No changes yet"}</p>
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link href={`/organizer/tournaments/${tournamentId}?tab=results`}>Back</Link></Button>
            <Button variant="secondary" onClick={draft} loading={saving === "draft"} disabled={!s.resultType || stale}>Save as draft</Button>
            <Button onClick={() => publish(false)} loading={saving === "publish"} disabled={stale}>{published ? "Update result" : "Publish result"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
