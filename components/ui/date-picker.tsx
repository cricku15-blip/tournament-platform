"use client";

import * as React from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: Date | string | null;
  onChange?: (date: string) => void;
  disabled?: boolean;
  error?: boolean;
  id?: string;
  className?: string;
  min?: string;
  max?: string;
}

export function DatePicker({
  value,
  onChange,
  disabled = false,
  error = false,
  id,
  className,
  min,
  max,
}: DatePickerProps) {
  const dateValue = value
    ? typeof value === "string"
      ? value.split("T")[0]
      : format(value, "yyyy-MM-dd")
    : "";

  return (
    <div className={cn("relative flex items-center", className)}>
      <input
        type="date"
        id={id}
        value={dateValue}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          "flex h-11 w-full rounded-input border border-line bg-card pl-3.5 pr-10 py-2 text-base text-ink transition-colors",
          "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-45",
          error && "border-danger focus-visible:outline-danger"
        )}
      />
      <CalendarIcon className="pointer-events-none absolute right-3.5 h-4 w-4 text-muted" />
    </div>
  );
}

export interface DateTimePickerProps {
  value?: Date | string | null;
  onChange?: (datetime: string) => void;
  disabled?: boolean;
  error?: boolean;
  id?: string;
  className?: string;
  min?: string;
  max?: string;
}

export function DateTimePicker({
  value,
  onChange,
  disabled = false,
  error = false,
  id,
  className,
  min,
  max,
}: DateTimePickerProps) {
  const dtValue = value
    ? typeof value === "string"
      ? value.slice(0, 16)
      : format(value, "yyyy-MM-dd'T'HH:mm")
    : "";

  return (
    <div className={cn("relative flex items-center", className)}>
      <input
        type="datetime-local"
        id={id}
        value={dtValue}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn(
          "flex h-11 w-full rounded-input border border-line bg-card pl-3.5 pr-10 py-2 text-base text-ink transition-colors",
          "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-45",
          error && "border-danger focus-visible:outline-danger"
        )}
      />
      <Clock className="pointer-events-none absolute right-3.5 h-4 w-4 text-muted" />
    </div>
  );
}
