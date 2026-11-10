"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

export function NotificationsBell({
  unreadCount = 0,
  notifications = [],
  className,
}: {
  unreadCount?: number;
  notifications?: NotificationItem[];
  className?: string;
}) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="View notifications"
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-muted transition-colors hover:text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-primary select-none",
            className
          )}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-floodlight font-display text-[10px] font-bold text-ink">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          className="z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-card border border-line bg-card p-0 text-ink shadow-lg animate-in fade-in-80"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-display text-base font-bold text-ink">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="rounded-badge bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-line">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">
                No new notifications.
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "p-3.5 text-xs transition-colors hover:bg-surface/60",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <p className="font-semibold text-ink">{n.title}</p>
                  <p className="text-muted mt-0.5 line-clamp-2">{n.body}</p>
                  <span className="text-[10px] text-muted/70 mt-1 block">
                    {n.createdAt}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-line p-2 text-center">
            <Link
              href="/notifications"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
