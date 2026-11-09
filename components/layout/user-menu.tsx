"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { User, Settings, CreditCard, Shield, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

export interface UserMenuProps {
  user: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
    isAdmin?: boolean;
  };
  className?: string;
}

export function UserMenu({ user, className }: UserMenuProps) {
  const router = useRouter();
  const displayName = user.fullName || user.email?.split("@")[0] || "User";

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="User account menu"
          className={cn(
            "rounded-full p-0.5 transition-colors hover:ring-2 hover:ring-line focus-visible:outline-2 focus-visible:outline-primary select-none",
            className
          )}
        >
          <Avatar
            name={displayName}
            src={user.avatarUrl}
            size="sm"
            className="cursor-pointer"
          />
        </button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          className="z-50 min-w-[200px] rounded-card border border-line bg-card p-1.5 text-ink shadow-lg animate-in fade-in-80"
        >
          <div className="border-b border-line px-3 py-2">
            <p className="text-sm font-semibold truncate text-ink">
              {displayName}
            </p>
            {user.email && (
              <p className="text-xs text-muted truncate">{user.email}</p>
            )}
          </div>

          <div className="py-1">
            <DropdownMenuPrimitive.Item asChild>
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-sm px-2.5 py-2 text-xs font-medium cursor-pointer outline-none transition-colors hover:bg-surface"
              >
                <User className="h-4 w-4 text-muted" />
                <span>Profile</span>
              </Link>
            </DropdownMenuPrimitive.Item>

            <DropdownMenuPrimitive.Item asChild>
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-sm px-2.5 py-2 text-xs font-medium cursor-pointer outline-none transition-colors hover:bg-surface"
              >
                <Settings className="h-4 w-4 text-muted" />
                <span>Settings</span>
              </Link>
            </DropdownMenuPrimitive.Item>

            <DropdownMenuPrimitive.Item asChild>
              <Link
                href="/subscription"
                className="flex items-center gap-2 rounded-sm px-2.5 py-2 text-xs font-medium cursor-pointer outline-none transition-colors hover:bg-surface"
              >
                <CreditCard className="h-4 w-4 text-muted" />
                <span>Subscription</span>
              </Link>
            </DropdownMenuPrimitive.Item>

            {user.isAdmin && (
              <DropdownMenuPrimitive.Item asChild>
                <Link
                  href="/admin"
                  className="flex items-center gap-2 rounded-sm px-2.5 py-2 text-xs font-medium text-danger cursor-pointer outline-none transition-colors hover:bg-danger/10"
                >
                  <Shield className="h-4 w-4 text-danger" />
                  <span>Admin Panel</span>
                </Link>
              </DropdownMenuPrimitive.Item>
            )}
          </div>

          <div className="border-t border-line pt-1">
            <DropdownMenuPrimitive.Item
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-sm px-2.5 py-2 text-xs font-medium text-danger cursor-pointer outline-none transition-colors hover:bg-danger/10"
            >
              <LogOut className="h-4 w-4 text-danger" />
              <span>Log out</span>
            </DropdownMenuPrimitive.Item>
          </div>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
