"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { REASON_COPY, type ApplyReason } from "@/lib/payments/eligibility";

interface Viewer {
  loggedIn: boolean;
  onboarded?: boolean;
  cityMatch?: boolean;
  subscribed?: boolean;
  applicationStatus?: string | null;
  teamStatus?: string | null;
  isOrganizer?: boolean;
  eligibility?: { canApply: boolean; reason: ApplyReason };
}

export function TournamentActions({
  id,
  slug,
  status,
  allowPlayers,
  teamEntry,
}: {
  id: string;
  slug: string;
  status: string;
  allowPlayers: boolean;
  teamEntry: string;
}) {
  const [viewer, setViewer] = React.useState<Viewer | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/tournaments/viewer?id=${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Viewer>) : Promise.reject(new Error("viewer"))))
      .then((v) => !cancelled && setViewer(v))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const open = status === "registration_open";
  const base = `/tournaments/${slug}`;
  const next = encodeURIComponent(base);

  if (failed) return null;
  if (!viewer) return <Skeleton className="h-11 w-44 rounded-input" />;

  if (viewer.isOrganizer) {
    return (
      <Button asChild>
        <Link href="/organizer">Manage tournament</Link>
      </Button>
    );
  }
  if (!open) {
    return <p className="text-sm text-muted">{status === "completed" ? "This tournament has finished." : "Registration isn't open right now."}</p>;
  }
  if (!viewer.loggedIn) {
    return (
      <Button asChild>
        <Link href={`/login?next=${next}`}>Log in to join</Link>
      </Button>
    );
  }
  if (!viewer.onboarded) {
    return (
      <Button asChild>
        <Link href="/onboarding">Finish your profile to join</Link>
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {allowPlayers &&
          (viewer.eligibility?.canApply ? (
            <Button asChild>
              <Link href={`${base}/apply-player`}>Apply as a player</Link>
            </Button>
          ) : viewer.eligibility?.reason === "city_mismatch" ? (
            <Button asChild variant="secondary">
              <Link href="/profile">Switch city</Link>
            </Button>
          ) : viewer.eligibility?.reason === "subscription_required" ? (
            <Button asChild>
              <Link href="/subscription">Start subscription</Link>
            </Button>
          ) : viewer.eligibility?.reason === "already_applied" ? (
            <Button variant="secondary" disabled>
              Application {viewer.applicationStatus ?? "sent"}
            </Button>
          ) : null)}
        {teamEntry !== "invite" && !viewer.teamStatus && (
          <Button asChild variant="secondary">
            <Link href={`${base}/apply-team`}>Join with your team</Link>
          </Button>
        )}
        {viewer.teamStatus && (
          <Button asChild variant="secondary">
            <Link href="/manager">Your team ({viewer.teamStatus})</Link>
          </Button>
        )}
      </div>
      {allowPlayers && viewer.eligibility && !viewer.eligibility.canApply && viewer.eligibility.reason !== "not_logged_in" && viewer.eligibility.reason !== "registration_closed" && (
        <p className="text-xs text-muted">{REASON_COPY[viewer.eligibility.reason as Exclude<ApplyReason, "ok">]}</p>
      )}
    </div>
  );
}
