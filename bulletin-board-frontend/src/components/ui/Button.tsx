import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary to-[hsl(var(--secondary-accent))] text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:brightness-110 active:scale-[0.97]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md shadow-destructive/25 hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/30 active:scale-[0.97]",
        outline:
          "border-2 border-primary/30 bg-background hover:bg-primary/5 hover:border-primary/50 hover:text-primary active:scale-[0.97]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md active:scale-[0.97]",
        ghost:
          "hover:bg-accent/50 hover:text-accent-foreground active:scale-[0.97]",
        link:
          "text-primary underline-offset-4 hover:underline",
        gradient:
          "bg-gradient-to-r from-primary via-[hsl(var(--secondary-accent))] to-[hsl(var(--accent))] text-white shadow-md hover:shadow-lg hover:brightness-110 active:scale-[0.97]",
        glow:
          "bg-gradient-to-r from-primary to-[hsl(var(--secondary-accent))] text-primary-foreground shadow-glow animate-pulse-glow hover:brightness-110 active:scale-[0.97]",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
      bounce: {
        true: "hover:animate-jelly",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      bounce: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, bounce, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, bounce, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
