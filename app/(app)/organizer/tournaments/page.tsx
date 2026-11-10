import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RowActions } from "@/components/domain/organizer/row-actions";
import { decodeCursor, encodeCursor, keysetFilter } from "@/lib/pagination/keyset";
import { formatDate } from "@/lib/format";
import { STATUS_LABEL, statusVariant } from "@/lib/public/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My tournaments" };
const PAGE = 20;

const TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "awaiting", label: "Awaiting payment" },
  { key: "open", label: "Open" },
  { key: "live", label: "Live" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export default async function OrganizerTournamentsPage({ searchParams }: { searchParams: Promise<{ tab?: string; cursor?: string }> }) {
  const user = await getSessionUser();
  if (!user) return null;
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "all";
  const cursor = decodeCursor(sp.cursor);
  const supabase = await createClient();

  let awaitingIds: string[] = [];
  if (tab === "awaiting") {
    const { data } = await supabase.from("tournament_payments").select("tournament_id").eq("organizer_id", user.id).eq("status", "created").limit(200);
    awaitingIds = [...new Set((data ?? []).map((p) => p.tournament_id))];
  }

  let q = supabase
    .from("tournaments")
    .select("id, name, slug, status, start_date, team_count, approved_team_count, created_at, sport_id, sports(name)")
    .eq("organizer_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE + 1);
  if (tab === "draft") q = q.eq("status", "draft");
  else if (tab === "awaiting") q = awaitingIds.length ? q.eq("status", "draft").in("id", awaitingIds) : q.eq("id", "00000000-0000-0000-0000-000000000000");
  else if (tab === "open") q = q.in("status", ["paid", "registration_open", "registration_closed", "auction", "squads_locked"]);
  else if (tab === "live") q = q.eq("status", "live");
  else if (tab === "completed") q = q.eq("status", "completed");
  else if (tab === "cancelled") q = q.eq("status", "cancelled");
  if (cursor) q = q.or(keysetFilter(cursor));
  const { data } = await q;

  const rows = data ?? [];
  const page = rows.slice(0, PAGE);
  const last = page[page.length - 1];
  const more = rows.length > PAGE && last ? `/organizer/tournaments?tab=${tab}&cursor=${encodeCursor({ t: last.created_at, id: last.id })}` : null;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">My tournaments</h1>
        <Button asChild>
          <Link href="/organizer/tournaments/new">Create tournament</Link>
        </Button>
      </div>
      <nav aria-label="Filter" className="mt-5 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <Link key={t.key} href={`/organizer/tournaments?tab=${t.key}`} aria-current={t.key === tab ? "page" : undefined} className={cn("inline-flex min-h-11 shrink-0 items-center rounded-input px-4 text-sm font-semibold", t.key === tab ? "bg-primary text-primary-ink" : "text-muted hover:text-ink")}>
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4">
        {page.length === 0 ? (
          <EmptyState title="No tournaments here" description={tab === "all" ? "Create your first tournament to get started." : "Nothing in this view yet."} action={tab === "all" ? <Button asChild><Link href="/organizer/tournaments/new">Create tournament</Link></Button> : undefined} />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
            {page.map((t) => (
              <li key={t.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-ink">{t.name}</p>
                    <Badge variant={t.status === "draft" ? "draft" : statusVariant(t.status)}>{t.status === "draft" ? "Draft" : STATUS_LABEL[t.status] ?? t.status}</Badge>
                  </div>
                  <p className="text-sm text-muted">
                    {(t.sports as unknown as { name: string } | null)?.name} · {t.approved_team_count ?? 0}/{t.team_count} teams{t.start_date ? ` · ${formatDate(t.start_date)}` : ""}
                  </p>
                </div>
                <RowActions id={t.id} name={t.name} slug={t.slug} status={t.status} />
              </li>
            ))}
          </ul>
        )}
        {more && (
          <div className="mt-4 text-center">
            <Button asChild variant="secondary">
              <Link href={more}>Load more</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
