"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/browser";
import { formatDateTime } from "@/lib/format";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

interface Row {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const toItem = (r: Row): NotificationItem => ({
  id: r.id,
  title: r.title,
  body: r.body ?? "",
  createdAt: r.created_at,
  read: r.read_at !== null,
  href: r.link ?? undefined,
});

export function NotificationsBell({
  userId,
  unreadCount: initialUnread = 0,
  notifications: initialItems = [],
  className,
}: {
  userId?: string;
  unreadCount?: number;
  notifications?: NotificationItem[];
  className?: string;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState<NotificationItem[]>(initialItems);
  const [unread, setUnread] = React.useState(initialUnread);

  React.useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const [list, count] = await Promise.all([
        supabase
          .from("notifications")
          .select("id, title, body, link, read_at, created_at")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId!)
          .is("read_at", null),
      ]);
      if (cancelled) return;
      setItems((list.data ?? []).map(toItem));
      setUnread(count.count ?? 0);
    }
    void load();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as Row;
          setItems((prev) => [toItem(row), ...prev.filter((p) => p.id !== row.id)].slice(0, 10));
          if (!row.read_at) setUnread((u) => u + 1);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function open(n: NotificationItem) {
    if (!n.read && userId) {
      setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, read: true } : p)));
      setUnread((u) => Math.max(0, u - 1));
      await createClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    }
    if (n.href) router.push(n.href);
  }

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `View notifications, ${unread} unread` : "View notifications"}
          className={cn(
            "relative flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card text-muted transition-colors hover:text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary select-none",
            className
          )}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-display text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          className="z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-card border border-line bg-card p-0 text-ink shadow-lg animate-in fade-in-80"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-display text-base font-bold text-ink">Notifications</span>
            {unread > 0 && (
              <span className="rounded-badge bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {unread} new
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-line" aria-live="polite">
            {items.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">No notifications yet.</div>
            ) : (
              items.map((n) => (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => open(n)}
                  className={cn(
                    "block w-full p-3.5 text-left text-xs transition-colors hover:bg-surface/60 focus-visible:outline-2 focus-visible:outline-primary",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <p className="font-semibold text-ink">{n.title}</p>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-muted">{n.body}</p>}
                  <span className="mt-1 block text-[10px] text-muted/70">{formatDateTime(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-line p-2 text-center">
            <Link href="/notifications" className="text-xs font-semibold text-primary hover:underline">
              View all notifications
            </Link>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
