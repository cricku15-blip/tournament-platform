"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { setMatchLive } from "@/app/(app)/organizer/tournaments/[id]/matches/actions";
import { formatDateTime } from "@/lib/format";

export interface ResMatch {
  id: string;
  match_no: number | null;
  a: string;
  b: string;
  ready: boolean; // both teams decided
  scheduled_at: string | null;
  status: string;
  published: boolean;
}

export function ResultsTab({ tournamentId, matches, canAct }: { tournamentId: string; matches: ResMatch[]; canAct: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const need = matches.filter((m) => m.ready && !m.published && m.status !== "cancelled" && m.status !== "postponed").length;

  async function live(id: string) {
    setBusy(id);
    const r = await setMatchLive(tournamentId, id);
    setBusy(null);
    if (!r.ok) return toast({ title: r.error });
    toast({ title: "Match is live" });
    router.refresh();
  }

  if (matches.length === 0) return <p className="rounded-card border border-line bg-card p-6 text-center text-sm text-muted">No published fixtures yet. Publish fixtures first.</p>;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted" aria-live="polite">{need} match{need === 1 ? "" : "es"} need a result.</p>
      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
        {matches.map((m) => (
          <li key={m.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-semibold">#{m.match_no} {m.a} vs {m.b}</p>
              <p className="text-sm text-muted">{m.scheduled_at ? formatDateTime(m.scheduled_at) : "No date"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={m.published ? "completed" : m.status === "live" ? "live" : "neutral"} pulsing={m.status === "live"}>{m.published ? "Completed" : m.status === "live" ? "Live" : m.status === "scheduled" ? "Scheduled" : m.status}</Badge>
              {canAct && !m.published && m.status === "scheduled" && m.ready && <Button size="sm" variant="secondary" loading={busy === m.id} onClick={() => live(m.id)}>Set live</Button>}
              {canAct && (m.ready ? (
                <Button asChild size="sm"><Link href={`/organizer/tournaments/${tournamentId}/matches/${m.id}/result`}>{m.published ? "Edit result" : "Enter result"}</Link></Button>
              ) : (
                <Button size="sm" disabled title="Teams for this match aren't decided yet">Enter result</Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
