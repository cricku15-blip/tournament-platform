"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export const ToastProvider = ToastPrimitive.Provider;
export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-4 right-4 z-50 flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[380px] sm:bottom-4 sm:right-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 pointer-events-none",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

export interface ToastProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
  variant?: "default" | "success" | "danger" | "info";
}

export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  ToastProps
>(({ className, variant = "default", children, ...props }, ref) => {
  const variantStyles = {
    default: "border-line bg-card text-ink shadow-md",
    success: "border-primary/40 bg-card text-ink shadow-md border-l-4 border-l-primary",
    danger: "border-danger/40 bg-card text-ink shadow-md border-l-4 border-l-danger",
    info: "border-line bg-card text-ink shadow-md border-l-4 border-l-ink",
  };

  return (
    <ToastPrimitive.Root
      ref={ref}
      className={cn(
        "pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-input border p-4 transition-all duration-300",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out",
        "data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-2.5 w-full">
        {variant === "success" && (
          <CheckCircle className="h-5 w-5 shrink-0 text-primary mt-0.5" />
        )}
        {variant === "danger" && (
          <AlertCircle className="h-5 w-5 shrink-0 text-danger mt-0.5" />
        )}
        {variant === "info" && (
          <Info className="h-5 w-5 shrink-0 text-ink mt-0.5" />
        )}
        <div className="flex-1">{children}</div>
      </div>
      <ToastPrimitive.Close className="shrink-0 rounded-sm p-1 text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary">
        <X className="h-4 w-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
});
Toast.displayName = ToastPrimitive.Root.displayName;

export const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={cn("text-sm font-semibold text-ink", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

export const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn("text-xs text-muted mt-0.5 leading-relaxed", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;

// Toast state management
export type ToastItem = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "danger" | "info";
  duration?: number;
};

type ToastListener = (toasts: ToastItem[]) => void;
let memoryToasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function notify() {
  listeners.forEach((listener) => listener([...memoryToasts]));
}

export function toast({
  title,
  description,
  variant = "default",
  duration = 5000,
}: Omit<ToastItem, "id">) {
  const id = crypto.randomUUID();
  const newItem: ToastItem = { id, title, description, variant, duration };
  memoryToasts = [newItem, ...memoryToasts.slice(0, 4)];
  notify();

  if (duration > 0) {
    setTimeout(() => {
      memoryToasts = memoryToasts.filter((t) => t.id !== id);
      notify();
    }, duration);
  }

  return id;
}

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastItem[]>(memoryToasts);

  React.useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  return {
    toasts,
    toast,
    dismiss: (id: string) => {
      memoryToasts = memoryToasts.filter((t) => t.id !== id);
      notify();
    },
  };
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider swipeDirection="down">
      {toasts.map((t) => (
        <Toast
          key={t.id}
          variant={t.variant}
          duration={t.duration}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
        >
          {t.title && <ToastTitle>{t.title}</ToastTitle>}
          {t.description && <ToastDescription>{t.description}</ToastDescription>}
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
