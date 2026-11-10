"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptInvite, type InviteSummary } from "@/app/(auth)/join/actions";
import { formatDate } from "@/lib/format";

export function JoinCard({ code, invite, loggedIn }: { code: string; invite: InviteSummary; loggedIn: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    const r = await acceptInvite(code);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    router.replace(`/manager/teams/${r.teamId}`);
    router.refresh();
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">You&apos;re invited</p>
      <h1 className="mt-1 font-display text-3xl font-bold">Manage {invite.team}</h1>
      <dl className="mt-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between"><dt className="text-muted">Tournament</dt><dd className="font-semibold">{invite.tournament}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Sport and city</dt><dd className="font-semibold">{invite.sport}, {invite.city}</dd></div>
        {invite.organizer && <div className="flex justify-between"><dt className="text-muted">Organizer</dt><dd className="font-semibold">{invite.organizer}</dd></div>}
        <div className="flex justify-between"><dt className="text-muted">Invite valid until</dt><dd className="font-semibold">{formatDate(invite.expiresAt)}</dd></div>
      </dl>
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
      <div className="mt-6 flex flex-col gap-2">
        {loggedIn ? (
          <Button size="lg" onClick={accept} loading={busy}>Accept and manage team</Button>
        ) : (
          <Button asChild size="lg"><Link href={`/login?next=${encodeURIComponent(`/join/${code}`)}`}>Log in to accept</Link></Button>
        )}
        <Button asChild variant="ghost"><Link href="/">Decline</Link></Button>
      </div>
    </div>
  );
}
