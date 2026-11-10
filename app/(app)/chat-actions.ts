"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rpc } from "@/lib/rpc";
import { extractMentions } from "@/lib/chat";

type Result = { ok: true } | { ok: false; error: string; code?: string };
const uuid = z.string().uuid();

/** Posts through `post_chat_message` (the database enforces membership, mutes and slow mode), then notifies @mentioned members. */
export async function sendChat(tournamentId: string, body: string, replyTo?: string | null): Promise<Result> {
  const text = z.string().trim().min(1, "Write a message first.").max(500, "Messages can be up to 500 characters.").safeParse(body);
  if (!uuid.safeParse(tournamentId).success || !text.success) return { ok: false, error: text.success ? "Bad request." : text.error.issues[0].message };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in to chat.", code: "not_authenticated" };

  const { data: flags } = await supabase.from("site_settings").select("value").eq("key", "flags").maybeSingle();
  if ((flags?.value as { chat?: boolean } | null)?.chat === false) return { ok: false, error: "Chat is switched off right now.", code: "chat_off" };

  const r = await rpc("post_chat_message", { p_tid: tournamentId, p_body: text.data, p_reply_to: replyTo && uuid.safeParse(replyTo).success ? replyTo : undefined }, supabase);
  if (r.error) return { ok: false, error: r.error.message, code: r.error.code };

  const names = extractMentions(text.data);
  if (names.length > 0) {
    try {
      const admin = createAdminClient();
      const [{ data: t }, { data: profiles }] = await Promise.all([
        admin.from("tournaments").select("name, slug, organizer_id").eq("id", tournamentId).maybeSingle(),
        admin.from("profiles").select("id, username").in("username", names).limit(5),
      ]);
      const ids = (profiles ?? []).map((p) => p.id).filter((id) => id !== user.id);
      if (t && ids.length > 0) {
        const [teams, apps, squad] = await Promise.all([
          admin.from("teams").select("manager_id").eq("tournament_id", tournamentId).eq("status", "approved").in("manager_id", ids),
          admin.from("player_applications").select("user_id").eq("tournament_id", tournamentId).eq("status", "approved").in("user_id", ids),
          admin.from("squad_members").select("user_id").eq("tournament_id", tournamentId).in("user_id", ids),
        ]);
        const members = new Set<string>([...(teams.data ?? []).map((x) => x.manager_id as string), ...(apps.data ?? []).map((x) => x.user_id), ...(squad.data ?? []).map((x) => x.user_id)]);
        if (ids.includes(t.organizer_id)) members.add(t.organizer_id);
        const rows = ids.filter((id) => members.has(id)).map((id) => ({ user_id: id, type: "chat_mention", title: "You were mentioned", body: text.data.slice(0, 120), link: `/tournaments/${t.slug}/chat` }));
        if (rows.length) await admin.from("notifications").insert(rows);
      }
    } catch {
      // A failed mention notification must never fail the message itself.
    }
  }
  return { ok: true };
}

export async function deleteChat(messageId: string): Promise<Result> {
  if (!uuid.safeParse(messageId).success) return { ok: false, error: "Bad request." };
  const supabase = await createClient();
  const r = await rpc("delete_chat_message", { p_message_id: messageId }, supabase);
  return r.error ? { ok: false, error: r.error.message } : { ok: true };
}

export async function muteChatUser(tournamentId: string, userId: string, minutes: number): Promise<Result> {
  const m = z.number().int().min(1).max(60 * 24 * 90).safeParse(minutes);
  if (!uuid.safeParse(tournamentId).success || !uuid.safeParse(userId).success || !m.success) return { ok: false, error: "Bad request." };
  const supabase = await createClient();
  const r = await rpc("mute_chat_user", { p_tid: tournamentId, p_user: userId, p_minutes: m.data }, supabase);
  return r.error ? { ok: false, error: r.error.message } : { ok: true };
}

export async function reportChat(messageId: string, reason: string): Promise<Result> {
  const why = z.string().trim().min(3, "Tell us briefly what's wrong.").max(300).safeParse(reason);
  if (!uuid.safeParse(messageId).success || !why.success) return { ok: false, error: why.success ? "Bad request." : why.error.issues[0].message };
  const supabase = await createClient();
  const r = await rpc("report_content", { p_target_type: "chat_message", p_target_id: messageId, p_reason: why.data }, supabase);
  return r.error ? { ok: false, error: r.error.message } : { ok: true };
}
