import type { Metadata } from "next";
import * as React from "react";
import { getActiveRole, getProfile, getSessionUser, getUserRoles } from "@/lib/session";
import { greeting } from "@/lib/dashboard/greeting";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ApplicationCounts,
  ManagerTeams,
  NewUserEmptyState,
  OpenInYourCity,
  OrganizerOverview,
  SubscriptionCard,
  UpcomingMatchesPlaceholder,
} from "@/components/domain/dashboard/sections";

export const metadata: Metadata = { title: "Dashboard" };

const fallback = <Skeleton className="h-40 w-full rounded-card" />;

export default async function DashboardPage() {
  const [user, profile, roles, role] = await Promise.all([
    getSessionUser(),
    getProfile(),
    getUserRoles(),
    getActiveRole(),
  ]);
  if (!user) return null;
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const isNew = !roles.organizer && !roles.manager;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <h1 className="font-display text-3xl font-bold text-ink">
        {greeting()}, {firstName}
      </h1>

      {role === "organizer" ? (
        <React.Suspense fallback={fallback}>
          <OrganizerOverview userId={user.id} />
        </React.Suspense>
      ) : role === "manager" ? (
        <React.Suspense fallback={fallback}>
          <ManagerTeams userId={user.id} />
        </React.Suspense>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <React.Suspense fallback={fallback}>
            <SubscriptionCard userId={user.id} />
          </React.Suspense>
          <React.Suspense fallback={fallback}>
            <ApplicationCounts userId={user.id} />
          </React.Suspense>
          <div className="lg:col-span-2">
            <React.Suspense fallback={fallback}>
              <OpenInYourCity cityId={profile?.city_id ?? null} />
            </React.Suspense>
          </div>
          <UpcomingMatchesPlaceholder />
        </div>
      )}

      {isNew && <NewUserEmptyState />}
    </div>
  );
}
