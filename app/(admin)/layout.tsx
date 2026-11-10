import * as React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import {
  getSessionUser,
  getProfile,
} from "@/lib/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/admin");
  }

  const profile = await getProfile();
  if (!profile?.is_admin) {
    notFound();
  }

  const userSummary = {
    id: user.id,
    email: user.email,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    isAdmin: true,
  };

  return (
    <div className="flex min-h-screen bg-surface text-ink font-body">
      <WorkspaceSidebar role="admin" />
      <div className="flex flex-1 flex-col">
        {/* Admin Top Header */}
        <header className="flex h-16 w-full items-center justify-between border-b border-line bg-card px-6 select-none">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="font-display text-xl font-bold tracking-tight text-ink"
            >
              Platform Administration
            </Link>
            <span className="rounded-badge bg-danger/15 text-danger border border-danger/30 px-2 py-0.5 text-xs font-bold">
              Restricted
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Back to App
            </Link>
            <UserMenu user={userSummary} />
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
