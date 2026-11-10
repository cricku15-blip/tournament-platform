"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { toast } from "@/components/ui/toast";
import { postAnnouncement } from "@/app/(app)/organizer/actions";

export function AnnouncementForm({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [pin, setPin] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setBusy(true);
    const r = await postAnnouncement(tournamentId, title, body, pin);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setTitle("");
    setBody("");
    setPin(false);
    toast({ title: "Announcement posted" });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-card border border-line bg-card p-4">
      <FormField id="an-title" label="Title"><Input id="an-title" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} /></FormField>
      <FormField id="an-body" label={`Message (${body.length}/1000)`} error={error}><Textarea id="an-body" rows={4} maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} /></FormField>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} /> Pin to the top</label>
      <Button type="submit" loading={busy} className="self-start">Post announcement</Button>
    </form>
  );
}
