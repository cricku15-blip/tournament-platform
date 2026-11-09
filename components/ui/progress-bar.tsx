import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showPercent?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercent = false,
  className,
  ...props
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className={cn("w-full flex flex-col gap-1.5", className)} {...props}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between text-xs font-semibold text-ink">
          {label && <span>{label}</span>}
          {showPercent && <span className="tabular-nums">{percent}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-2 w-full overflow-hidden rounded-full bg-surface border border-line"
      >
        <div
          className="h-full bg-primary transition-all duration-300 ease-in-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
