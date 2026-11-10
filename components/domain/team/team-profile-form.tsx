"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { ImageUploader } from "@/components/ui/image-uploader";
import { toast } from "@/components/ui/toast";
import { updateTeamProfile } from "@/app/(app)/manager/actions";

export function TeamProfileForm({ teamId, userId, initial, nameLocked }: { teamId: string; userId: string; initial: { name: string; logoUrl: string | null; colorPrimary: string; colorSecondary: string; description: string; homeGround: string }; nameLocked: boolean }) {
  const router = useRouter();
  const [v, setV] = React.useState(initial);
  const [error, setError] = React.useState<{ field?: string; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);
  const set = (p: Partial<typeof v>) => setV((x) => ({ ...x, ...p }));
  const err = (f: string) => (error?.field === f ? error.text : undefined);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await updateTeamProfile(teamId, v);
    setBusy(false);
    if (!r.ok) return setError({ field: r.field, text: r.error });
    toast({ title: "Team profile saved" });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="flex max-w-2xl flex-col gap-4">
      <FormField id="tp-name" label="Team name" error={err("name")} helper={nameLocked ? "The name is locked after registration closes." : undefined}>
        <Input id="tp-name" value={v.name} disabled={nameLocked} maxLength={50} error={Boolean(err("name"))} onChange={(e) => set({ name: e.target.value })} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
        <FormField label="Logo"><ImageUploader bucket="team-logos" userId={userId} value={v.logoUrl} onChange={(u) => set({ logoUrl: u })} aspectRatio="1:1" maxWidth={600} /></FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="tp-c1" label="Main colour"><input id="tp-c1" type="color" value={v.colorPrimary || "#1F7A4D"} onChange={(e) => set({ colorPrimary: e.target.value })} className="h-11 w-full rounded-input border border-line bg-card" /></FormField>
          <FormField id="tp-c2" label="Second colour"><input id="tp-c2" type="color" value={v.colorSecondary || "#0F2A43"} onChange={(e) => set({ colorSecondary: e.target.value })} className="h-11 w-full rounded-input border border-line bg-card" /></FormField>
          <FormField id="tp-gr" label="Home ground" className="sm:col-span-2"><Input id="tp-gr" value={v.homeGround} maxLength={80} onChange={(e) => set({ homeGround: e.target.value })} /></FormField>
        </div>
      </div>
      <FormField id="tp-desc" label={`Description (${v.description.length}/500)`} error={err("description")}><Textarea id="tp-desc" rows={4} maxLength={500} value={v.description} onChange={(e) => set({ description: e.target.value })} /></FormField>
      {error && !error.field && <p role="alert" className="text-sm text-danger">{error.text}</p>}
      <Button type="submit" loading={busy} disabled={!dirty} className="self-start">Save changes</Button>
    </form>
  );
}
