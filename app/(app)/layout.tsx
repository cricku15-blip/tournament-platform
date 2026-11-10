import * as React from "react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";
import { createClient } from "@/lib/supabase/server";
import { getCities } from "@/lib/public/queries";
import { BottomBar } from "@/components/layout/bottom-bar";
import {
  getSessionUser,
  getProfile,
  getUserRoles,
  getActiveRole,
} from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile();
  const roles = await getUserRoles();
  const currentRole = await getActiveRole();

  let cityName: string | null = null;
  if (profile?.city_id) {
    const supabase = await createClient();
    const { data: city } = await supabase.from("cities").select("name").eq("id", profile.city_id).maybeSingle();
    cityName = city?.name ?? null;
  }

  const cities = await getCities().catch(() => undefined);

  const userSummary = {
    id: user.id,
    email: user.email,
    fullName: profile?.full_name,
    avatarUrl: profile?.avatar_url,
    cityId: profile?.city_id,
    cityName,
    isAdmin: Boolean(profile?.is_admin),
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink font-body">
      <AppHeader
        currentRole={currentRole}
        roles={roles}
        user={userSummary}
        cities={cities}
      />
      <div className="flex flex-1">
        <WorkspaceSidebar role={currentRole} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          {children}
        </main>
      </div>
      <BottomBar role={currentRole} />
    </div>
  );
}
