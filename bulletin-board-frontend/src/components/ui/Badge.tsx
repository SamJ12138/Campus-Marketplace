import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline:
          "text-foreground border-border",
        success:
          "border-transparent bg-success text-success-foreground",
        warning:
          "border-transparent bg-warning text-warning-foreground",
        gradient:
          "border-transparent bg-gradient-to-r from-primary to-[hsl(var(--secondary-accent))] text-white shadow-sm",
        "gradient-success":
          "border-transparent bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm",
        "gradient-warning":
          "border-transparent bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm",
        new:
          "border-transparent bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm animate-wiggle-slow",
        popular:
          "border-transparent bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm animate-wiggle-slow",
        glow:
          "border-transparent bg-gradient-to-r from-primary to-[hsl(var(--secondary-accent))] text-white shadow-glow",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  wiggle?: boolean;
}

function Badge({ className, variant, size, wiggle, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        badgeVariants({ variant, size }),
        wiggle && "animate-wiggle-slow",
        className,
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
