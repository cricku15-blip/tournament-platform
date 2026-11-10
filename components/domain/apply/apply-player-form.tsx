"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { applyAsPlayer } from "@/app/(app)/tournaments/[slug]/apply-player/actions";

export interface ProfileField {
  key: string;
  label: string;
  options: string[];
}

export function ApplyPlayerForm({
  tournamentId,
  roles,
  fields,
  questions,
  defaults,
}: {
  tournamentId: string;
  roles: string[];
  fields: ProfileField[];
  questions: Array<{ q: string; required: boolean }>;
  defaults: { role: string; phone: string; details: Record<string, string> };
}) {
  const [role, setRole] = React.useState(defaults.role);
  const [experience, setExperience] = React.useState("");
  const [phone, setPhone] = React.useState(defaults.phone);
  const [details, setDetails] = React.useState(defaults.details);
  const [notes, setNotes] = React.useState("");
  const [available, setAvailable] = React.useState(false);
  const [ack, setAck] = React.useState(false);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState<{ field?: string; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const err = (f: string) => (error?.field === f ? error.text : undefined);
  const sel = "h-11 w-full rounded-input border border-line bg-card px-3 text-base";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await applyAsPlayer({
      tournamentId, role, experience, phone, available, paymentsAck: ack, notes, details,
      answers: Object.fromEntries(questions.map((q, i) => [`q${i + 1}`, answers[`q${i + 1}`] ?? ""])),
      requiredAnswers: questions.map((q, i) => (q.required ? `q${i + 1}` : "")).filter(Boolean),
    });
    setBusy(false);
    if (r.ok) return setDone(true);
    setError({ field: r.field, text: r.error });
  }

  if (done) {
    return (
      <div role="status" className="rounded-card border border-primary/30 bg-primary/10 p-6">
        <h2 className="font-display text-2xl font-bold">Application sent</h2>
        <p className="mt-1 text-sm text-muted">Status: <strong>Pending</strong>. The organizer will review it and you&apos;ll get a notification.</p>
        <Button asChild className="mt-4"><Link href="/player/applications">See my applications</Link></Button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="ap-role" label="Role or position" required error={err("role")}>
          <select id="ap-role" className={sel} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Choose</option>
            {roles.map((r) => <option key={r}>{r}</option>)}
          </select>
        </FormField>
        <FormField id="ap-exp" label="Experience" required error={err("experience")}>
          <select id="ap-exp" className={sel} value={experience} onChange={(e) => setExperience(e.target.value)}>
            <option value="">Choose</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </FormField>
        {fields.map((f) => (
          <FormField key={f.key} id={`ap-${f.key}`} label={f.label}>
            <select id={`ap-${f.key}`} className={sel} value={details[f.key] ?? ""} onChange={(e) => setDetails({ ...details, [f.key]: e.target.value })}>
              <option value="">Choose</option>
              {f.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          </FormField>
        ))}
        <FormField id="ap-phone" label="Contact phone" error={err("phone")} helper="Shown to the organizer only.">
          <Input id="ap-phone" type="tel" inputMode="tel" value={phone} error={Boolean(err("phone"))} onChange={(e) => setPhone(e.target.value)} />
        </FormField>
      </div>
      {questions.map((q, i) => (
        <FormField key={i} id={`ap-q${i}`} label={`${q.q}${q.required ? "" : " (optional)"}`} required={q.required} error={i === 0 ? err("answers") : undefined}>
          <Input id={`ap-q${i}`} maxLength={200} value={answers[`q${i + 1}`] ?? ""} onChange={(e) => setAnswers({ ...answers, [`q${i + 1}`]: e.target.value })} />
        </FormField>
      ))}
      <FormField id="ap-notes" label={`Notes (${notes.length}/300)`} error={err("notes")}>
        <Textarea id="ap-notes" rows={3} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormField>
      <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5" checked={available} onChange={(e) => setAvailable(e.target.checked)} /><span>I&apos;m available for the tournament dates.</span></label>
      {err("available") && <p role="alert" className="text-sm text-danger">{err("available")}</p>}
      <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-5 w-5" checked={ack} onChange={(e) => setAck(e.target.checked)} /><span>I understand any entry fees or prizes are handled outside this platform.</span></label>
      {err("paymentsAck") && <p role="alert" className="text-sm text-danger">{err("paymentsAck")}</p>}
      {error && !error.field && <p role="alert" className="text-sm text-danger">{error.text}</p>}
      <Button type="submit" size="lg" loading={busy} className="self-start">Submit application</Button>
    </form>
  );
}
