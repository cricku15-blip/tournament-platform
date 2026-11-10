import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { NotificationRow } from "@/components/domain/notification-row";
import { decodeCursor, encodeCursor, keysetFilter } from "@/lib/pagination/keyset";
import { groupByDay } from "@/lib/notifications/group";
import { markAllRead } from "./actions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };
const PAGE = 30;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; cursor?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) return null;
  const sp = await searchParams;
  const unreadOnly = sp.tab === "unread";
  const cursor = decodeCursor(sp.cursor);

  const supabase = await createClient();
  let q = supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE + 1);
  if (unreadOnly) q = q.is("read_at", null);
  if (cursor) q = q.or(keysetFilter(cursor));
  const { data } = await q;

  const rows = data ?? [];
  const hasMore = rows.length > PAGE;
  const page = rows.slice(0, PAGE);
  const last = page[page.length - 1];
  const nextHref =
    hasMore && last
      ? `/notifications?${unreadOnly ? "tab=unread&" : ""}cursor=${encodeCursor({ t: last.created_at, id: last.id })}`
      : null;
  const { today, earlier } = groupByDay(page);

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-input px-4 text-sm font-semibold",
        active ? "bg-primary text-white" : "text-muted hover:text-ink"
      )}
    >
      {label}
    </Link>
  );

  const renderGroup = (label: string, list: typeof page) =>
    list.length > 0 && (
      <section aria-label={label}>
        <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">{label}</h2>
        <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
          {list.map((n) => (
            <NotificationRow
              key={n.id}
              id={n.id}
              title={n.title}
              body={n.body}
              link={n.link}
              createdAt={n.created_at}
              read={n.read_at !== null}
            />
          ))}
        </div>
      </section>
    );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-ink">Notifications</h1>
        <form action={markAllRead}>
          <Button type="submit" variant="secondary" size="sm">
            Mark all as read
          </Button>
        </form>
      </div>
      <nav aria-label="Filter" className="flex gap-1">
        {tab("/notifications", "All", !unreadOnly)}
        {tab("/notifications?tab=unread", "Unread", unreadOnly)}
      </nav>

      {page.length === 0 ? (
        <EmptyState
          title={unreadOnly ? "You're all caught up" : "Nothing here yet"}
          description={unreadOnly ? "No unread notifications." : "Updates about your tournaments and teams will appear here."}
        />
      ) : (
        <>
          {renderGroup("Today", today)}
          {renderGroup("Earlier", earlier)}
          {nextHref && (
            <Button asChild variant="secondary" className="self-center">
              <Link href={nextHref}>Load older</Link>
            </Button>
          )}
        </>
      )}
    </div>
  );
}
