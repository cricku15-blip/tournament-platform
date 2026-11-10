"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NOTIFICATION_CATEGORIES, normalisePrefs, type NotificationPrefs } from "@/lib/notifications/categories";
import { rateLimit } from "@/lib/rate-limit";

export async function saveNotificationPrefs(raw: NotificationPrefs): Promise<{ ok: boolean }> {
  const shape = z.record(z.string(), z.object({ inapp: z.boolean(), email: z.boolean() }));
  const parsed = shape.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const allowed = new Set<string>(NOTIFICATION_CATEGORIES.map((c) => c.key));
  const clean = normalisePrefs(Object.fromEntries(Object.entries(parsed.data).filter(([k]) => allowed.has(k))));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase
    .from("notification_settings")
    .upsert({ user_id: user.id, prefs: clean, updated_at: new Date().toISOString() });
  return { ok: !error };
}

export async function logoutEverywhere(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

/** Returns the user's own data as JSON text. RLS limits every table to their rows. */
export async function exportMyData(): Promise<{ ok: true; json: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again." };
  const limit = await rateLimit(`export:${user.id}`, "contact");
  if (!limit.success) return { ok: false, error: "You can export your data a few times per hour. Try later." };

  const [profile, sports, apps, teams, squads, notifs, settings, subs] = await Promise.all([
    supabase.from("profiles").select("id, full_name, username, bio, phone, date_of_birth, city_id, show_age, show_city, show_stats, created_at").eq("id", user.id).maybeSingle(),
    supabase.from("player_sport_profiles").select("sport_id, details").eq("user_id", user.id),
    supabase.from("player_applications").select("tournament_id, status, created_at").eq("user_id", user.id).limit(1000),
    supabase.from("teams").select("id, name, tournament_id, status").eq("manager_id", user.id).limit(1000),
    supabase.from("squad_members").select("team_id, tournament_id, jersey_no, created_at").eq("user_id", user.id).limit(1000),
    supabase.from("notifications").select("type, title, body, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1000),
    supabase.from("notification_settings").select("prefs").eq("user_id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("status, current_period_end, created_at").eq("user_id", user.id),
  ]);

  return {
    ok: true,
    json: JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        email: user.email,
        profile: profile.data,
        sport_profiles: sports.data,
        applications: apps.data,
        teams_managed: teams.data,
        squad_memberships: squads.data,
        notifications: notifs.data,
        notification_settings: settings.data?.prefs ?? {},
        subscriptions: subs.data,
      },
      null,
      2
    ),
  };
}

export async function deleteMyAccount(confirmEmail: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again." };
  if (!user.email || confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false, error: "Type your email address exactly to confirm." };
  }

  const { count } = await supabase
    .from("tournaments")
    .select("id", { count: "exact", head: true })
    .eq("organizer_id", user.id)
    .not("status", "in", "(completed,cancelled)");
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: "You own a tournament that isn't finished. Complete or cancel it before deleting your account.",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return {
      ok: false,
      error: "We couldn't delete your account automatically (you may have past tournaments on record). Contact support and we'll do it for you.",
    };
  }
  await supabase.auth.signOut();
  return { ok: true };
}
