"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { ImageUploader } from "@/components/ui/image-uploader";
import { applyWithTeam } from "@/app/(app)/tournaments/[slug]/apply-team/actions";

export function ApplyTeamForm({ tournamentId, userId, defaultPhone, squadMin, squadMax }: { tournamentId: string; userId: string; defaultPhone: string; squadMin: number | null; squadMax: number | null }) {
  const [v, setV] = React.useState({ name: "", logoUrl: null as string | null, colorPrimary: "#1F7A4D", colorSecondary: "#0F2A43", homeGround: "", phone: defaultPhone, expected: "", notes: "", ack: false });
  const [error, setError] = React.useState<{ field?: string; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const err = (f: string) => (error?.field === f ? error.text : undefined);
  const set = (p: Partial<typeof v>) => setV((x) => ({ ...x, ...p }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await applyWithTeam({
      tournamentId, name: v.name, logoUrl: v.logoUrl, colorPrimary: v.colorPrimary, colorSecondary: v.colorSecondary, homeGround: v.homeGround,
      phone: v.phone, expectedSquad: v.expected ? Number(v.expected) : null, notes: v.notes, paymentsAck: v.ack,
    });
    setBusy(false);
    if (r.ok) return setDone(true);
    setError({ field: r.field, text: r.error });
  }

  if (done) {
    return (
      <div role="status" className="rounded-card border border-primary/30 bg-primary/10 p-6">
        <h2 className="font-display text-2xl font-bold">Team application sent</h2>
        <p className="mt-1 text-sm text-muted">Status: <strong>Pending</strong>. You&apos;re already set as the manager. The organizer reviews applications from their dashboard.</p>
        <Button asChild className="mt-4"><Link href="/manager/teams">Go to my teams</Link></Button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormField id="tm-name" label="Team name" required error={err("name")} helper="Must be unique in this tournament."><Input id="tm-name" value={v.name} maxLength={50} error={Boolean(err("name"))} onChange={(e) => set({ name: e.target.value })} /></FormField>
      <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
        <FormField label="Logo"><ImageUploader bucket="team-logos" userId={userId} value={v.logoUrl} onChange={(u) => set({ logoUrl: u })} aspectRatio="1:1" maxWidth={600} /></FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="tm-c1" label="Main colour" error={err("colorPrimary")}><input id="tm-c1" type="color" value={v.colorPrimary} onChange={(e) => set({ colorPrimary: e.target.value })} className="h-11 w-full rounded-input border border-line bg-card" /></FormField>
          <FormField id="tm-c2" label="Second colour" error={err("colorSecondary")}><input id="tm-c2" type="color" value={v.colorSecondary} onChange={(e) => set({ colorSecondary: e.target.value })} className="h-11 w-full rounded-input border border-line bg-card" /></FormField>
          <FormField id="tm-gr" label="Home ground"><Input id="tm-gr" value={v.homeGround} maxLength={80} onChange={(e) => set({ homeGround: e.target.value })} /></FormField>
          <FormField id="tm-ph" label="Manager phone" error={err("phone")} helper="Shown to the organizer only."><Input id="tm-ph" type="tel" inputMode="tel" value={v.phone} error={Boolean(err("phone"))} onChange={(e) => set({ phone: e.target.value })} /></FormField>
        </div>
      </div>
      <FormField id="tm-sq" label="Expected squad size" helper={squadMin && squadMax ? `This tournament needs ${squadMin} to ${squadMax} players per team.` : undefined}><Input id="tm-sq" inputMode="numeric" value={v.expected} onChange={(e) => set({ expected: e.target.value.replace(/\D/g, "").slice(0, 2) })} /></FormField>
      <FormField id="tm-notes" label={`Notes (${v.notes.length}/300)`} error={err("notes")}><Textarea id="tm-notes" rows={3} maxLength={300} value={v.notes} onChange={(e) => set({ notes: e.target.value })} /></FormField>
      <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5" checked={v.ack} onChange={(e) => set({ ack: e.target.checked })} /><span>I understand any entry fees or prizes are handled outside this platform.</span></label>
      {err("paymentsAck") && <p role="alert" className="text-sm text-danger">{err("paymentsAck")}</p>}
      {error && !error.field && <p role="alert" className="text-sm text-danger">{error.text}</p>}
      <Button type="submit" size="lg" loading={busy} className="self-start">Submit team application</Button>
    </form>
  );
}
