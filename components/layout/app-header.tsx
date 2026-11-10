"use client";

import * as React from "react";
import Link from "next/link";
import { CitySelector } from "./city-selector";
import { RoleSwitcher } from "./role-switcher";
import { GlobalSearch } from "./global-search";
import { NotificationsBell } from "./notifications-bell";
import { UserMenu } from "./user-menu";
import type { UserRole, UserRoles } from "@/lib/session";

export interface AppHeaderProps {
  currentRole: UserRole;
  roles: UserRoles;
  user: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
    cityId?: string | null;
    cityName?: string | null;
    isAdmin?: boolean;
  };
}

export function AppHeader({ currentRole, roles, user }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-[72px] w-full items-center justify-between border-b border-line bg-card/95 px-4 sm:px-6 backdrop-blur-xs select-none">
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="font-display text-2xl font-extrabold tracking-tight text-ink hover:text-primary transition-colors"
        >
          GROUND<span className="text-primary">WAR</span>
        </Link>

        {/* City Selector */}
        <div className="hidden md:block">
          <CitySelector
            isLoggedIn={true}
            currentCityId={user.cityId}
            currentCityName={user.cityName}
          />
        </div>

        {/* Role Switcher */}
        <RoleSwitcher currentRole={currentRole} roles={roles} />
      </div>

      <div className="flex items-center gap-3">
        {/* Global Search */}
        <GlobalSearch />

        {/* Notifications Bell */}
        <NotificationsBell />

        {/* User Avatar Menu */}
        <UserMenu user={user} />
      </div>
    </header>
  );
}
