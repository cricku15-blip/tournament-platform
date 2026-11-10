"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LiveStripProps {
  title: string;
  href: string;
  label?: string;
  dismissible?: boolean;
  className?: string;
}

export function LiveStrip({
  title,
  href,
  label = "Watch live",
  dismissible = true,
  className,
}: LiveStripProps) {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Live event banner"
      className={cn(
        "relative flex h-10 w-full items-center justify-between border-b border-floodlight/40 bg-floodlight/15 px-4 text-xs sm:text-sm font-medium text-ink transition-all select-none",
        className
      )}
    >
      <div className="flex items-center gap-2.5 overflow-hidden">
        {/* Pulsing Floodlight Dot */}
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-floodlight opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-floodlight" />
        </span>

        <span className="font-semibold shrink-0 text-ink">Live now:</span>
        <span className="truncate">{title}</span>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-4">
        <Link
          href={href}
          className="inline-flex items-center gap-1 font-bold text-ink hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span>{label}</span>
          <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
        </Link>

        {dismissible && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="rounded-sm p-1 text-ink/70 hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
