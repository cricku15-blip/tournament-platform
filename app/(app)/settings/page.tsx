import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSessionUser } from "@/lib/session";
import { SettingsPanels } from "@/components/domain/settings/settings-panels";
import { normalisePrefs } from "@/lib/notifications/categories";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getSessionUser();
  const profile = await getProfile();
  if (!user) redirect("/login");

  const themeCookie = (await cookies()).get("theme")?.value;
  const initialTheme = themeCookie === "light" || themeCookie === "dark" ? themeCookie : "system";
  const supabase = await createClient();
  const [city, settings] = await Promise.all([
    profile?.city_id
      ? supabase.from("cities").select("name").eq("id", profile.city_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("notification_settings").select("prefs").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="mb-6 font-display text-3xl font-bold text-ink">Settings</h1>
      <SettingsPanels
        email={user.email ?? ""}
        hasGoogle={Boolean(user.identities?.some((i) => i.provider === "google"))}
        cityName={city.data?.name ?? null}
        initialPrefs={normalisePrefs(settings.data?.prefs)}
        initialTheme={initialTheme}
      />
    </div>
  );
}
