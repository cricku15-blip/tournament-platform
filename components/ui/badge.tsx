import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type BadgeStatus = "Draft" | "Open" | "Live" | "Completed" | "Cancelled";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus;
  variant?: "draft" | "open" | "live" | "completed" | "cancelled" | "neutral";
  pulsing?: boolean;
}

export function Badge({
  status,
  variant,
  pulsing,
  className,
  children,
  ...props
}: BadgeProps) {
  // Derive variant from status if provided
  const resolvedVariant =
    variant ||
    (status
      ? (status.toLowerCase() as
          | "draft"
          | "open"
          | "live"
          | "completed"
          | "cancelled")
      : "neutral");

  const isLive = resolvedVariant === "live" || pulsing;

  const styles = {
    draft: "bg-muted/15 text-muted border border-muted/25",
    open: "bg-primary/15 text-primary border border-primary/25",
    live: "bg-floodlight/20 text-ink border border-floodlight/50 font-bold",
    completed: "bg-ink/10 text-ink border border-ink/20",
    cancelled: "bg-danger/15 text-danger border border-danger/25",
    neutral: "bg-surface text-ink border border-line",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-badge px-3 py-0.5 text-xs font-semibold select-none",
        styles[resolvedVariant],
        className
      )}
      {...props}
    >
      {isLive && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-floodlight opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-floodlight" />
        </span>
      )}
      {children || status}
    </span>
  );
}

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  onRemove?: () => void;
  selected?: boolean;
}

export function Chip({
  className,
  onRemove,
  selected = false,
  children,
  ...props
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-sm font-medium transition-colors border select-none",
        selected
          ? "bg-primary/15 text-primary border-primary/30"
          : "bg-card text-ink border-line hover:bg-surface",
        className
      )}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove"
          className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-muted/20 active:bg-muted/30 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
