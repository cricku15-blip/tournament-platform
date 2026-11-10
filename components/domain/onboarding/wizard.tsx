"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Stepper } from "@/components/ui/stepper";
import { Combobox } from "@/components/ui/combobox";
import { ImageUploader } from "@/components/ui/image-uploader";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { nearestCitySlug } from "@/lib/cities";
import {
  aboutSchema,
  ADULT_AGE,
  ageFromDob,
  INTENTS,
  type Intent,
} from "@/lib/validation/profile";
import { checkUsername, completeOnboarding, requestCity } from "@/app/onboarding/actions";

export interface SportOption {
  id: string;
  slug: string;
  name: string;
  config: { profile_fields?: Array<{ key: string; label: string; type: string; options: string[] }>; roles?: string[] };
}
interface CityOption {
  id: string;
  name: string;
  slug: string;
  state: string | null;
}

interface State {
  step: number;
  cityId: string;
  fullName: string;
  username: string;
  phone: string;
  dob: string;
  avatarUrl: string | null;
  intents: Intent[];
  sports: Record<string, Record<string, string>>;
}

const STEPS = [
  { id: "city", label: "Your city" },
  { id: "about", label: "About you" },
  { id: "intent", label: "What you do" },
];

const INTENT_CARDS: Record<Intent, { title: string; text: string }> = {
  play: { title: "Play", text: "Join tournaments and get picked by teams." },
  manage: { title: "Manage a team", text: "Build a squad and bid in auctions." },
  organize: { title: "Organize", text: "Run tournaments, fixtures and results." },
};

const KEY = "gw-onboarding-v1";

export function OnboardingWizard({
  userId,
  next,
  defaultName,
  defaultAvatar,
  cities,
  sports,
}: {
  userId: string;
  next: string;
  defaultName: string;
  defaultAvatar: string | null;
  cities: CityOption[];
  sports: SportOption[];
}) {
  const router = useRouter();
  const [s, setS] = React.useState<State>({
    step: 0,
    cityId: "",
    fullName: defaultName,
    username: "",
    phone: "",
    dob: "",
    avatarUrl: defaultAvatar,
    intents: [],
    sports: {},
  });
  const [hydrated, setHydrated] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [usernameState, setUsernameState] = React.useState<{ ok?: boolean; msg?: string; checking?: boolean }>({});
  const [saving, setSaving] = React.useState(false);
  const [cityRequest, setCityRequest] = React.useState<{ open: boolean; name: string; sent: boolean }>({
    open: false,
    name: "",
    sent: false,
  });

  // Survive refresh
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setS((prev) => ({ ...prev, ...(JSON.parse(raw) as Partial<State>) }));
    } catch {}
    setHydrated(true);
  }, []);
  React.useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify(s));
    } catch {}
  }, [s, hydrated]);

  const patch = (p: Partial<State>) => setS((prev) => ({ ...prev, ...p }));

  // Debounced username availability
  React.useEffect(() => {
    if (!s.username) return setUsernameState({});
    const t = setTimeout(async () => {
      setUsernameState({ checking: true });
      const r = await checkUsername(s.username);
      setUsernameState({ ok: r.available, msg: r.available ? "Username is available." : r.reason });
    }, 400);
    return () => clearTimeout(t);
  }, [s.username]);

  function detectLocation() {
    if (!navigator.geolocation) return toast({ title: "Location isn't available in this browser." });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const slug = nearestCitySlug(
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          cities.map((c) => c.slug)
        );
        const match = cities.find((c) => c.slug === slug);
        if (match) patch({ cityId: match.id });
        else toast({ title: "No active city near you yet.", description: "Request your city below." });
      },
      () => toast({ title: "Couldn't get your location. Pick your city from the list." }),
      { timeout: 8000 }
    );
  }

  async function sendCityRequest() {
    const r = await requestCity(cityRequest.name);
    if (r.ok) setCityRequest((c) => ({ ...c, sent: true }));
    else setErrors({ cityRequest: r.error });
  }

  function validateStep(step: number): boolean {
    const e: Record<string, string> = {};
    if (step === 0 && !s.cityId) e.cityId = "Choose your city to continue.";
    if (step === 1) {
      const r = aboutSchema.safeParse({
        fullName: s.fullName,
        username: s.username,
        phone: s.phone,
        dateOfBirth: s.dob,
        avatarUrl: s.avatarUrl,
      });
      if (!r.success) for (const i of r.error.issues) e[String(i.path[0])] ??= i.message;
      else if (usernameState.ok === false) e.username = usernameState.msg ?? "Pick another username.";
    }
    if (step === 2 && s.intents.length === 0) e.intents = "Pick at least one.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goNext() {
    if (!validateStep(s.step)) return;
    patch({ step: s.step + 1 });
  }

  async function finish() {
    if (!validateStep(2)) return;
    setSaving(true);
    const sportProfiles = Object.entries(s.sports)
      .filter(([, d]) => Object.values(d).some(Boolean))
      .map(([sportId, details]) => ({ sportId, details }));
    const res = await completeOnboarding({
      cityId: s.cityId,
      about: {
        fullName: s.fullName,
        username: s.username,
        phone: s.phone,
        dateOfBirth: s.dob,
        avatarUrl: s.avatarUrl,
      },
      intents: s.intents,
      sportProfiles,
    });
    setSaving(false);
    if (!res.ok) {
      setErrors({ form: res.error });
      if (res.field === "username" || res.field === "fullName") patch({ step: 1 });
      return;
    }
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
    toast({ title: `You're all set, ${s.fullName.split(" ")[0]}.` });
    router.replace(next);
    router.refresh();
  }

  const age = s.dob && !Number.isNaN(new Date(s.dob).getTime()) ? ageFromDob(s.dob) : null;
  const cityOptions = cities.map((c) => ({ value: c.id, label: c.state ? `${c.name}, ${c.state}` : c.name }));

  return (
    <div>
      <Stepper steps={STEPS} currentStepIndex={s.step} />

      <section className="mt-8 rounded-card border border-line bg-card p-5 sm:p-8">
        {s.step === 0 && (
          <div className="flex flex-col gap-5">
            <header>
              <h1 className="font-display text-3xl font-bold">Where do you play?</h1>
              <p className="mt-1 text-sm text-muted">Tournaments, teams and auctions are matched by city.</p>
            </header>
            <FormField id="city" label="City" required error={errors.cityId}>
              <Combobox
                id="city"
                options={cityOptions}
                value={s.cityId}
                onChange={(v) => patch({ cityId: v })}
                placeholder="Search your city"
                searchPlaceholder="Type a city name"
                error={Boolean(errors.cityId)}
              />
            </FormField>
            <Button type="button" variant="secondary" onClick={detectLocation} className="self-start">
              <MapPin className="h-4 w-4" aria-hidden /> Detect my location
            </Button>

            <div className="border-t border-line pt-4">
              {!cityRequest.open ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-primary hover:underline"
                  onClick={() => setCityRequest((c) => ({ ...c, open: true }))}
                >
                  My city isn&apos;t listed
                </button>
              ) : cityRequest.sent ? (
                <p className="text-sm text-success">Thanks. We&apos;ll email you when your city opens.</p>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <FormField id="cityreq" label="Your city name" error={errors.cityRequest} className="flex-1">
                    <Input
                      id="cityreq"
                      value={cityRequest.name}
                      onChange={(e) => setCityRequest((c) => ({ ...c, name: e.target.value }))}
                    />
                  </FormField>
                  <Button type="button" variant="secondary" onClick={sendCityRequest}>
                    Request city
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {s.step === 1 && (
          <div className="flex flex-col gap-5">
            <header>
              <h1 className="font-display text-3xl font-bold">Tell us about you</h1>
            </header>
            <div className="flex items-center gap-4">
              <div className="w-24">
                <ImageUploader
                  bucket="avatars"
                  userId={userId}
                  value={s.avatarUrl}
                  onChange={(url) => patch({ avatarUrl: url })}
                  aspectRatio="1:1"
                />
              </div>
              <p className="text-sm text-muted">Add a photo so teams recognise you (optional).</p>
            </div>
            <FormField id="fullName" label="Full name" required error={errors.fullName}>
              <Input
                id="fullName"
                autoComplete="name"
                value={s.fullName}
                error={Boolean(errors.fullName)}
                onChange={(e) => patch({ fullName: e.target.value })}
              />
            </FormField>
            <FormField
              id="username"
              label="Username"
              required
              error={errors.username}
              helper={
                usernameState.checking
                  ? "Checking…"
                  : usernameState.msg && !errors.username
                    ? usernameState.msg
                    : "Lowercase letters, numbers and underscores."
              }
            >
              <Input
                id="username"
                autoComplete="username"
                value={s.username}
                error={Boolean(errors.username) || usernameState.ok === false}
                onChange={(e) => patch({ username: e.target.value.toLowerCase() })}
              />
            </FormField>
            <FormField id="dob" label="Date of birth" required error={errors.dateOfBirth}>
              <DatePicker
                id="dob"
                value={s.dob || null}
                onChange={(d) => patch({ dob: d })}
                max={new Date().toISOString().slice(0, 10)}
                error={Boolean(errors.dateOfBirth)}
              />
            </FormField>
            {age !== null && age >= 13 && age < ADULT_AGE && (
              <p className="rounded-input border border-line bg-surface p-3 text-sm text-muted" role="note">
                You&apos;re under 18. By continuing you confirm a parent or guardian knows you&apos;re using
                GroundWar and agrees to your taking part in tournaments.
              </p>
            )}
            <FormField
              id="phone"
              label="Mobile number (optional)"
              helper="Shown only to organizers and managers when needed. Not verified."
              error={errors.phone}
            >
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={s.phone}
                error={Boolean(errors.phone)}
                onChange={(e) => patch({ phone: e.target.value })}
              />
            </FormField>
          </div>
        )}

        {s.step === 2 && (
          <div className="flex flex-col gap-5">
            <header>
              <h1 className="font-display text-3xl font-bold">What brings you here?</h1>
              <p className="mt-1 text-sm text-muted">Pick all that apply. You can change this any time.</p>
            </header>
            <div role="group" aria-label="What you want to do" className="grid gap-3 sm:grid-cols-3">
              {INTENTS.map((i) => {
                const on = s.intents.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      patch({ intents: on ? s.intents.filter((x) => x !== i) : [...s.intents, i] })
                    }
                    className={cn(
                      "min-h-11 rounded-card border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                      on ? "border-primary bg-primary/10" : "border-line bg-card hover:border-primary/50"
                    )}
                  >
                    <span className="block font-display text-lg font-bold">{INTENT_CARDS[i].title}</span>
                    <span className="mt-1 block text-sm text-muted">{INTENT_CARDS[i].text}</span>
                  </button>
                );
              })}
            </div>
            {errors.intents && <p className="text-sm text-danger">{errors.intents}</p>}

            {s.intents.includes("play") && sports.length > 0 && (
              <div className="flex flex-col gap-4 border-t border-line pt-5">
                <h2 className="font-display text-xl font-bold">Your playing profile (optional)</h2>
                {sports.map((sp) => (
                  <fieldset key={sp.id} className="rounded-card border border-line p-4">
                    <legend className="px-1 font-semibold">{sp.name}</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(sp.config.roles?.length ?? 0) > 0 && (
                        <SelectField
                          label="Role"
                          options={sp.config.roles ?? []}
                          value={s.sports[sp.id]?.role ?? ""}
                          onChange={(v) => patch({ sports: { ...s.sports, [sp.id]: { ...s.sports[sp.id], role: v } } })}
                        />
                      )}
                      {(sp.config.profile_fields ?? []).map((f) => (
                        <SelectField
                          key={f.key}
                          label={f.label}
                          options={f.options}
                          value={s.sports[sp.id]?.[f.key] ?? ""}
                          onChange={(v) =>
                            patch({ sports: { ...s.sports, [sp.id]: { ...s.sports[sp.id], [f.key]: v } } })
                          }
                        />
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            )}
            {errors.form && (
              <p role="alert" className="text-sm text-danger">
                {errors.form}
              </p>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" disabled={s.step === 0 || saving} onClick={() => patch({ step: s.step - 1 })}>
            Back
          </Button>
          {s.step < 2 ? (
            <Button type="button" onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button type="button" onClick={finish} loading={saving}>
              Finish
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const id = React.useId();
  return (
    <FormField id={id} label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
