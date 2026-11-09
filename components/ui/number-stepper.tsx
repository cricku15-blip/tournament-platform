"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NumberStepperProps {
  value?: number;
  defaultValue?: number;
  onChange?: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function NumberStepper({
  value: controlledValue,
  defaultValue = 0,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className,
  id,
}: NumberStepperProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const handleStep = (delta: number) => {
    const next = Math.max(min, Math.min(max, value + delta));
    if (!isControlled) {
      setInternalValue(next);
    }
    onChange?.(next);
  };

  return (
    <div
      id={id}
      className={cn(
        "inline-flex h-11 items-center rounded-input border border-line bg-card p-1",
        disabled && "opacity-45 cursor-not-allowed",
        className
      )}
    >
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => handleStep(-step)}
        aria-label="Decrease"
        className="flex h-9 w-9 items-center justify-center rounded-sm text-ink hover:bg-surface active:bg-surface/80 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-14 text-center font-display text-xl font-bold tabular-nums text-ink select-none">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => handleStep(step)}
        aria-label="Increase"
        className="flex h-9 w-9 items-center justify-center rounded-sm text-ink hover:bg-surface active:bg-surface/80 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
