"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { sendContact } from "@/app/(public)/contact/actions";
import { CONTACT_TOPICS } from "@/lib/public/content";

export function ContactForm() {
  const [state, setState] = React.useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = React.useState<{ field?: string; message: string } | null>(null);
  const [count, setCount] = React.useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setState("sending");
    const f = new FormData(e.currentTarget);
    const res = await sendContact(Object.fromEntries(f.entries()));
    if (res.ok) return setState("sent");
    setState("idle");
    setError({ field: res.field, message: res.error });
  }

  if (state === "sent") {
    return (
      <div role="status" className="rounded-card border border-primary/30 bg-primary/10 p-6">
        <h2 className="font-display text-2xl font-bold">Message sent</h2>
        <p className="mt-1 text-sm text-muted">Thanks for getting in touch. We usually reply within two working days.</p>
      </div>
    );
  }
  const err = (field: string) => (error?.field === field ? error.message : undefined);
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormField id="c-name" label="Your name" required error={err("name")}>
        <Input id="c-name" name="name" autoComplete="name" error={Boolean(err("name"))} />
      </FormField>
      <FormField id="c-email" label="Email" required error={err("email")}>
        <Input id="c-email" name="email" type="email" autoComplete="email" error={Boolean(err("email"))} />
      </FormField>
      <FormField id="c-topic" label="Topic">
        <select id="c-topic" name="topic" className="h-11 w-full rounded-input border border-line bg-card px-3 text-base">
          {CONTACT_TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </FormField>
      <FormField id="c-message" label={`Message (${count}/2000)`} required error={err("message")}>
        <Textarea id="c-message" name="message" rows={6} maxLength={2000} onChange={(e) => setCount(e.target.value.length)} />
      </FormField>
      {/* Honeypot: hidden from people and assistive tech */}
      <div aria-hidden className="absolute left-[-9999px]">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {error && !error.field && (
        <p role="alert" className="text-sm text-danger">
          {error.message}
        </p>
      )}
      <Button type="submit" loading={state === "sending"} className="self-start">
        Send message
      </Button>
    </form>
  );
}
