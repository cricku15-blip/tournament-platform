import type { Metadata } from "next";
import { ChatGate } from "@/components/domain/chat/chat-gate";
import { loadTournament } from "@/lib/public/page-helpers";
import { getAnnouncements, getSiteSetting, getTournamentTeams } from "@/lib/public/queries";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await loadTournament((await params).slug, "/chat");
  return { title: `Chat | ${t.name}`, alternates: { canonical: `/tournaments/${t.slug}/chat` } };
}

export default async function ChatPage({ params }: Props) {
  const t = await loadTournament((await params).slug, "/chat");
  const [announcements, teams, flags] = await Promise.all([getAnnouncements(t.id), getTournamentTeams(t.id), getSiteSetting("flags")]);
  const pinned = announcements.find((a) => a.is_pinned);
  const chatEnabled = (flags as { chat?: boolean } | null)?.chat !== false;
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {pinned && (
        <article className="rounded-card border border-line bg-card p-4">
          <h2 className="font-semibold">{pinned.title}</h2>
          <p className="mt-1 whitespace-pre-line text-sm text-muted">{pinned.body}</p>
        </article>
      )}
      <ChatGate
        tournamentId={t.id}
        slug={t.slug}
        organizerId={String((t as { organizer_id?: string }).organizer_id ?? "")}
        managerIds={teams.map((x) => (x as { manager_id?: string }).manager_id).filter((x): x is string => !!x)}
        endDate={t.end_date}
        chatEnabled={chatEnabled}
      />
    </div>
  );
}
