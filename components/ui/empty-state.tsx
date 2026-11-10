import * as React from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-card border border-dashed border-line bg-card/60",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-muted mb-4 border border-line">
        {icon || <FolderOpen className="h-7 w-7" strokeWidth={1.5} />}
      </div>
      {title && (
        <h4 className="font-display text-lg font-bold text-ink mb-1">
          {title}
        </h4>
      )}
      <p className="max-w-md text-sm text-muted mb-6 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
