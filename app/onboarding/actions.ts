"use server";

import { createClient } from "@/lib/supabase/server";
import { usernameSchema, onboardingSchema, type OnboardingInput } from "@/lib/validation/profile";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; field?: string };

export async function checkUsername(raw: string): Promise<{ available: boolean; reason?: string }> {
  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) return { available: false, reason: parsed.error.issues[0].message };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { available: false, reason: "Please log in again." };
  const limit = await rateLimit(`username:${user.id}`, "search");
  if (!limit.success) return { available: false, reason: "Checking too fast. Wait a moment." };

  const { data } = await supabase.from("public_profiles").select("id").eq("username", parsed.data).maybeSingle();
  if (data && data.id !== user.id) return { available: false, reason: "That username is taken." };
  return { available: true };
}

export async function requestCity(rawName: string): Promise<ActionResult> {
  const name = z.string().trim().min(2).max(80).safeParse(rawName);
  if (!name.success) return { ok: false, error: "Enter your city name." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again." };
  const limit = await rateLimit(`cityreq:${user.id}`, "contact");
  if (!limit.success) return { ok: false, error: "Too many requests. Try again later." };
  const { error } = await supabase
    .from("city_requests")
    .insert({ user_id: user.id, city_name: name.data, email: user.email ?? null });
  if (error) return { ok: false, error: "Couldn't send your request. Try again." };
  return { ok: true };
}

export async function completeOnboarding(input: OnboardingInput): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: String(parsed.error.issues[0].path[0] ?? "") };
  }
  const v = parsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again." };

  const { data: city } = await supabase.from("cities").select("id").eq("id", v.cityId).eq("is_active", true).maybeSingle();
  if (!city) return { ok: false, error: "That city isn't available yet.", field: "cityId" };

  const { error } = await supabase
    .from("profiles")
    .update({
      city_id: v.cityId,
      full_name: v.about.fullName,
      username: v.about.username,
      phone: v.about.phone || null,
      date_of_birth: v.about.dateOfBirth,
      avatar_url: v.about.avatarUrl ?? null,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That username is taken.", field: "username" };
    return { ok: false, error: "Couldn't save your profile. Try again." };
  }

  if (v.sportProfiles.length > 0) {
    await supabase
      .from("player_sport_profiles")
      .upsert(v.sportProfiles.map((s) => ({ user_id: user.id, sport_id: s.sportId, details: s.details })));
  }
  return { ok: true };
}
