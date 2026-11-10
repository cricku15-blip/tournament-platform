"use client";

import * as React from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Smile } from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/browser";
import { CHAT_MAX, EMOJIS, dayKey, dayLabel, muteMinutesUntil } from "@/lib/chat";
import { decodeCursor, encodeCursor, keysetFilter } from "@/lib/pagination/keyset";
import { deleteChat, muteChatUser, reportChat, sendChat } from "@/app/(app)/chat-actions";
import { cn } from "@/lib/utils";

interface Msg { id: string; user_id: string; body: string; created_at: string; is_deleted: boolean }
const PAGE = 30;
const fmtTime = (iso: string) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(iso));

export function ChatPanel({ tournamentId, userId, organizerId, managerIds, endDate, isOrganizer }: { tournamentId: string; userId: string; organizerId: string; managerIds: string[]; endDate: string | null; isOrganizer: boolean }) {
  const supabase = React.useMemo(() => createClient(), []);
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [names, setNames] = React.useState<Record<string, string>>({});
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [blocked, setBlocked] = React.useState<string | null>(null);
  const [unread, setUnread] = React.useState(0);
  const box = React.useRef<HTMLDivElement>(null);
  const atBottom = React.useRef(true);
  const known = React.useRef(new Set<string>());

  const loadNames = React.useCallback(async (ids: string[]) => {
    const need = ids.filter((id) => id && !known.current.has(id));
    if (need.length === 0) return;
    need.forEach((id) => known.current.add(id));
    const { data } = await supabase.from("public_profiles").select("id, full_name").in("id", need.slice(0, 100));
    setNames((n) => ({ ...n, ...Object.fromEntries((data ?? []).filter((p) => p.id).map((p) => [p.id as string, p.full_name ?? "Member"])) }));
  }, [supabase]);

  const scrollDown = () => requestAnimationFrame(() => box.current?.scrollTo({ top: box.current.scrollHeight }));

  // Last 30 messages, then realtime (Postgres Changes filtered by tournament_id; RLS limits who receives rows).
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("chat_messages").select("id, user_id, body, created_at, is_deleted").eq("tournament_id", tournamentId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE + 1);
      if (cancelled) return;
      const rows = (data ?? []).slice(0, PAGE).reverse();
      setMsgs(rows);
      setHasMore((data ?? []).length > PAGE);
      setLoading(false);
      void loadNames(rows.map((r) => r.user_id));
      scrollDown();
    })();
    const ch = supabase
      .channel(`chat:${tournamentId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `tournament_id=eq.${tournamentId}` }, (p) => {
        const m = p.new as Msg;
        setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
        void loadNames([m.user_id]);
        if (m.user_id === userId || atBottom.current) scrollDown();
        else setUnread((u) => u + 1);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages", filter: `tournament_id=eq.${tournamentId}` }, (p) => {
        const m = p.new as Msg;
        setMsgs((cur) => cur.map((x) => (x.id === m.id ? { ...x, body: m.body, is_deleted: m.is_deleted } : x)));
      })
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [supabase, tournamentId, userId, loadNames]);

  async function older() {
    const first = msgs[0];
    if (!first) return;
    const cursor = decodeCursor(encodeCursor({ t: first.created_at, id: first.id }));
    if (!cursor) return;
    const prev = box.current?.scrollHeight ?? 0;
    const { data } = await supabase.from("chat_messages").select("id, user_id, body, created_at, is_deleted").eq("tournament_id", tournamentId).or(keysetFilter(cursor)).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE + 1);
    const rows = (data ?? []).slice(0, PAGE).reverse();
    setMsgs((cur) => [...rows, ...cur]);
    setHasMore((data ?? []).length > PAGE);
    void loadNames(rows.map((r) => r.user_id));
    requestAnimationFrame(() => box.current?.scrollTo({ top: (box.current?.scrollHeight ?? 0) - prev }));
  }

  async function send() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    const r = await sendChat(tournamentId, text);
    setSending(false);
    if (!r.ok) {
      if (r.code === "muted" || r.code === "not_a_member" || r.code === "chat_off") setBlocked(r.error);
      toast({ title: r.error });
      return;
    }
    setBody("");
  }

  const role = (id: string) => (id === organizerId ? "Organizer" : managerIds.includes(id) ? "Manager" : null);
  const nearLimit = body.length > CHAT_MAX - 60;

  if (loading) return <div className="h-72 animate-pulse rounded-card bg-surface" aria-label="Loading chat" />;

  return (
    <section className="flex h-[70vh] min-h-96 flex-col rounded-card border border-line bg-card" aria-label="Tournament chat">
      <div
        ref={box}
        className="flex-1 overflow-y-auto p-3"
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          if (atBottom.current) setUnread(0);
        }}
        aria-live="polite"
        aria-relevant="additions"
      >
        {hasMore && <div className="mb-3 text-center"><Button size="sm" variant="secondary" onClick={older}>Load older messages</Button></div>}
        {msgs.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">No messages yet. Say hello to the other teams.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {msgs.map((m, i) => {
              const mine = m.user_id === userId;
              const newDay = i === 0 || dayKey(msgs[i - 1].created_at) !== dayKey(m.created_at);
              const r = role(m.user_id);
              return (
                <React.Fragment key={m.id}>
                  {newDay && <li className="my-2 text-center text-xs font-semibold text-muted" role="separator">{dayLabel(m.created_at)}</li>}
                  <li className={cn("group flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] rounded-card px-3 py-2", mine ? "bg-primary/15" : "bg-surface")}>
                      <p className="flex flex-wrap items-center gap-2 text-xs"><span className="font-semibold">{mine ? "You" : names[m.user_id] ?? "Member"}</span>{r && <Badge variant="neutral">{r}</Badge>}<span className="text-muted">{fmtTime(m.created_at)}</span></p>
                      <p className={cn("whitespace-pre-wrap break-words text-sm", m.is_deleted && "italic text-muted")}>{m.is_deleted ? "Message removed" : m.body}</p>
                    </div>
                    {!m.is_deleted && (
                      <Menu.Root>
                        <Menu.Trigger asChild><button type="button" aria-label="Message actions" className="ml-1 flex h-11 w-8 items-center justify-center rounded text-muted opacity-0 focus-visible:opacity-100 group-hover:opacity-100"><MoreVertical className="h-4 w-4" aria-hidden /></button></Menu.Trigger>
                        <Menu.Portal>
                          <Menu.Content align="end" className="z-50 min-w-40 rounded-input border border-line bg-card p-1 shadow-lg">
                            {!mine && <Menu.Item onSelect={async () => { const r2 = await reportChat(m.id, "Reported from chat"); toast({ title: r2.ok ? "Thanks. Our team will review it." : r2.error }); }} className="flex min-h-11 cursor-pointer items-center rounded px-3 text-sm outline-none data-[highlighted]:bg-surface">Report</Menu.Item>}
                            {(mine || isOrganizer) && <Menu.Item onSelect={async () => { const r2 = await deleteChat(m.id); if (!r2.ok) toast({ title: r2.error }); }} className="flex min-h-11 cursor-pointer items-center rounded px-3 text-sm text-danger outline-none data-[highlighted]:bg-surface">Delete</Menu.Item>}
                            {isOrganizer && !mine && (
                              <>
                                {([["Mute 1 hour", 60], ["Mute 1 day", 1440], ["Mute for the rest of the tournament", muteMinutesUntil(endDate)]] as const).map(([l, mins]) => (
                                  <Menu.Item key={l} onSelect={async () => { const r2 = await muteChatUser(tournamentId, m.user_id, mins); toast({ title: r2.ok ? "User muted" : r2.error }); }} className="flex min-h-11 cursor-pointer items-center rounded px-3 text-sm outline-none data-[highlighted]:bg-surface">{l}</Menu.Item>
                                ))}
                              </>
                            )}
                          </Menu.Content>
                        </Menu.Portal>
                      </Menu.Root>
                    )}
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        )}
      </div>
      {unread > 0 && <button type="button" onClick={() => { scrollDown(); setUnread(0); }} className="mx-auto -mt-10 mb-2 rounded-badge bg-primary px-3 py-1 text-sm font-semibold text-primary-ink shadow">{unread} new message{unread === 1 ? "" : "s"}</button>}

      <form className="flex items-end gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        {blocked ? (
          <p role="status" className="flex-1 rounded-input border border-line bg-surface p-3 text-sm">{blocked}</p>
        ) : (
          <>
            <div className="flex-1">
              <label htmlFor="chat-input" className="sr-only">Message</label>
              <Input id="chat-input" value={body} maxLength={CHAT_MAX} placeholder="Write a message. Use @username to mention someone." onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} autoComplete="off" />
              {nearLimit && <p className="mt-1 text-right text-xs text-muted" aria-live="polite">{body.length}/{CHAT_MAX}</p>}
            </div>
            <Popover.Root>
              <Popover.Trigger asChild><Button type="button" variant="secondary" aria-label="Add emoji"><Smile className="h-4 w-4" aria-hidden /></Button></Popover.Trigger>
              <Popover.Portal>
                <Popover.Content align="end" className="z-50 grid w-60 grid-cols-6 gap-1 rounded-card border border-line bg-card p-2 shadow-lg">
                  {EMOJIS.map((e) => <button key={e} type="button" className="h-9 w-9 rounded text-xl hover:bg-surface" aria-label={`Insert ${e}`} onClick={() => setBody((b) => (b + e).slice(0, CHAT_MAX))}>{e}</button>)}
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            <Button type="submit" loading={sending} disabled={!body.trim()}>Send</Button>
          </>
        )}
      </form>
    </section>
  );
}
