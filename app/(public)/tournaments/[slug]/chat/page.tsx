import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { loadTournament } from "@/lib/public/page-helpers";
import { getAnnouncements } from "@/lib/public/queries";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await loadTournament((await params).slug, "/chat");
  return { title: `Chat | ${t.name}`, alternates: { canonical: `/tournaments/${t.slug}/chat` } };
}

export default async function ChatPage({ params }: Props) {
  const t = await loadTournament((await params).slug, "/chat");
  const pinned = (await getAnnouncements(t.id)).find((a) => a.is_pinned);
  // The member chat component is added in Plan 9; everyone else sees this.
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {pinned && (
        <article className="rounded-card border border-line bg-card p-4">
          <h2 className="font-semibold">{pinned.title}</h2>
          <p className="mt-1 whitespace-pre-line text-sm text-muted">{pinned.body}</p>
        </article>
      )}
      <EmptyState
        title="Join this tournament to chat"
        description="Chat is open to players and managers in this tournament."
        action={
          <Button asChild variant="secondary">
            <Link href={`/login?next=${encodeURIComponent(`/tournaments/${t.slug}/chat`)}`}>Log in</Link>
          </Button>
        }
      />
    </div>
  );
}
