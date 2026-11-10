"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { ImageUploader } from "@/components/ui/image-uploader";
import { DatePicker } from "@/components/ui/date-picker";
import { formatINR } from "@/lib/format";
import { countMatches } from "@/lib/organizer/match-count";
import { AWARDS, CRICKET_OVERS, defaultOversPerBowler, validateSlabs } from "@/lib/organizer/schemas";
import { cn } from "@/lib/utils";
import { FormField, Group, Input, NumField, Select2, ToggleRow } from "./fields";
import type { CityOption, DraftState, SportOption, TierOption } from "./types";

export interface Locks {
  sport: boolean;
  city: boolean;
  squadMode: boolean;
  teamCount: boolean;
}

export interface StepProps {
  d: DraftState;
  patch: (p: Partial<DraftState>) => void;
  errors: Record<string, string>;
  locks: Locks;
  sports: SportOption[];
  cities: CityOption[];
  tiers: TierOption[];
  userId: string;
  slug?: { state: "idle" | "checking" | "ok" | "taken"; msg?: string; suggestions?: string[]; onPick: (s: string) => void; onEdit: (s: string) => void };
}

const sportSlug = (p: StepProps) => p.sports.find((s) => s.id === p.d.sportId)?.slug ?? "cricket";
const today = () => new Date().toISOString().slice(0, 10);

/* ---------------- Step 1 ---------------- */
export function BasicsStep(p: StepProps) {
  const { d, patch, errors, locks } = p;
  return (
    <Group>
      <FormField id="w-name" label="Tournament name" required error={errors.name}>
        <Input id="w-name" value={d.name} error={Boolean(errors.name)} onChange={(e) => patch({ name: e.target.value })} maxLength={80} />
      </FormField>
      {p.slug && (
        <FormField
          id="w-slug"
          label="Link name"
          required
          error={errors.slug}
          helper={p.slug.state === "checking" ? "Checking…" : p.slug.state === "ok" ? "Available." : p.slug.msg ?? "Shown in the web address. You can change it until you publish."}
        >
          <Input id="w-slug" value={d.slug} error={Boolean(errors.slug) || p.slug.state === "taken"} onChange={(e) => p.slug!.onEdit(e.target.value.toLowerCase())} />
          {p.slug.state === "taken" && p.slug.suggestions && (
            <div className="mt-2 flex flex-wrap gap-2" aria-label="Suggestions">
              {p.slug.suggestions.map((s) => (
                <Button key={s} type="button" size="sm" variant="secondary" onClick={() => p.slug!.onPick(s)}>
                  {s}
                </Button>
              ))}
            </div>
          )}
        </FormField>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="w-sport" label="Sport" required error={errors.sportId} helper={locks.sport ? "Can't be changed after payment." : undefined}>
          <Select2
            id="w-sport"
            value={d.sportId}
            disabled={locks.sport}
            onChange={(v) => patch({ sportId: v })}
            options={[{ value: "", label: "Choose a sport" }, ...p.sports.map((s) => ({ value: s.id, label: s.name }))]}
          />
        </FormField>
        <FormField id="w-city" label="City" required error={errors.cityId} helper={locks.city ? "Can't be changed after payment." : undefined}>
          <Combobox id="w-city" options={p.cities.map((c) => ({ value: c.id, label: c.name }))} value={d.cityId} onChange={(v) => patch({ cityId: v })} disabled={locks.city} error={Boolean(errors.cityId)} />
        </FormField>
        <FormField id="w-venue" label="Venue name" required error={errors.venueName}>
          <Input id="w-venue" value={d.venueName} error={Boolean(errors.venueName)} onChange={(e) => patch({ venueName: e.target.value })} maxLength={100} />
        </FormField>
        <FormField id="w-addr" label="Venue address or map link" error={errors.venueAddress}>
          <Input id="w-addr" value={d.venueAddress} onChange={(e) => patch({ venueAddress: e.target.value })} maxLength={500} />
        </FormField>
        <FormField id="w-start" label="Start date" required error={errors.startDate}>
          <DatePicker id="w-start" value={d.startDate || null} min={today()} onChange={(v) => patch({ startDate: v })} error={Boolean(errors.startDate)} />
        </FormField>
        <FormField id="w-end" label="End date" required error={errors.endDate}>
          <DatePicker id="w-end" value={d.endDate || null} min={d.startDate || today()} onChange={(v) => patch({ endDate: v })} error={Boolean(errors.endDate)} />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <FormField label="Banner image (16:9)">
          <ImageUploader bucket="tournament-banners" userId={p.userId} value={d.bannerUrl} onChange={(u) => patch({ bannerUrl: u })} aspectRatio="16:9" />
        </FormField>
        <FormField label="Logo (square)">
          <ImageUploader bucket="tournament-banners" userId={p.userId} value={d.logoUrl} onChange={(u) => patch({ logoUrl: u })} aspectRatio="1:1" maxWidth={600} />
        </FormField>
      </div>
      <FormField id="w-short" label={`Short description (${d.descriptionShort.length}/240)`} required error={errors.descriptionShort} helper="Shown on tournament cards.">
        <Textarea id="w-short" rows={2} maxLength={240} value={d.descriptionShort} onChange={(e) => patch({ descriptionShort: e.target.value })} />
      </FormField>
      <FormField id="w-full" label={`Full description (${d.descriptionFull.length}/4000)`} error={errors.descriptionFull} helper="Plain text. Blank lines start a new paragraph.">
        <Textarea id="w-full" rows={6} maxLength={4000} value={d.descriptionFull} onChange={(e) => patch({ descriptionFull: e.target.value })} />
      </FormField>
    </Group>
  );
}

/* ---------------- Step 2 ---------------- */
const FORMATS = [
  { v: "league", title: "League", text: "Everyone plays everyone. Points table decides the winner.", diagram: "A B C D → table" },
  { v: "knockout", title: "Knockout", text: "Lose and you're out. Winners advance to the final.", diagram: "A·B  C·D → final" },
  { v: "league_playoffs", title: "League then playoffs", text: "Round robin first, then the top teams play off.", diagram: "table → top 4 → final" },
] as const;

export function FormatStep(p: StepProps) {
  const { d, patch, errors, locks } = p;
  const maxTeams = Math.max(...p.tiers.map((t) => t.max_teams), 3);
  const minTeams = Math.min(...p.tiers.map((t) => t.min_teams), 3);
  const tier = p.tiers.find((t) => d.teamCount >= t.min_teams && d.teamCount <= t.max_teams);
  const count = countMatches({ format: d.format, teams: d.teamCount, legs: d.leagueLegs, playoffStyle: d.playoffStyle, thirdPlace: d.thirdPlaceMatch });
  const football = sportSlug(p) === "football";
  return (
    <Group>
      <div role="radiogroup" aria-label="Tournament format" className="grid gap-3 md:grid-cols-3">
        {FORMATS.map((f) => (
          <button
            key={f.v}
            type="button"
            role="radio"
            aria-checked={d.format === f.v}
            onClick={() => patch({ format: f.v, playoffStyle: f.v === "league_playoffs" ? d.playoffStyle ?? "top4" : null })}
            className={cn("min-h-11 rounded-card border p-4 text-left focus-visible:outline-2 focus-visible:outline-primary", d.format === f.v ? "border-primary bg-primary/10" : "border-line bg-card")}
          >
            <span className="block font-display text-lg font-bold">{f.title}</span>
            <span className="mt-1 block text-sm text-muted">{f.text}</span>
            <span aria-hidden className="mt-2 block rounded-input bg-surface px-2 py-1 font-mono text-xs text-muted">
              {f.diagram}
            </span>
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="w-teams" label="Number of teams" required error={errors.teamCount} helper={locks.teamCount ? "Can't be changed after payment." : undefined}>
          <Select2
            id="w-teams"
            value={String(d.teamCount)}
            disabled={locks.teamCount}
            onChange={(v) => patch({ teamCount: Number(v) })}
            options={Array.from({ length: maxTeams - minTeams + 1 }, (_, i) => ({ value: String(minTeams + i), label: `${minTeams + i} teams` }))}
          />
        </FormField>
        {d.format !== "knockout" && (
          <FormField id="w-legs" label="League rounds">
            <Select2 id="w-legs" value={String(d.leagueLegs)} onChange={(v) => patch({ leagueLegs: v === "2" ? 2 : 1 })} options={[{ value: "1", label: "Single round robin" }, { value: "2", label: "Double round robin" }]} />
          </FormField>
        )}
        {d.format === "league_playoffs" && (
          <FormField id="w-playoff" label="Playoff style" required error={errors.playoffStyle}>
            <Select2
              id="w-playoff"
              value={d.playoffStyle ?? "top4"}
              onChange={(v) => patch({ playoffStyle: v as DraftState["playoffStyle"] })}
              options={[
                { value: "top2", label: "Top 2 play the final" },
                { value: "top4", label: "Top 4 semi-finals" },
                ...(!football ? [{ value: "qualifier", label: "Top 4 qualifier style" }] : []),
              ]}
            />
          </FormField>
        )}
        {d.format === "knockout" && (
          <FormField id="w-seed" label="Seeding">
            <Select2 id="w-seed" value={d.seedingMethod} onChange={(v) => patch({ seedingMethod: v as DraftState["seedingMethod"] })} options={[{ value: "random", label: "Random" }, { value: "manual", label: "Manual (you set the order)" }]} />
          </FormField>
        )}
      </div>
      {d.format === "knockout" && football && <ToggleRow id="w-third" label="Third place match" checked={d.thirdPlaceMatch} onChange={(v) => patch({ thirdPlaceMatch: v })} />}

      <section aria-label="Calculated matches" className="rounded-card border border-line bg-surface p-4" aria-live="polite">
        <p className="text-sm text-muted">Total matches</p>
        <p className="font-display text-4xl font-bold text-ink">{count.total}</p>
        <p className="text-sm text-muted">
          {count.league > 0 && `${count.league} league`}
          {count.league > 0 && count.playoffs > 0 && " + "}
          {count.playoffs > 0 && `${count.playoffs} ${d.format === "knockout" ? "knockout" : "playoff"}`}
          {" · "}Matches per team: {count.perTeam}
        </p>
      </section>
      <section className="rounded-card border border-line bg-card p-4">
        <p className="text-sm text-muted">Your plan</p>
        {tier ? (
          <p className="font-semibold">
            {tier.name} · {formatINR(tier.amount_paise)} <span className="text-sm font-normal text-muted">(shown before tax; final amount is set at checkout)</span>
          </p>
        ) : (
          <p className="text-danger">No plan covers {d.teamCount} teams.</p>
        )}
      </section>
    </Group>
  );
}

/* ---------------- Step 3 (driven by sport config) ---------------- */
type R = Record<string, unknown>;

export function RulesStep(p: StepProps) {
  const { d, patch, errors } = p;
  const slug = sportSlug(p);
  const sport = p.sports.find((s) => s.id === d.sportId);
  const rules = d.rules as R;
  const set = (k: string, v: unknown) => patch({ rules: { ...rules, [k]: v } });
  const pts = (rules.points ?? {}) as Record<string, number>;
  const setPts = (k: string, v: number) => patch({ rules: { ...rules, points: { ...pts, [k]: v } } });
  const tb = (rules.tiebreakers ?? []) as string[];
  const moveTb = (i: number, dir: -1 | 1) => {
    const a = [...tb];
    const j = i + dir;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    set("tiebreakers", a);
  };
  const TB_LABEL: Record<string, string> = { nrr: "Net run rate", head_to_head: "Head to head", wins: "Most wins", goal_difference: "Goal difference", goals_for: "Goals scored", fair_play: "Fair play" };

  const tiebreakers = (
    <FormField label="Tie-breaker order">
      <ol className="flex flex-col gap-2">
        {tb.map((t, i) => (
          <li key={t} className="flex items-center gap-2 rounded-input border border-line px-3 py-2">
            <span className="w-5 font-bold">{i + 1}</span>
            <span className="flex-1">{TB_LABEL[t] ?? t}</span>
            <Button type="button" size="sm" variant="ghost" aria-label={`Move ${TB_LABEL[t] ?? t} up`} disabled={i === 0} onClick={() => moveTb(i, -1)}>↑</Button>
            <Button type="button" size="sm" variant="ghost" aria-label={`Move ${TB_LABEL[t] ?? t} down`} disabled={i === tb.length - 1} onClick={() => moveTb(i, 1)}>↓</Button>
          </li>
        ))}
      </ol>
    </FormField>
  );

  if (slug === "football") {
    const sizeByFormat: Record<string, { half: number; players: number }> = { "11": { half: 45, players: 11 }, "9": { half: 30, players: 9 }, "7": { half: 25, players: 7 }, "5": { half: 20, players: 5 } };
    return (
      <Group>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="r-format" label="Format">
            <Select2
              id="r-format"
              value={String(rules.format ?? "11")}
              onChange={(v) => patch({ rules: { ...rules, format: v, half_minutes: sizeByFormat[v].half, players_per_side: sizeByFormat[v].players } })}
              options={[{ value: "11", label: "11-a-side" }, { value: "9", label: "9-a-side" }, { value: "7", label: "7-a-side" }, { value: "5", label: "5-a-side" }]}
            />
          </FormField>
          <FormField id="r-half" label="Minutes per half" error={errors.half_minutes}>
            <NumField id="r-half" value={Number(rules.half_minutes ?? 45)} min={5} max={60} onChange={(v) => set("half_minutes", v)} />
          </FormField>
          <FormField id="r-subs" label="Substitutions">
            <Select2 id="r-subs" value={String(rules.substitutions ?? "unlimited")} onChange={(v) => set("substitutions", v)} options={[{ value: "unlimited", label: "Unlimited rolling" }, { value: "limited", label: "Limited" }]} />
          </FormField>
          {rules.substitutions === "limited" && (
            <FormField id="r-sublimit" label="Max substitutions">
              <NumField id="r-sublimit" value={Number(rules.sub_limit ?? 5)} min={1} max={15} onChange={(v) => set("sub_limit", v)} />
            </FormField>
          )}
        </div>
        {d.format !== "league" && (
          <>
            <ToggleRow id="r-et" label="Extra time" help="Knockout matches only." checked={Boolean(rules.extra_time)} onChange={(v) => set("extra_time", v)} />
            <ToggleRow id="r-pens" label="Penalty shootout" help="Knockout matches only." checked={Boolean(rules.penalties)} onChange={(v) => set("penalties", v)} />
          </>
        )}
        <div className="grid grid-cols-3 gap-3">
          {(["win", "draw", "loss"] as const).map((k) => (
            <FormField key={k} id={`r-pts-${k}`} label={`Points for ${k}`}>
              <NumField id={`r-pts-${k}`} value={pts[k] ?? 0} min={0} max={10} onChange={(v) => setPts(k, v)} />
            </FormField>
          ))}
        </div>
        {tiebreakers}
      </Group>
    );
  }

  const formats = sport?.config.match_formats ?? [{ key: "t20", label: "T20", overs: 20 }];
  const fmt = String(rules.match_format ?? "t20");
  const overs = Number(rules.overs ?? 20);
  return (
    <Group>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="r-fmt" label="Match format">
          <Select2
            id="r-fmt"
            value={fmt}
            onChange={(v) => {
              const o = CRICKET_OVERS[v] ?? overs;
              patch({ rules: { ...rules, match_format: v, overs: o, overs_per_bowler: defaultOversPerBowler(o) } });
            }}
            options={formats.map((f) => ({ value: f.key, label: f.label }))}
          />
        </FormField>
        <FormField id="r-overs" label="Overs per innings" error={errors.overs}>
          <NumField id="r-overs" value={overs} min={1} max={50} disabled={fmt !== "custom"} onChange={(v) => patch({ rules: { ...rules, overs: v, overs_per_bowler: defaultOversPerBowler(v) } })} />
        </FormField>
        <FormField id="r-opb" label="Max overs per bowler" helper="Calculated from the innings length. You can edit it.">
          <NumField id="r-opb" value={Number(rules.overs_per_bowler ?? 4)} min={1} max={50} onChange={(v) => set("overs_per_bowler", v)} />
        </FormField>
        <FormField id="r-ball" label="Ball type">
          <Select2 id="r-ball" value={String(rules.ball_type ?? "Tennis ball")} onChange={(v) => set("ball_type", v)} options={(sport?.config.ball_types ?? ["Tennis ball", "Leather", "Other"]).map((b) => ({ value: b, label: b }))} />
        </FormField>
        <FormField id="r-pps" label="Players per side (6 to 11)" error={errors.players_per_side}>
          <NumField id="r-pps" value={Number(rules.players_per_side ?? 11)} min={6} max={11} onChange={(v) => set("players_per_side", v)} />
        </FormField>
      </div>
      <ToggleRow id="r-pp" label="Powerplay" checked={Boolean(rules.powerplay)} onChange={(v) => set("powerplay", v)} />
      <ToggleRow id="r-so" label="Super over for a tie" checked={Boolean(rules.super_over)} onChange={(v) => set("super_over", v)} />
      <div className="grid grid-cols-3 gap-3">
        {([["win", "win"], ["tie", "tie"], ["no_result", "no result"]] as const).map(([k, l]) => (
          <FormField key={k} id={`r-pts-${k}`} label={`Points for ${l}`}>
            <NumField id={`r-pts-${k}`} value={pts[k] ?? 0} min={0} max={10} onChange={(v) => setPts(k, v)} />
          </FormField>
        ))}
      </div>
      {tiebreakers}
    </Group>
  );
}

/* ---------------- Step 4 ---------------- */
export function SquadStep(p: StepProps) {
  const { d, patch, errors, locks } = p;
  const a = d.auction;
  const setA = (x: Partial<typeof a>) => patch({ auction: { ...a, ...x } });
  const slabError = d.squadMode === "auction" ? validateSlabs(a.incrementSlabs) : null;
  const [newCat, setNewCat] = React.useState("");
  return (
    <Group>
      <div role="radiogroup" aria-label="Squad mode" className="grid gap-3 sm:grid-cols-2">
        {([["direct", "Direct", "Managers pick their own players. Simple and quick."], ["auction", "Auction", "Managers bid for players with virtual points."]] as const).map(([v, t, tx]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={d.squadMode === v}
            disabled={locks.squadMode}
            onClick={() => patch({ squadMode: v })}
            className={cn("min-h-11 rounded-card border p-4 text-left disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-primary", d.squadMode === v ? "border-primary bg-primary/10" : "border-line bg-card")}
          >
            <span className="block font-display text-lg font-bold">{t}</span>
            <span className="text-sm text-muted">{tx}</span>
          </button>
        ))}
      </div>
      {locks.squadMode && <p className="text-sm text-muted">Squad mode can&apos;t be changed after payment.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id="s-min" label="Minimum squad size" required error={errors.squadMin}>
          <NumField id="s-min" value={d.squadMin} min={1} max={25} onChange={(v) => patch({ squadMin: v })} error={Boolean(errors.squadMin)} />
        </FormField>
        <FormField id="s-max" label="Maximum squad size" required error={errors.squadMax}>
          <NumField id="s-max" value={d.squadMax} min={1} max={25} onChange={(v) => patch({ squadMax: v })} error={Boolean(errors.squadMax)} />
        </FormField>
        <FormField id="s-cap" label="Max player pool" helper="Optional.">
          <NumField id="s-cap" value={d.playerPoolCap} min={1} onChange={(v) => patch({ playerPoolCap: Number.isNaN(v) ? null : v })} />
        </FormField>
      </div>

      {d.squadMode === "direct" ? (
        <>
          <FormField id="s-lock" label="Squad lock deadline" helper="After this, managers can't edit squads.">
            <Input id="s-lock" type="datetime-local" value={d.squadLockDeadline} onChange={(e) => patch({ squadLockDeadline: e.target.value })} />
          </FormField>
          <ToggleRow id="s-apply" label="Allow players to apply" help="You approve applicants. Managers can also add players directly." checked={d.allowPlayerApplications} onChange={(v) => patch({ allowPlayerApplications: v })} />
        </>
      ) : (
        <Group title="Auction settings">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="a-mode" label="Auction mode">
              <Select2 id="a-mode" value={a.mode} onChange={(v) => setA({ mode: v === "simple" ? "simple" : "live" })} options={[{ value: "live", label: "Live bidding" }, { value: "simple", label: "Simple (you record results)" }]} />
            </FormField>
            <FormField id="a-purse" label="Purse per team (points)" required error={errors.purse}>
              <NumField id="a-purse" value={a.purse} min={1} onChange={(v) => setA({ purse: v })} />
            </FormField>
            <FormField id="a-seq" label="Player order">
              <Select2 id="a-seq" value={a.sequenceMode} onChange={(v) => setA({ sequenceMode: v as typeof a.sequenceMode })} options={[{ value: "random", label: "Random" }, { value: "category", label: "By category" }, { value: "manual", label: "Manual" }]} />
            </FormField>
            <FormField id="a-when" label="Auction date and time" helper="Can be set later.">
              <Input id="a-when" type="datetime-local" value={a.scheduledAt ?? ""} onChange={(e) => setA({ scheduledAt: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Player categories, base price and max per team">
            <ul className="flex flex-col gap-2">
              {a.categories.map((c) => (
                <li key={c} className="grid grid-cols-[1fr_100px_100px_44px] items-center gap-2">
                  <span className="truncate font-semibold">{c}</span>
                  <NumField id={`a-base-${c}`} value={a.basePrices[c] ?? 0} min={0} onChange={(v) => setA({ basePrices: { ...a.basePrices, [c]: v } })} />
                  <Input aria-label={`Max ${c} per team`} placeholder="Max" inputMode="numeric" value={a.categoryLimits[c] ?? ""} onChange={(e) => { const n = Number(e.target.value); const next = { ...a.categoryLimits }; if (!e.target.value || Number.isNaN(n)) delete next[c]; else next[c] = n; setA({ categoryLimits: next }); }} />
                  <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${c}`} onClick={() => setA({ categories: a.categories.filter((x) => x !== c) })}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <Input aria-label="New category" placeholder="Add category" value={newCat} onChange={(e) => setNewCat(e.target.value)} maxLength={30} />
              <Button type="button" variant="secondary" onClick={() => { const c = newCat.trim(); if (c && !a.categories.includes(c)) { setA({ categories: [...a.categories, c], basePrices: { ...a.basePrices, [c]: 20 } }); setNewCat(""); } }}>
                Add
              </Button>
            </div>
          </FormField>
          <FormField label="Bid increment slabs" error={slabError ?? errors.incrementSlabs}>
            <ul className="flex flex-col gap-2">
              {a.incrementSlabs.map((s, i) => (
                <li key={i} className="grid grid-cols-[1fr_1fr_1fr_44px] items-center gap-2">
                  <NumField id={`slab-from-${i}`} value={s.from} min={0} onChange={(v) => setA({ incrementSlabs: a.incrementSlabs.map((x, j) => (j === i ? { ...x, from: v } : x)) })} />
                  <Input aria-label={`Slab ${i + 1} up to`} placeholder="and above" inputMode="numeric" value={s.to ?? ""} onChange={(e) => setA({ incrementSlabs: a.incrementSlabs.map((x, j) => (j === i ? { ...x, to: e.target.value === "" ? null : Number(e.target.value) } : x)) })} />
                  <NumField id={`slab-step-${i}`} value={s.step} min={1} onChange={(v) => setA({ incrementSlabs: a.incrementSlabs.map((x, j) => (j === i ? { ...x, step: v } : x)) })} />
                  <Button type="button" variant="ghost" size="sm" aria-label={`Remove slab ${i + 1}`} onClick={() => setA({ incrementSlabs: a.incrementSlabs.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted">Columns: from, up to, step. Leave the last &quot;up to&quot; empty.</p>
            <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => { const last = a.incrementSlabs[a.incrementSlabs.length - 1]; setA({ incrementSlabs: [...a.incrementSlabs.slice(0, -1), { ...last, to: (last?.from ?? 0) + 100 }, { from: (last?.from ?? 0) + 100, to: null, step: (last?.step ?? 5) * 2 }] }); }}>
              <Plus className="h-4 w-4" aria-hidden /> Add slab
            </Button>
          </FormField>
          <ToggleRow id="a-reserve" label="Reserve rule" help="Blocks bids that leave too little purse to fill the minimum squad at base prices." checked={a.reserveRule} onChange={(v) => setA({ reserveRule: v })} />
          <ToggleRow id="s-apply2" label="Allow players to apply" checked={d.allowPlayerApplications} onChange={(v) => patch({ allowPlayerApplications: v })} />
        </Group>
      )}
    </Group>
  );
}

/* ---------------- Step 5 ---------------- */
export function RegistrationStep(p: StepProps) {
  const { d, patch, errors } = p;
  const setQ = (i: number, x: Partial<DraftState["customQuestions"][number]>) => patch({ customQuestions: d.customQuestions.map((q, j) => (j === i ? { ...q, ...x } : q)) });
  return (
    <Group>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="g-entry" label="Team entry" required>
          <Select2 id="g-entry" value={d.teamEntry} onChange={(v) => patch({ teamEntry: v as DraftState["teamEntry"] })} options={[{ value: "invite", label: "Invite only" }, { value: "open", label: "Open applications" }, { value: "both", label: "Both" }]} />
        </FormField>
        <FormField id="g-vis" label="Visibility" required helper="Unlisted tournaments are hidden from browse but work by link.">
          <Select2 id="g-vis" value={d.visibility} onChange={(v) => patch({ visibility: v as DraftState["visibility"] })} options={[{ value: "public", label: "Public" }, { value: "unlisted", label: "Unlisted" }]} />
        </FormField>
        <FormField id="g-td" label="Team registration deadline">
          <Input id="g-td" type="datetime-local" value={d.teamDeadline} onChange={(e) => patch({ teamDeadline: e.target.value })} />
        </FormField>
        <FormField id="g-pd" label="Player application deadline">
          <Input id="g-pd" type="datetime-local" value={d.playerDeadline} onChange={(e) => patch({ playerDeadline: e.target.value })} />
        </FormField>
      </div>
      <FormField label="Custom player questions (up to 3)" error={errors.customQuestions}>
        <ul className="flex flex-col gap-2">
          {d.customQuestions.map((q, i) => (
            <li key={i} className="grid grid-cols-[1fr_auto_44px] items-center gap-2">
              <Input aria-label={`Question ${i + 1}`} value={q.q} maxLength={120} onChange={(e) => setQ(i, { q: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={q.required} onChange={(e) => setQ(i, { required: e.target.checked })} /> Required
              </label>
              <Button type="button" variant="ghost" size="sm" aria-label={`Remove question ${i + 1}`} onClick={() => patch({ customQuestions: d.customQuestions.filter((_, j) => j !== i) })}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
        {d.customQuestions.length < 3 && (
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => patch({ customQuestions: [...d.customQuestions, { q: "", required: false }] })}>
            <Plus className="h-4 w-4" aria-hidden /> Add question
          </Button>
        )}
      </FormField>
      <ToggleRow id="g-contact" label="Show my contact details" help="Appears on the public tournament page." checked={d.showContact} onChange={(v) => patch({ showContact: v })} />
      {d.showContact && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="g-phone" label="Phone" error={errors.contactPhone}>
            <Input id="g-phone" type="tel" value={d.contactPhone} onChange={(e) => patch({ contactPhone: e.target.value })} />
          </FormField>
          <FormField id="g-email" label="Email" error={errors.contactEmail}>
            <Input id="g-email" type="email" value={d.contactEmail} onChange={(e) => patch({ contactEmail: e.target.value })} />
          </FormField>
        </div>
      )}
      <FormField id="g-fee" label="Entry fee information (display only)" helper="For example: Entry fee is collected by the organizer at the ground. The platform does not process it.">
        <Textarea id="g-fee" rows={2} maxLength={300} value={d.entryFeeInfo} onChange={(e) => patch({ entryFeeInfo: e.target.value })} />
      </FormField>
    </Group>
  );
}

/* ---------------- Step 6 ---------------- */
export function PrizesStep(p: StepProps) {
  const { d, patch, errors } = p;
  return (
    <Group>
      <FormField id="p-pool" label="Prize pool (display text)" helper="Informational only. The platform doesn't pay or hold prize money.">
        <Input id="p-pool" value={d.prizePoolText} maxLength={200} onChange={(e) => patch({ prizePoolText: e.target.value })} />
      </FormField>
      <FormField label="Prizes by position (up to 5)" error={errors.prizes}>
        <ul className="flex flex-col gap-2">
          {d.prizes.map((pr, i) => (
            <li key={i} className="grid grid-cols-[120px_1fr_44px] gap-2">
              <Input aria-label={`Position ${i + 1}`} placeholder="1st" value={pr.position} maxLength={30} onChange={(e) => patch({ prizes: d.prizes.map((x, j) => (j === i ? { ...x, position: e.target.value } : x)) })} />
              <Input aria-label={`Prize ${i + 1}`} placeholder="Trophy and medals" value={pr.prize} maxLength={100} onChange={(e) => patch({ prizes: d.prizes.map((x, j) => (j === i ? { ...x, prize: e.target.value } : x)) })} />
              <Button type="button" variant="ghost" size="sm" aria-label={`Remove prize ${i + 1}`} onClick={() => patch({ prizes: d.prizes.filter((_, j) => j !== i) })}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
        {d.prizes.length < 5 && (
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => patch({ prizes: [...d.prizes, { position: "", prize: "" }] })}>
            <Plus className="h-4 w-4" aria-hidden /> Add prize
          </Button>
        )}
      </FormField>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Individual awards</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {AWARDS.map((a) => (
            <label key={a} className="flex min-h-11 items-center gap-2 rounded-input border border-line px-3">
              <input type="checkbox" checked={d.awards.includes(a)} onChange={(e) => patch({ awards: e.target.checked ? [...d.awards, a] : d.awards.filter((x) => x !== a) })} />
              {a}
            </label>
          ))}
        </div>
      </fieldset>
      <FormField id="p-rules" label={`Rules and regulations (${d.rulesText.length}/6000)`} error={errors.rulesText} helper="Plain text. Shown as written on the Rules tab.">
        <Textarea id="p-rules" rows={8} maxLength={6000} value={d.rulesText} onChange={(e) => patch({ rulesText: e.target.value })} />
      </FormField>
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={d.codeOfConduct} onChange={(e) => patch({ codeOfConduct: e.target.checked })} aria-describedby={errors.codeOfConduct ? "coc-err" : undefined} />
        <span>Participants must follow these rules.</span>
      </label>
      {errors.codeOfConduct && (
        <p id="coc-err" role="alert" className="text-sm text-danger">
          {errors.codeOfConduct}
        </p>
      )}
    </Group>
  );
}

/* ---------------- Step 7 ---------------- */
export function ReviewStep(p: StepProps & { goTo: (step: number) => void }) {
  const { d, patch, errors } = p;
  const sport = p.sports.find((s) => s.id === d.sportId);
  const city = p.cities.find((c) => c.id === d.cityId);
  const tier = p.tiers.find((t) => d.teamCount >= t.min_teams && d.teamCount <= t.max_teams);
  const count = countMatches({ format: d.format, teams: d.teamCount, legs: d.leagueLegs, playoffStyle: d.playoffStyle, thirdPlace: d.thirdPlaceMatch });
  const rows: Array<[number, string, string]> = [
    [1, "Basics", `${d.name} · ${sport?.name ?? ""} · ${city?.name ?? ""} · ${d.startDate} to ${d.endDate}`],
    [2, "Format", `${d.format.replace("_", " ")} · ${d.teamCount} teams · ${count.total} matches`],
    [3, "Match rules", Object.entries(d.rules).filter(([, v]) => typeof v !== "object").map(([k, v]) => `${k.replace(/_/g, " ")}: ${String(v)}`).join(" · ")],
    [4, "Squad", `${d.squadMode} · ${d.squadMin} to ${d.squadMax} players${d.squadMode === "auction" ? ` · purse ${d.auction.purse}` : ""}`],
    [5, "Registration", `${d.teamEntry} entry · ${d.visibility}${d.customQuestions.length ? ` · ${d.customQuestions.length} questions` : ""}`],
    [6, "Prizes and rules", `${d.prizes.length} prizes · ${d.awards.length} awards${d.rulesText ? " · rules added" : ""}`],
  ];
  return (
    <Group>
      <ul className="divide-y divide-line rounded-card border border-line bg-card">
        {rows.map(([n, t, s]) => (
          <li key={n} className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold">{t}</p>
              <p className="break-words text-sm text-muted">{s}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => p.goTo(n)}>
              Edit
            </Button>
          </li>
        ))}
      </ul>
      <section className="rounded-card border border-primary/30 bg-primary/10 p-4" aria-label="Plan">
        <p className="text-sm text-muted">Your tournament has {d.teamCount} teams.</p>
        {tier ? (
          <p className="font-display text-2xl font-bold">
            {tier.name}: {formatINR(tier.amount_paise)}
          </p>
        ) : (
          <p className="text-danger">No plan covers this team count.</p>
        )}
        <p className="text-xs text-muted">Tax, if any, is added at checkout. The fee comes from the current price list.</p>
      </section>
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={d.confirmed} onChange={(e) => patch({ confirmed: e.target.checked })} />
        <span>I confirm the details are correct and I accept the Terms.</span>
      </label>
      {errors.confirmed && (
        <p role="alert" className="text-sm text-danger">
          {errors.confirmed}
        </p>
      )}
    </Group>
  );
}
