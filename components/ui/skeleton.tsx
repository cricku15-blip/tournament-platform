import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-md bg-muted/20 animate-pulse motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}
