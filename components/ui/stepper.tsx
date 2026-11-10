import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepItem {
  id: string | number;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStepIndex: number;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function Stepper({
  steps,
  currentStepIndex,
  onStepClick,
  className,
}: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full select-none", className)}>
      <ol className="flex items-center justify-between w-full">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isClickable = Boolean(onStepClick && isCompleted);

          return (
            <li
              key={step.id}
              className={cn(
                "relative flex-1 flex flex-col items-center",
                index !== steps.length - 1 &&
                  "after:content-[''] after:w-full after:h-[2px] after:bg-line after:absolute after:top-4 after:left-1/2 after:-z-10",
                index < currentStepIndex && "after:bg-primary"
              )}
            >
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(index)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all bg-card z-10",
                  "focus-visible:outline-2 focus-visible:outline-primary",
                  isCompleted &&
                    "bg-primary border-primary text-primary-ink hover:brightness-95",
                  isCurrent &&
                    "border-primary text-primary shadow-xs ring-4 ring-primary/15",
                  !isCompleted && !isCurrent && "border-line text-muted bg-surface",
                  isClickable && "cursor-pointer"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 stroke-[2.5]" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </button>
              <div className="mt-2 text-center">
                <span
                  className={cn(
                    "block text-xs font-semibold tracking-tight",
                    isCurrent
                      ? "text-primary font-bold"
                      : isCompleted
                      ? "text-ink"
                      : "text-muted"
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="hidden sm:block text-[11px] text-muted">
                    {step.description}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
