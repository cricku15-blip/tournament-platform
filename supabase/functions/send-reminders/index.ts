// supabase/functions/send-reminders/index.ts   (service-role only; run every 15 minutes by a schedule)
// Match reminders (24 hours and 2 hours before) and "auction starts in 15 minutes".
// Respects notification_settings.prefs.tournament / .auction ({inapp, email}); billing and security are never touched here.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient, isServiceCall, json } from "../_shared/clients.ts";

type Prefs = Record<string, { inapp?: boolean; email?: boolean }>;

serve(async (req) => {
  if (!isServiceCall(req)) return json({ error: "forbidden" }, 403);
  try {
    const sb = adminClient();
    const now = Date.now();
    const iso = (ms: number) => new Date(ms).toISOString();
    const site = Deno.env.get("SITE_URL") ?? "";
    let notified = 0;
    let emailed = 0;

    async function deliver(userIds: string[], category: "tournament" | "auction", type: string, title: string, body: string, link: string) {
      const ids = [...new Set(userIds)].filter(Boolean);
      if (ids.length === 0) return;
      const { data: settings } = await sb.from("notification_settings").select("user_id, prefs").in("user_id", ids);
      const prefs = new Map((settings ?? []).map((s) => [s.user_id as string, (s.prefs ?? {}) as Prefs]));
      const want = (id: string, ch: "inapp" | "email") => prefs.get(id)?.[category]?.[ch] !== false; // default on
      const inapp = ids.filter((id) => want(id, "inapp"));
      if (inapp.length) {
        await sb.from("notifications").insert(inapp.map((user_id) => ({ user_id, type, title, body, link })));
        notified += inapp.length;
      }
      for (const id of ids.filter((x) => want(x, "email")).slice(0, 100)) {
        const { data } = await sb.auth.admin.getUserById(id);
        const to = data.user?.email;
        if (!to) continue;
        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
          method: "POST",
          headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
          body: JSON.stringify({ to, subject: title, title, body, cta_label: "Open", cta_url: `${site}${link}` }),
        });
        if (res.ok) emailed++;
      }
    }

    async function matchReminders(column: "reminded_24h" | "reminded_2h", withinMs: number, label: string) {
      const { data: matches } = await sb.from("matches")
        .select("id, tournament_id, team_a_id, team_b_id, scheduled_at, venue")
        .eq(column, false).eq("fixture_published", true).is("result_published_at", null).in("status", ["scheduled"])
        .gt("scheduled_at", iso(now)).lte("scheduled_at", iso(now + withinMs)).limit(200);
      for (const m of matches ?? []) {
        // Mark first: a crash after this means a missed reminder, never a duplicate one.
        const { data: claimed } = await sb.from("matches").update({ [column]: true }).eq("id", m.id).eq(column, false).select("id");
        if (!claimed || claimed.length === 0) continue;
        const teamIds = [m.team_a_id, m.team_b_id].filter(Boolean) as string[];
        if (teamIds.length < 2) continue;
        const [{ data: teams }, { data: squad }, { data: t }] = await Promise.all([
          sb.from("teams").select("id, name, manager_id").in("id", teamIds),
          sb.from("squad_members").select("user_id").in("team_id", teamIds),
          sb.from("tournaments").select("name, slug").eq("id", m.tournament_id).single(),
        ]);
        const names = (teams ?? []).map((x) => x.name).join(" vs ");
        const users = [...(teams ?? []).map((x) => x.manager_id as string), ...(squad ?? []).map((x) => x.user_id as string)];
        const when = new Date(m.scheduled_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
        await deliver(users, "tournament", "match_reminder", `Match ${label}: ${names}`, `${t?.name ?? "Tournament"} · ${when}${m.venue ? ` · ${m.venue}` : ""}`, `/tournaments/${t?.slug}/matches/${m.id}`);
      }
    }

    await matchReminders("reminded_24h", 24 * 3600_000, "tomorrow");
    await matchReminders("reminded_2h", 2 * 3600_000, "in 2 hours");

    const { data: auctions } = await sb.from("auction_settings").select("tournament_id, scheduled_at").eq("reminded_15m", false).eq("status", "scheduled")
      .gt("scheduled_at", iso(now)).lte("scheduled_at", iso(now + 15 * 60_000)).limit(50);
    for (const a of auctions ?? []) {
      const { data: claimed } = await sb.from("auction_settings").update({ reminded_15m: true }).eq("tournament_id", a.tournament_id).eq("reminded_15m", false).select("tournament_id");
      if (!claimed || claimed.length === 0) continue;
      const [{ data: teams }, { data: apps }, { data: t }] = await Promise.all([
        sb.from("teams").select("manager_id").eq("tournament_id", a.tournament_id).eq("status", "approved"),
        sb.from("player_applications").select("user_id").eq("tournament_id", a.tournament_id).eq("status", "approved"),
        sb.from("tournaments").select("name, slug, organizer_id").eq("id", a.tournament_id).single(),
      ]);
      const users = [...(teams ?? []).map((x) => x.manager_id as string), ...(apps ?? []).map((x) => x.user_id as string), t?.organizer_id as string];
      await deliver(users, "auction", "auction_soon", "Auction starts in 15 minutes", t?.name ?? "Your auction", `/tournaments/${t?.slug}/auction/live`);
    }
    return json({ ok: true, notified, emailed });
  } catch (e) {
    console.error("send-reminders", e);
    return json({ error: "server_error" }, 500);
  }
});
