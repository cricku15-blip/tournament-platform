"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/browser";
import { ChatPanel } from "./chat-panel";

type Access = { kind: "loading" } | { kind: "anon" } | { kind: "outsider" } | { kind: "member"; userId: string; isOrganizer: boolean };

/** Per-viewer part of the Chat tab. The page itself stays cacheable; membership is checked here (and again by RLS and the RPC). */
export function ChatGate({ tournamentId, slug, organizerId, managerIds, endDate, chatEnabled }: { tournamentId: string; slug: string; organizerId: string; managerIds: string[]; endDate: string | null; chatEnabled: boolean }) {
  const [access, setAccess] = React.useState<Access>({ kind: "loading" });
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return !cancelled && setAccess({ kind: "anon" });
      const { data } = await supabase.rpc("is_tournament_member", { tid: tournamentId });
      if (cancelled) return;
      setAccess(data === true ? { kind: "member", userId: user.id, isOrganizer: user.id === organizerId } : { kind: "outsider" });
    })();
    return () => {
      cancelled = true;
    };
  }, [tournamentId, organizerId]);

  if (!chatEnabled) return <EmptyState title="Chat is switched off" description="The organizer or admin has paused chat for now. Announcements still appear on the Overview tab." />;
  if (access.kind === "loading") return <Skeleton className="h-72 w-full rounded-card" />;
  if (access.kind === "member") return <ChatPanel tournamentId={tournamentId} userId={access.userId} organizerId={organizerId} managerIds={managerIds} endDate={endDate} isOrganizer={access.isOrganizer} />;
  return (
    <EmptyState
      title="Join this tournament to chat"
      description="Chat is open to the organizer, team managers and players in this tournament."
      action={access.kind === "anon" ? <Button asChild variant="secondary"><Link href={`/login?next=${encodeURIComponent(`/tournaments/${slug}/chat`)}`}>Log in</Link></Button> : undefined}
    />
  );
}
