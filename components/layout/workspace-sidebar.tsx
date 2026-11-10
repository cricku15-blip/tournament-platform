"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Trophy,
  BarChart3,
  CreditCard,
  Users,
  Gavel,
  Calendar,
  PlusCircle,
  Layers,
  MapPin,
  Settings,
  History,
  AlertTriangle,
  Receipt,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/session";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function getRoleNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case "player":
      return [
        { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { label: "My applications", href: "/player/applications", icon: FileText },
        { label: "My tournaments", href: "/player/tournaments", icon: Trophy },
        { label: "My stats", href: "/player/stats", icon: BarChart3 },
        { label: "Subscription", href: "/subscription", icon: CreditCard },
      ];
    case "manager":
      return [
        { label: "My teams", href: "/manager/teams", icon: Users },
        { label: "Auction room", href: "/manager/teams", icon: Gavel },
        { label: "Fixtures", href: "/manager/teams", icon: Calendar },
      ];
    case "organizer":
      return [
        { label: "Overview", href: "/organizer", icon: LayoutDashboard },
        { label: "Tournaments", href: "/organizer/tournaments", icon: Trophy },
        { label: "Create tournament", href: "/organizer/tournaments/new", icon: PlusCircle },
      ];
    case "admin":
      return [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { label: "Users", href: "/admin/users", icon: Users },
        { label: "Tournaments", href: "/admin/tournaments", icon: Trophy },
        { label: "Payments", href: "/admin/payments", icon: Receipt },
        { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
        { label: "Refunds", href: "/admin/refunds", icon: FileCheck },
        { label: "Reports", href: "/admin/reports", icon: AlertTriangle },
        { label: "Cities", href: "/admin/cities", icon: MapPin },
        { label: "Sports", href: "/admin/sports", icon: Layers },
        { label: "Pricing", href: "/admin/pricing", icon: CreditCard },
        { label: "Audit log", href: "/admin/audit-log", icon: History },
        { label: "Settings", href: "/admin/settings", icon: Settings },
      ];
  }
}

export function WorkspaceSidebar({
  role,
  className,
}: {
  role: UserRole;
  className?: string;
}) {
  const pathname = usePathname();
  const items = getRoleNavItems(role);
  const isAdmin = role === "admin";

  return (
    <aside
      className={cn(
        "hidden lg:flex w-60 shrink-0 flex-col justify-between border-r p-4 select-none",
        isAdmin
          ? "bg-ink text-surface border-line/20"
          : "bg-card text-ink border-line",
        className
      )}
    >
      <div className="space-y-4">
        {isAdmin && (
          <div className="flex items-center justify-between border-b border-line/20 pb-3 px-2">
            <span className="font-display text-lg font-bold tracking-tight">
              Platform Admin
            </span>
            <span className="rounded-badge bg-danger px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
              Admin
            </span>
          </div>
        )}

        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" &&
                item.href !== "/dashboard" &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-input px-3 py-2.5 text-sm font-semibold transition-colors",
                  isActive
                    ? isAdmin
                      ? "bg-surface/15 text-primary"
                      : "bg-primary/10 text-primary font-bold"
                    : isAdmin
                    ? "text-surface/70 hover:bg-surface/10 hover:text-surface"
                    : "text-muted hover:bg-surface hover:text-ink"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-primary" : "text-muted"
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
