import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, id, disabled, ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "mb-1.5 block text-sm font-medium font-display",
              disabled ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            "flex h-11 w-full rounded-xl border-2 bg-background px-4 py-2.5 text-sm transition-all duration-200 ease-spring",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground/60",
            "hover:border-primary/40 hover:shadow-sm",
            "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input disabled:hover:shadow-none",
            error
              ? "border-destructive hover:border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/10"
              : "border-input",
            className,
          )}
          ref={ref}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error && inputId ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={inputId ? `${inputId}-error` : undefined}
            className="mt-1.5 text-sm text-destructive animate-slide-up"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
