"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Shield, Users, Briefcase, User } from "lucide-react";
import { setCookie } from "@/lib/cookies";
import { cn } from "@/lib/utils";
import type { UserRole, UserRoles } from "@/lib/session";

export interface RoleSwitcherProps {
  currentRole: UserRole;
  roles: UserRoles;
  className?: string;
}

const ROLE_INFO: Record<
  UserRole,
  { label: string; icon: React.ComponentType<{ className?: string }>; href: string }
> = {
  player: { label: "Player", icon: User, href: "/dashboard" },
  manager: { label: "Manager", icon: Users, href: "/manager/teams" },
  organizer: { label: "Organizer", icon: Briefcase, href: "/organizer" },
  admin: { label: "Admin", icon: Shield, href: "/admin" },
};

export function RoleSwitcher({
  currentRole,
  roles,
  className,
}: RoleSwitcherProps) {
  const router = useRouter();

  const availableRoles: UserRole[] = React.useMemo(() => {
    const list: UserRole[] = ["player"];
    if (roles.manager) list.push("manager");
    if (roles.organizer) list.push("organizer");
    if (roles.admin) list.push("admin");
    return list;
  }, [roles]);

  const handleSwitch = (role: UserRole) => {
    setCookie("active_role", role);
    router.push(ROLE_INFO[role].href);
    router.refresh();
  };

  const CurrentIcon = ROLE_INFO[currentRole]?.icon || User;

  // If user only has 1 role (player), show pill without dropdown
  if (availableRoles.length <= 1) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-muted bg-surface rounded-pill select-none",
          className
        )}
      >
        <CurrentIcon className="h-3.5 w-3.5 text-muted" />
        <span>Player</span>
      </div>
    );
  }

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-pill border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface select-none",
            "focus-visible:outline-2 focus-visible:outline-primary",
            className
          )}
          aria-label="Switch active role"
        >
          <CurrentIcon className="h-3.5 w-3.5 text-primary" />
          <span>Viewing as: {ROLE_INFO[currentRole]?.label || "Player"}</span>
          <ChevronDown className="h-3 w-3 text-muted opacity-60" />
        </button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          className="z-50 min-w-[180px] rounded-card border border-line bg-card p-1 text-ink shadow-md animate-in fade-in-80"
        >
          <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted">
            Switch Workspace
          </div>
          {availableRoles.map((role) => {
            const info = ROLE_INFO[role];
            const Icon = info.icon;
            const isSelected = role === currentRole;

            return (
              <DropdownMenuPrimitive.Item
                key={role}
                onClick={() => handleSwitch(role)}
                className={cn(
                  "flex items-center justify-between rounded-sm px-2.5 py-2 text-xs font-medium cursor-pointer outline-none transition-colors hover:bg-surface",
                  isSelected && "font-bold text-primary"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted" />
                  <span>{info.label}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuPrimitive.Item>
            );
          })}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
