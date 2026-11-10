"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Viewer {
  loggedIn: boolean;
  onboarded?: boolean;
  cityMatch?: boolean;
  subscribed?: boolean;
  applicationStatus?: string | null;
  teamStatus?: string | null;
  isOrganizer?: boolean;
}

export function TournamentActions({
  id,
  slug,
  status,
  allowPlayers,
  teamEntry,
  squadMode,
}: {
  id: string;
  slug: string;
  status: string;
  allowPlayers: boolean;
  teamEntry: string;
  squadMode: string;
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
          (viewer.applicationStatus ? (
            <Button variant="secondary" disabled>
              Application {viewer.applicationStatus}
            </Button>
          ) : !viewer.cityMatch ? (
            <Button variant="secondary" disabled>
              Different city
            </Button>
          ) : !viewer.subscribed ? (
            <Button asChild>
              <Link href="/subscription">Subscribe to apply</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href={`${base}/apply-player`}>Apply as a player</Link>
            </Button>
          ))}
        {teamEntry === "open" && !viewer.teamStatus && (
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
      {allowPlayers && !viewer.cityMatch && !viewer.applicationStatus && (
        <p className="text-xs text-muted">This tournament is in a different city than your profile city.</p>
      )}
    </div>
  );
}
