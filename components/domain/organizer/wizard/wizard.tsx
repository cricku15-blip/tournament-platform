"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { toast } from "@/components/ui/toast";
import { checkSlug, saveAuctionSettings, saveDraft } from "@/app/(app)/organizer/actions";
import { localToIso } from "@/lib/organizer/datetime";
import { slugify } from "@/lib/organizer/schemas";
import type { CityOption, DraftState, SportOption, TierOption } from "./types";
import { BasicsStep, FormatStep, PrizesStep, RegistrationStep, ReviewStep, RulesStep, SquadStep, type Locks } from "./steps";

const STEPS = [
  { id: 1, label: "Basics" },
  { id: 2, label: "Format" },
  { id: 3, label: "Match rules" },
  { id: 4, label: "Squad" },
  { id: 5, label: "Registration" },
  { id: 6, label: "Prizes" },
  { id: 7, label: "Review" },
];

const NO_LOCKS: Locks = { sport: false, city: false, squadMode: false, teamCount: false };

/** Values sent for one step. Dates and times are converted to ISO so the server never guesses a timezone. */
export function stepValues(step: number, d: DraftState): Record<string, unknown> {
  switch (step) {
    case 1:
      return { name: d.name, slug: d.slug, sportId: d.sportId, cityId: d.cityId, venueName: d.venueName, venueAddress: d.venueAddress, startDate: d.startDate, endDate: d.endDate, bannerUrl: d.bannerUrl, logoUrl: d.logoUrl, descriptionShort: d.descriptionShort, descriptionFull: d.descriptionFull };
    case 2:
      return { format: d.format, teamCount: d.teamCount, leagueLegs: d.leagueLegs, playoffStyle: d.playoffStyle, thirdPlaceMatch: d.thirdPlaceMatch, seedingMethod: d.seedingMethod };
    case 3:
      return d.rules;
    case 4:
      return { squadMode: d.squadMode, squadMin: d.squadMin, squadMax: d.squadMax, playerPoolCap: d.playerPoolCap, squadLockDeadline: localToIso(d.squadLockDeadline), allowPlayerApplications: d.allowPlayerApplications };
    case 5:
      return { teamEntry: d.teamEntry, teamDeadline: localToIso(d.teamDeadline), playerDeadline: localToIso(d.playerDeadline), customQuestions: d.customQuestions, visibility: d.visibility, showContact: d.showContact, contactPhone: d.contactPhone, contactEmail: d.contactEmail, entryFeeInfo: d.entryFeeInfo };
    default:
      return { prizePoolText: d.prizePoolText, prizes: d.prizes, awards: d.awards, rulesText: d.rulesText, codeOfConduct: d.codeOfConduct };
  }
}

function ago(iso: string | null, now: number): string {
  if (!iso) return "Not saved yet";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 10) return "Saved just now";
  if (s < 60) return `Saved ${s} seconds ago`;
  const m = Math.round(s / 60);
  return `Saved ${m} minute${m === 1 ? "" : "s"} ago`;
}

export function TournamentWizard({
  userId,
  sports,
  cities,
  tiers,
  initial,
  initialId,
  locks = NO_LOCKS,
  mode = "wizard",
}: {
  userId: string;
  sports: SportOption[];
  cities: CityOption[];
  tiers: TierOption[];
  initial: DraftState;
  initialId: string | null;
  locks?: Locks;
  mode?: "wizard" | "setup";
}) {
  const router = useRouter();
  const [d, setD] = React.useState(initial);
  const [id, setId] = React.useState(initialId);
  const [step, setStep] = React.useState(1);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = React.useState<string | null>(initialId ? new Date().toISOString() : null);
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());
  const [slugState, setSlugState] = React.useState<{ state: "idle" | "checking" | "ok" | "taken"; msg?: string; suggestions?: string[] }>({ state: "idle" });
  const slugTouched = React.useRef(Boolean(initialId));
  const sportSlug = sports.find((s) => s.id === d.sportId)?.slug ?? "cricket";

  const patch = React.useCallback((p: Partial<DraftState>) => {
    setD((prev) => ({ ...prev, ...p }));
    setDirty(true);
  }, []);

  // Keep "Saved x ago" fresh.
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // Navigation guard
  React.useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // Slug: derive from the name until the organizer edits it.
  const onName = (name: string) => {
    patch({ name, ...(slugTouched.current ? {} : { slug: slugify(name) }) });
  };
  React.useEffect(() => {
    if (!d.slug) return;
    const t = setTimeout(async () => {
      setSlugState({ state: "checking" });
      const r = await checkSlug(d.slug, id ?? undefined);
      setSlugState(r.available ? { state: "ok" } : { state: "taken", msg: r.reason, suggestions: r.suggestions });
    }, 450);
    return () => clearTimeout(t);
  }, [d.slug, id]);

  async function persist(forStep: number, silent = false): Promise<boolean> {
    setSaving(true);
    const res = await saveDraft(id, forStep, stepValues(forStep, d), sportSlug);
    let ok = res.ok;
    if (res.ok) {
      setId(res.id);
      setSavedAt(res.savedAt);
      if (forStep === 4 && d.squadMode === "auction") {
        const a = await saveAuctionSettings(res.id, { ...d.auction, scheduledAt: localToIso(d.auction.scheduledAt) });
        if (!a.ok) {
          setErrors({ [a.field ?? "form"]: a.error });
          ok = false;
        }
      }
      if (ok) {
        setErrors({});
        setDirty(false);
      }
    } else if (!silent) {
      setErrors({ [res.field ?? "form"]: res.error });
    }
    setSaving(false);
    return ok;
  }

  // Autosave after 10 s idle (only once the draft exists, so we never insert half-validated data).
  React.useEffect(() => {
    if (!dirty || !id || mode !== "wizard") return;
    const t = setTimeout(() => void persist(step, true), 10000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, dirty, id, step]);

  async function next() {
    if (slugState.state === "taken" && step === 1) return setErrors({ slug: "That link name is taken." });
    if (await persist(step)) setStep((s) => Math.min(7, s + 1));
  }

  async function finish(toPayment: boolean) {
    if (!d.confirmed) return setErrors({ confirmed: "Please confirm the details and accept the Terms." });
    setSaving(true);
    for (const s of [1, 2, 3, 4, 5, 6]) {
      const r = await saveDraft(id, s, stepValues(s, d), sportSlug);
      if (!r.ok) {
        setSaving(false);
        setStep(s);
        return setErrors({ [r.field ?? "form"]: r.error });
      }
    }
    setSaving(false);
    setDirty(false);
    if (id) router.push(toPayment ? `/organizer/tournaments/${id}/checkout` : `/organizer/tournaments/${id}`);
  }

  async function saveSetup() {
    setSaving(true);
    for (const s of [1, 2, 3, 4, 5, 6]) {
      const r = await saveDraft(id, s, stepValues(s, d), sportSlug);
      if (!r.ok) {
        setSaving(false);
        return setErrors({ [r.field ?? "form"]: r.error });
      }
    }
    if (d.squadMode === "auction" && id) {
      const a = await saveAuctionSettings(id, { ...d.auction, scheduledAt: localToIso(d.auction.scheduledAt) });
      if (!a.ok) {
        setSaving(false);
        return setErrors({ [a.field ?? "form"]: a.error });
      }
    }
    setSaving(false);
    setDirty(false);
    setErrors({});
    setSavedAt(new Date().toISOString());
    toast({ title: "Tournament updated" });
    router.refresh();
  }

  const common = { d, patch, errors, locks, sports, cities, tiers, userId };
  const slug = { ...slugState, onEdit: (s: string) => { slugTouched.current = true; patch({ slug: s }); }, onPick: (s: string) => { slugTouched.current = true; patch({ slug: s }); } };
  const errorCount = Object.keys(errors).length;

  const body = (n: number) => {
    switch (n) {
      case 1:
        return <BasicsStep {...common} patch={(p) => (p.name !== undefined && Object.keys(p).length === 1 ? onName(p.name) : patch(p))} slug={slug} />;
      case 2:
        return <FormatStep {...common} />;
      case 3:
        return <RulesStep {...common} />;
      case 4:
        return <SquadStep {...common} />;
      case 5:
        return <RegistrationStep {...common} />;
      case 6:
        return <PrizesStep {...common} />;
      default:
        return <ReviewStep {...common} goTo={setStep} />;
    }
  };

  if (mode === "setup") {
    const titles = ["Basics", "Format and teams", "Match rules", "Squad and auction", "Registration and visibility", "Prizes and rules"];
    return (
      <div className="flex flex-col gap-8 pb-24">
        {titles.map((t, i) => (
          <section key={t} className="rounded-card border border-line bg-card p-5">
            <h2 className="mb-4 font-display text-2xl font-bold">{t}</h2>
            {body(i + 1)}
          </section>
        ))}
        {errorCount > 0 && (
          <p role="alert" className="text-sm text-danger">
            {Object.values(errors)[0]}
          </p>
        )}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 p-3 backdrop-blur-xs">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <span className="text-sm text-muted">{dirty ? "You have unsaved changes" : ago(savedAt, now)}</span>
            <Button onClick={saveSetup} loading={saving} disabled={!dirty}>
              Save changes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Create a tournament</h1>
        <p className="text-sm text-muted" aria-live="polite">
          {saving ? "Saving…" : ago(savedAt, now)}
        </p>
      </div>
      <Stepper steps={STEPS} currentStepIndex={step - 1} onStepClick={(i) => id && setStep(i + 1)} />
      <section className="mt-6 rounded-card border border-line bg-card p-5 sm:p-8" aria-label={STEPS[step - 1].label}>
        {errorCount > 0 && (
          <div role="alert" className="mb-5 rounded-input border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            <strong>Please fix this to continue:</strong> {Object.values(errors)[0]}
          </div>
        )}
        {body(step)}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="ghost" disabled={step === 1 || saving} onClick={() => setStep(step - 1)}>
            Back
          </Button>
          {step < 7 ? (
            <Button type="button" onClick={next} loading={saving}>
              Next
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => finish(false)} loading={saving}>
                Save as draft
              </Button>
              <Button type="button" onClick={() => finish(true)} loading={saving}>
                Continue to payment
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
