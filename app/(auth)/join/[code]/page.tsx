import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { JoinCard } from "@/components/domain/team/join-card";
import { getSessionUser } from "@/lib/session";
import { lookupInvite } from "../actions";

export const metadata: Metadata = { title: "Team invite", robots: { index: false, follow: false } };

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [invite, user] = await Promise.all([lookupInvite(code), getSessionUser()]);
  if (!invite) {
    return (
      <div role="alert">
        <h1 className="font-display text-3xl font-bold">Invite not valid</h1>
        <p className="mt-2 text-sm text-muted">This invite isn&apos;t valid anymore. Ask the organizer for a new one.</p>
        <Button asChild className="mt-6 w-full" size="lg"><Link href="/">Back to home</Link></Button>
      </div>
    );
  }
  return <JoinCard code={code} invite={invite} loggedIn={Boolean(user)} />;
}
