"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Combobox } from "@/components/ui/combobox";
import { ImageUploader } from "@/components/ui/image-uploader";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { checkUsername } from "@/app/onboarding/actions";
import { saveProfile } from "@/app/(app)/profile/actions";
import { profileEditSchema } from "@/lib/validation/profile";
import type { SportOption } from "@/components/domain/onboarding/wizard";

export interface ProfileFormState {
  fullName: string;
  username: string;
  bio: string;
  phone: string;
  cityId: string;
  avatarUrl: string | null;
  showAge: boolean;
  showCity: boolean;
  showStats: boolean;
  sports: Record<string, Record<string, string>>;
}

export function ProfileForm({
  userId,
  initial,
  cities,
  sports,
}: {
  userId: string;
  initial: ProfileFormState;
  cities: { value: string; label: string }[];
  sports: SportOption[];
}) {
  const router = useRouter();
  const [saved, setSaved] = React.useState(initial);
  const [s, setS] = React.useState(initial);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  const patch = (p: Partial<ProfileFormState>) => setS((prev) => ({ ...prev, ...p }));

  // Navigation guard for tab close / reload
  React.useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  async function onSave() {
    setErrors({});
    const parsed = profileEditSchema.safeParse({
      fullName: s.fullName,
      username: s.username,
      bio: s.bio,
      phone: s.phone,
      showAge: s.showAge,
      showCity: s.showCity,
      showStats: s.showStats,
    });
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const i of parsed.error.issues) e[String(i.path[0])] ??= i.message;
      return setErrors(e);
    }
    setSaving(true);
    // Username: check first, never optimistic.
    if (s.username !== saved.username) {
      const r = await checkUsername(s.username);
      if (!r.available) {
        setSaving(false);
        return setErrors({ username: r.reason ?? "That username is taken." });
      }
    }
    const res = await saveProfile({
      profile: parsed.data,
      cityId: s.cityId,
      avatarUrl: s.avatarUrl,
      sports: Object.entries(s.sports).map(([sportId, details]) => ({ sportId, details })),
    });
    setSaving(false);
    if (!res.ok) return setErrors({ [res.field ?? "form"]: res.error });
    setSaved(s);
    toast({ title: "Profile saved" });
    router.refresh();
  }

  const cityLabel = cities.find((c) => c.value === s.cityId)?.label;

  return (
    <div className="mx-auto w-full max-w-5xl pb-24">
      <h1 className="font-display text-3xl font-bold text-ink">Profile</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="flex flex-col gap-4">
          <div className="w-40 self-center lg:self-start">
            <ImageUploader bucket="avatars" userId={userId} value={s.avatarUrl} onChange={(u) => patch({ avatarUrl: u })} aspectRatio="1:1" />
          </div>
          <div className="rounded-card border border-line bg-card p-4" aria-label="Public card preview">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Public card</p>
            <div className="flex items-center gap-3">
              <Avatar src={s.avatarUrl} name={s.fullName || "?"} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{s.fullName || "Your name"}</p>
                <p className="truncate text-sm text-muted">@{s.username || "username"}</p>
              </div>
            </div>
            {s.bio && <p className="mt-3 text-sm text-muted">{s.bio}</p>}
            {s.showCity && cityLabel && <p className="mt-2 text-xs text-muted">{cityLabel}</p>}
          </div>
        </aside>

        <div className="flex flex-col gap-6">
          <section className="rounded-card border border-line bg-card p-5">
            <h2 className="mb-4 font-display text-xl font-bold">Basic details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="p-name" label="Full name" error={errors.fullName}>
                <Input id="p-name" value={s.fullName} error={Boolean(errors.fullName)} onChange={(e) => patch({ fullName: e.target.value })} />
              </FormField>
              <FormField id="p-user" label="Username" error={errors.username}>
                <Input id="p-user" value={s.username} error={Boolean(errors.username)} onChange={(e) => patch({ username: e.target.value.toLowerCase() })} />
              </FormField>
              <FormField id="p-city" label="City" error={errors.cityId} helper="Changing city doesn't affect existing tournaments.">
                <Combobox id="p-city" options={cities} value={s.cityId} onChange={(v) => patch({ cityId: v })} />
              </FormField>
              <FormField id="p-phone" label="Mobile number" error={errors.phone} helper="Only organizers and managers see this, when needed.">
                <Input id="p-phone" type="tel" inputMode="tel" value={s.phone} error={Boolean(errors.phone)} onChange={(e) => patch({ phone: e.target.value })} />
              </FormField>
              <FormField id="p-bio" label={`Bio (${s.bio.length}/240)`} error={errors.bio} className="sm:col-span-2">
                <Textarea id="p-bio" rows={3} maxLength={240} value={s.bio} onChange={(e) => patch({ bio: e.target.value })} />
              </FormField>
            </div>
          </section>

          {sports.length > 0 && (
            <section className="rounded-card border border-line bg-card p-5">
              <h2 className="mb-4 font-display text-xl font-bold">Sport profiles</h2>
              <Tabs defaultValue={sports[0].id}>
                <TabsList>
                  {sports.map((sp) => (
                    <TabsTrigger key={sp.id} value={sp.id}>
                      {sp.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {sports.map((sp) => {
                  const fields = [
                    ...((sp.config.roles?.length ?? 0) > 0 ? [{ key: "role", label: "Role", options: sp.config.roles ?? [] }] : []),
                    ...(sp.config.profile_fields ?? []).map((f) => ({ key: f.key, label: f.label, options: f.options })),
                  ];
                  return (
                    <TabsContent key={sp.id} value={sp.id} className="mt-4 grid gap-4 sm:grid-cols-2">
                      {fields.map((f) => (
                        <FormField key={f.key} id={`${sp.id}-${f.key}`} label={f.label}>
                          <Select
                            value={s.sports[sp.id]?.[f.key] ?? ""}
                            onValueChange={(v) => patch({ sports: { ...s.sports, [sp.id]: { ...s.sports[sp.id], [f.key]: v } } })}
                          >
                            <SelectTrigger id={`${sp.id}-${f.key}`}>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {f.options.map((o) => (
                                <SelectItem key={o} value={o}>
                                  {o}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                      ))}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </section>
          )}

          <section className="rounded-card border border-line bg-card p-5">
            <h2 className="mb-4 font-display text-xl font-bold">Visibility</h2>
            <div className="flex flex-col gap-4">
              {(
                [
                  ["showAge", "Show my age", "Others see your age, never your birth date."],
                  ["showCity", "Show my city", "Appears on your public card."],
                  ["showStats", "Show my stats", "Career stats on your public profile."],
                ] as const
              ).map(([key, label, help]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink">{label}</p>
                    <p className="text-sm text-muted">{help}</p>
                  </div>
                  <Switch checked={s[key]} onCheckedChange={(v) => patch({ [key]: v } as Partial<ProfileFormState>)} aria-label={label} />
                </div>
              ))}
            </div>
          </section>
          {errors.form && (
            <p role="alert" className="text-sm text-danger">
              {errors.form}
            </p>
          )}
        </div>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 p-3 backdrop-blur-xs">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">You have unsaved changes</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setS(saved); setErrors({}); }} disabled={saving}>
                Discard
              </Button>
              <Button onClick={onSave} loading={saving}>
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
