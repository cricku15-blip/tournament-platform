import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSessionUser } from "@/lib/session";
import { ProfileForm } from "@/components/domain/profile/profile-form";
import type { SportOption } from "@/components/domain/onboarding/wizard";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getSessionUser();
  const profile = await getProfile();
  if (!user || !profile) redirect("/login");

  const supabase = await createClient();
  const [cities, sports, psp] = await Promise.all([
    supabase.from("cities").select("id, name, state").eq("is_active", true).order("sort_order"),
    supabase.from("sports").select("id, slug, name, config").eq("is_active", true).order("name"),
    supabase.from("player_sport_profiles").select("sport_id, details").eq("user_id", user.id),
  ]);

  const sportDetails: Record<string, Record<string, string>> = {};
  for (const r of psp.data ?? []) {
    sportDetails[r.sport_id] = Object.fromEntries(
      Object.entries((r.details ?? {}) as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "")])
    );
  }

  return (
    <ProfileForm
      userId={user.id}
      initial={{
        fullName: profile.full_name ?? "",
        username: profile.username ?? "",
        bio: profile.bio ?? "",
        phone: profile.phone ?? "",
        cityId: profile.city_id ?? "",
        avatarUrl: profile.avatar_url,
        showAge: profile.show_age,
        showCity: profile.show_city,
        showStats: profile.show_stats,
        sports: sportDetails,
      }}
      cities={(cities.data ?? []).map((c) => ({ value: c.id, label: c.state ? `${c.name}, ${c.state}` : c.name }))}
      sports={(sports.data ?? []) as unknown as SportOption[]}
    />
  );
}
