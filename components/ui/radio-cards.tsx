"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface RadioCardItem {
  value: string;
  title: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

export interface RadioCardsProps {
  items: RadioCardItem[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  name?: string;
}

export function RadioCards({
  items,
  value,
  onChange,
  className,
  name,
}: RadioCardsProps) {
  return (
    <div
      role="radiogroup"
      className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", className)}
    >
      {items.map((item) => {
        const isSelected = item.value === value;
        return (
          <label
            key={item.value}
            className={cn(
              "relative flex flex-col justify-between rounded-card border p-5 cursor-pointer transition-all bg-card select-none",
              "focus-within:outline-2 focus-within:outline-primary focus-within:outline-offset-2",
              isSelected
                ? "border-2 border-primary bg-primary/5 shadow-xs"
                : "border-line hover:border-muted/50",
              item.disabled && "cursor-not-allowed opacity-45 pointer-events-none"
            )}
          >
            <input
              type="radio"
              name={name}
              value={item.value}
              checked={isSelected}
              disabled={item.disabled}
              onChange={() => onChange?.(item.value)}
              className="sr-only"
            />
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isSelected ? "border-primary" : "border-line"
                  )}
                >
                  {isSelected && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </span>
                <span className="font-semibold text-ink text-base">
                  {item.title}
                </span>
              </div>
              {item.badge && (
                <span className="rounded-badge bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {item.badge}
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-muted ml-6 leading-relaxed">
                {item.description}
              </p>
            )}
          </label>
        );
      })}
    </div>
  );
}
