import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      asChild = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all select-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 disabled:opacity-45 disabled:cursor-not-allowed rounded-btn";

    const variantStyles = {
      primary:
        "bg-primary text-primary-ink hover:brightness-95 active:brightness-90 shadow-xs",
      secondary:
        "border-[1.5px] border-ink text-ink bg-transparent hover:bg-surface/70 active:bg-surface",
      destructive:
        "bg-danger text-white hover:brightness-95 active:brightness-90 shadow-xs",
      ghost: "text-ink hover:bg-surface/70 active:bg-surface bg-transparent",
    };

    const sizeStyles = {
      sm: "h-9 px-3 text-sm gap-1.5",
      md: "h-11 px-4 text-base gap-2",
      lg: "h-12 px-6 text-lg gap-2.5",
    };

    const combinedClassName = cn(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      loading && "relative text-transparent pointer-events-none",
      className
    );

    if (asChild && React.isValidElement(children)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const child = children as React.ReactElement<any>;
      return React.cloneElement(child, {
        ref,
        className: cn(combinedClassName, child.props?.className),
        ...props,
      });
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={combinedClassName}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center text-current">
            <Loader2
              className={cn(
                "animate-spin",
                variant === "primary" || variant === "destructive"
                  ? "text-white"
                  : "text-ink",
                size === "sm" ? "h-4 w-4" : "h-5 w-5"
              )}
            />
          </span>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export interface IconButtonProps extends ButtonProps {
  "aria-label": string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = "md", children, ...props }, ref) => {
    const squareSizes = {
      sm: "w-9 h-9 p-0",
      md: "w-11 h-11 p-0",
      lg: "w-12 h-12 p-0",
    };

    return (
      <Button
        ref={ref}
        size={size}
        className={cn(squareSizes[size], className)}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
IconButton.displayName = "IconButton";
