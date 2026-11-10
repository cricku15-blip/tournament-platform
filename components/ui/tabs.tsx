"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <div className="relative w-full border-b border-line overflow-hidden">
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap px-1",
        className
      )}
      {...props}
    />
  </div>
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    badge?: string | number;
  }
>(({ className, children, badge, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center gap-2 py-3 px-1 text-sm sm:text-base font-semibold text-muted transition-colors relative border-b-[3px] border-transparent outline-none select-none",
      "hover:text-ink focus-visible:outline-2 focus-visible:outline-primary",
      "data-[state=active]:border-primary data-[state=active]:text-primary",
      className
    )}
    {...props}
  >
    {children}
    {badge !== undefined && (
      <span className="rounded-badge bg-surface px-2 py-0.5 text-xs font-bold text-muted data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
        {badge}
      </span>
    )}
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-4 outline-none focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export interface NavTabItem {
  label: string;
  href: string;
  isActive: boolean;
  badge?: string | number;
}

export function RouteTabs({
  items,
  className,
}: {
  items: NavTabItem[];
  className?: string;
}) {
  return (
    <div className={cn("relative w-full border-b border-line overflow-hidden", className)}>
      <nav className="flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap px-1">
        {items.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-2 py-3 px-1 text-sm sm:text-base font-semibold transition-colors relative border-b-[3px] outline-none select-none",
              tab.isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-ink",
              "focus-visible:outline-2 focus-visible:outline-primary"
            )}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "rounded-badge px-2 py-0.5 text-xs font-bold",
                  tab.isActive
                    ? "bg-primary/10 text-primary"
                    : "bg-surface text-muted"
                )}
              >
                {tab.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
