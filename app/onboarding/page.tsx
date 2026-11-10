import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSessionUser } from "@/lib/session";
import { OnboardingWizard, type SportOption } from "@/components/domain/onboarding/wizard";
import { safeNext } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/onboarding");
  const profile = await getProfile();
  const { next } = await searchParams;
  if (profile?.onboarded_at) redirect(safeNext(next));

  const supabase = await createClient();
  const [cities, sports] = await Promise.all([
    supabase.from("cities").select("id, name, slug, state").eq("is_active", true).order("sort_order"),
    supabase.from("sports").select("id, slug, name, config").eq("is_active", true).order("name"),
  ]);

  return (
    <OnboardingWizard
      userId={user.id}
      next={safeNext(next)}
      defaultName={profile?.full_name ?? ""}
      defaultAvatar={profile?.avatar_url ?? null}
      cities={cities.data ?? []}
      sports={(sports.data ?? []) as unknown as SportOption[]}
    />
  );
}
