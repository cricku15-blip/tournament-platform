import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  icon?: React.ReactNode;
}

export function StatTile({
  label,
  value,
  subValue,
  trend,
  trendLabel,
  icon,
  className,
  ...props
}: StatTileProps) {
  return (
    <Card
      className={cn("flex flex-col justify-between p-5 select-none", className)}
      {...props}
    >
      <div className="flex items-center justify-between text-muted mb-2">
        <span className="text-sm font-semibold uppercase tracking-wider">
          {label}
        </span>
        {icon && <span className="text-muted/80">{icon}</span>}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-ink tabular-nums leading-none">
          {value}
        </span>
        {subValue && (
          <span className="text-sm font-medium text-muted">{subValue}</span>
        )}
      </div>

      {trendLabel && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
          <span
            className={cn(
              trend === "up" && "text-primary",
              trend === "down" && "text-danger",
              trend === "neutral" && "text-muted"
            )}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "•"} {trendLabel}
          </span>
        </div>
      )}
    </Card>
  );
}
