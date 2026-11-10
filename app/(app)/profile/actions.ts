"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileEditSchema, type ProfileEditInput } from "@/lib/validation/profile";
import { rpc } from "@/lib/rpc";
import { z } from "zod";

export type SaveResult = { ok: true } | { ok: false; error: string; field?: string };

const sportDetailsSchema = z.array(
  z.object({ sportId: z.string().uuid(), details: z.record(z.string(), z.string().max(60)) })
);

export async function saveProfile(input: {
  profile: ProfileEditInput;
  cityId: string;
  avatarUrl: string | null;
  sports: { sportId: string; details: Record<string, string> }[];
}): Promise<SaveResult> {
  const parsed = profileEditSchema.safeParse(input.profile);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, field: String(parsed.error.issues[0].path[0]) };
  }
  const sports = sportDetailsSchema.safeParse(input.sports);
  if (!sports.success) return { ok: false, error: "Some sport details are invalid." };
  const cityId = z.string().uuid().safeParse(input.cityId);
  if (!cityId.success) return { ok: false, error: "Choose your city.", field: "cityId" };
  const avatar = z.string().url().nullable().safeParse(input.avatarUrl);
  if (!avatar.success) return { ok: false, error: "Invalid photo." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again." };

  const p = parsed.data;
  const { data: current } = await supabase.from("profiles").select("city_id").eq("id", user.id).single();
  if (current && current.city_id !== cityId.data) {
    const r = await rpc("change_city", { p_city_id: cityId.data }, supabase);
    if (r.error) return { ok: false, error: r.error.message, field: "cityId" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: p.fullName,
      username: p.username,
      bio: p.bio || null,
      phone: p.phone || null,
      avatar_url: avatar.data,
      show_age: p.showAge,
      show_city: p.showCity,
      show_stats: p.showStats,
    })
    .eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That username is taken.", field: "username" };
    return { ok: false, error: "Couldn't save your changes. Try again." };
  }

  if (sports.data.length > 0) {
    await supabase
      .from("player_sport_profiles")
      .upsert(sports.data.map((s) => ({ user_id: user.id, sport_id: s.sportId, details: s.details })));
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
