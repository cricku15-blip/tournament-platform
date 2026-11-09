import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, disabled, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        className={cn(
          "flex h-11 w-full rounded-input border border-line bg-card px-3.5 py-2 text-base text-ink placeholder:text-muted/70 transition-colors",
          "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-45",
          error && "border-danger focus-visible:outline-danger",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
