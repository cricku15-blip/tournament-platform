"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { getRoleNavItems } from "./workspace-sidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/session";

export function BottomBar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const items = getRoleNavItems(role);

  const mainItems = items.slice(0, 4);
  const extraItems = items.slice(4);

  return (
    <div className="fixed bottom-0 left-0 z-40 flex h-16 w-full items-center justify-around border-t border-line bg-card/95 px-2 backdrop-blur-xs lg:hidden select-none">
      {mainItems.map((item) => {
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
              "flex flex-col items-center justify-center gap-1 flex-1 py-1 text-center transition-colors",
              isActive ? "text-primary font-bold" : "text-muted hover:text-ink"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-semibold truncate max-w-[64px]">
              {item.label}
            </span>
          </Link>
        );
      })}

      {extraItems.length > 0 && (
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-center text-muted hover:text-ink"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-semibold">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle className="text-left font-display text-xl font-bold">
                More Actions
              </SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-1">
              {extraItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-input p-3 text-sm font-semibold transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-ink hover:bg-surface"
                    )}
                  >
                    <Icon className="h-5 w-5 text-muted" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
