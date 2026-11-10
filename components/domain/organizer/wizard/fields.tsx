"use client";

import * as React from "react";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const selectCls =
  "h-11 w-full rounded-input border border-line bg-card px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-45";

export function Select2({ id, value, onChange, options, disabled }: { id: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; disabled?: boolean }) {
  return (
    <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={selectCls}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function NumField({ id, value, onChange, min, max, disabled, error }: { id: string; value: number | null; onChange: (v: number) => void; min?: number; max?: number; disabled?: boolean; error?: boolean }) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      disabled={disabled}
      error={error}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
    />
  );
}

export function ToggleRow({ id, label, help, checked, onChange, disabled }: { id: string; label: string; help?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <label htmlFor={id} className="font-semibold text-ink">
          {label}
        </label>
        {help && <p className="text-sm text-muted">{help}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} />
    </div>
  );
}

export function Group({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {title && <h3 className="font-display text-xl font-bold text-ink">{title}</h3>}
      {children}
    </div>
  );
}

export { FormField, Input };
