"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  error?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    { className, checked = false, onCheckedChange, disabled, error, ...props },
    ref
  ) => {
    return (
      <label
        className={cn(
          "inline-flex items-center cursor-pointer select-none",
          disabled && "cursor-not-allowed opacity-45"
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only"
          {...props}
        />
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-[4px] border border-line bg-card transition-colors",
            "focus-within:outline-2 focus-within:outline-primary focus-within:outline-offset-2",
            checked && "bg-primary border-primary text-primary-ink",
            error && "border-danger",
            className
          )}
        >
          {checked && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
        </span>
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
