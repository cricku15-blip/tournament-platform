"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { addTeamSlot, inviteManager, removeTeam, reviewTeam, setTeamEntry } from "@/app/(app)/organizer/actions";

export interface TeamRow {
  id: string;
  name: string;
  status: string;
  manager_name: string | null;
}

const STATUS: Record<string, string> = { invited: "Invited", pending: "Pending", approved: "Approved", rejected: "Rejected", withdrawn: "Withdrawn" };

export function TeamsTab({ tournamentId, slug, teams, teamCount, teamEntry, canEdit }: { tournamentId: string; slug: string; teams: TeamRow[]; teamCount: number; teamEntry: string; canEdit: boolean }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [invite, setInvite] = React.useState<{ teamId: string; code: string } | null>(null);
  const [removing, setRemoving] = React.useState<TeamRow | null>(null);
  const active = teams.filter((t) => !["rejected", "withdrawn"].includes(t.status)).length;
  const full = active >= teamCount;
  const inviteUrl = (code: string) => `${typeof window === "undefined" ? "" : window.location.origin}/join/${code}`;

  async function wrap<T extends { ok: boolean }>(key: string, fn: () => Promise<T & { ok: boolean; error?: string }>, okMsg?: string) {
    setBusy(key);
    const r = await fn();
    setBusy(null);
    if (!r.ok) {
      toast({ title: (r as { error?: string }).error ?? "Something went wrong." });
      return null;
    }
    if (okMsg) toast({ title: okMsg });
    router.refresh();
    return r;
  }

  async function onInvite(teamId: string) {
    const r = await wrap("inv" + teamId, () => inviteManager(teamId));
    if (r && "code" in r) setInvite({ teamId, code: (r as unknown as { code: string }).code });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-card p-4">
        <div>
          <p className="font-semibold">Team applications</p>
          <p className="text-sm text-muted">Let teams apply from the tournament page. {teamEntry === "invite" ? "Currently invite only." : "Currently open."}</p>
        </div>
        <Switch
          aria-label="Accept team applications"
          checked={teamEntry !== "invite"}
          disabled={!canEdit}
          onCheckedChange={(v) => wrap("entry", () => setTeamEntry(tournamentId, v ? "both" : "invite"))}
        />
      </div>

      {canEdit && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const r = await wrap("add", () => addTeamSlot(tournamentId, name), "Team slot added");
            if (r) setName("");
          }}
        >
          <div className="min-w-56 flex-1">
            <label htmlFor="new-team" className="mb-1 block text-sm font-semibold">
              Add a team slot ({active} of {teamCount})
            </label>
            <Input id="new-team" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} disabled={full} placeholder={full ? "Team limit reached" : "Team name"} />
          </div>
          <Button type="submit" disabled={full || !name.trim()} loading={busy === "add"}>
            Add team
          </Button>
        </form>
      )}

      {teams.length === 0 ? (
        <p className="rounded-card border border-line bg-card p-6 text-center text-sm text-muted">No teams yet. Add a slot and invite its manager, or wait for applications.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
          {teams.map((t) => (
            <li key={t.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-semibold">{t.name}</p>
                <p className="text-sm text-muted">{t.manager_name ? `Manager: ${t.manager_name}` : "No manager yet"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={t.status === "approved" ? "open" : t.status === "rejected" ? "cancelled" : "neutral"}>{STATUS[t.status] ?? t.status}</Badge>
                {t.status === "pending" && canEdit && (
                  <>
                    <Button size="sm" loading={busy === "a" + t.id} onClick={() => wrap("a" + t.id, () => reviewTeam(tournamentId, t.id, "approved"), "Team approved")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="secondary" loading={busy === "r" + t.id} onClick={() => wrap("r" + t.id, () => reviewTeam(tournamentId, t.id, "rejected"), "Team rejected")}>
                      Reject
                    </Button>
                  </>
                )}
                {!t.manager_name && ["invited", "pending"].includes(t.status) && canEdit && (
                  <Button size="sm" variant="secondary" loading={busy === "inv" + t.id} onClick={() => onInvite(t.id)}>
                    {t.status === "invited" ? "Invite manager" : "Resend invite"}
                  </Button>
                )}
                {canEdit && (
                  <Button size="sm" variant="ghost" onClick={() => setRemoving(t)}>
                    Remove
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {invite && (
        <div role="status" className="rounded-card border border-primary/30 bg-primary/10 p-4">
          <p className="font-semibold">Invite for {teams.find((t) => t.id === invite.teamId)?.name}</p>
          <p className="mt-1 break-all text-sm">{inviteUrl(invite.code)}</p>
          <p className="text-sm text-muted">Code: {invite.code}. Expires in 14 days. Creating a new invite cancels the old one.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(inviteUrl(invite.code)).catch(() => {});
                toast({ title: "Invite link copied" });
              }}
            >
              Copy link
            </Button>
            <Button asChild size="sm" variant="secondary">
              <a href={`https://wa.me/?text=${encodeURIComponent(`Join our tournament on GroundWar: ${inviteUrl(invite.code)}`)}`} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </Button>
          </div>
        </div>
      )}
      <p className="text-xs text-muted">Public page: /tournaments/{slug}/teams</p>
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        title="Remove this team?"
        itemName={removing?.name}
        description="Its invite and squad are deleted. This can't be undone."
        confirmLabel="Remove team"
        variant="destructive"
        onConfirm={async () => {
          if (removing) await wrap("rm", () => removeTeam(tournamentId, removing.id), "Team removed");
        }}
      />
    </div>
  );
}
