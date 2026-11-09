import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  id?: string;
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  helper,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const generatedId = React.useId();
  const fieldId = id || generatedId;
  const helperId = `${fieldId}-helper`;
  const errorId = `${fieldId}-error`;

  const describedBy = [
    helper ? helperId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
      {label && (
        <label
          htmlFor={fieldId}
          className="text-sm font-semibold text-ink flex items-center gap-1 select-none"
        >
          {label}
          {required && <span className="text-danger">*</span>}
        </label>
      )}

      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string; "aria-describedby"?: string; error?: boolean }>, {
            id: fieldId,
            "aria-describedby": describedBy || undefined,
            error: Boolean(error),
          })
        : children}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-xs font-medium text-danger mt-0.5"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helper ? (
        <p id={helperId} className="text-xs text-muted mt-0.5">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
