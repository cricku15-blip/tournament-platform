"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormErrorItem {
  fieldId: string;
  label?: string;
  message: string;
}

export interface FormErrorSummaryProps {
  errors: FormErrorItem[];
  title?: string;
  className?: string;
}

export function FormErrorSummary({
  errors,
  title = "Please fix the following errors to continue",
  className,
}: FormErrorSummaryProps) {
  if (errors.length === 0) return null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, fieldId: string) => {
    e.preventDefault();
    const el = document.getElementById(fieldId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        "rounded-card border-2 border-danger/40 bg-danger/10 p-4 text-ink shadow-xs",
        className
      )}
    >
      <div className="flex items-center gap-2 font-semibold text-danger mb-2 text-sm sm:text-base">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span>{title}</span>
      </div>
      <ul className="list-disc list-inside space-y-1 text-sm text-ink/90 pl-1">
        {errors.map((err, idx) => (
          <li key={`${err.fieldId}-${idx}`}>
            <a
              href={`#${err.fieldId}`}
              onClick={(e) => handleClick(e, err.fieldId)}
              className="font-medium underline hover:text-danger focus-visible:outline-2 focus-visible:outline-danger"
            >
              {err.label ? `${err.label}: ` : ""}
              {err.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
