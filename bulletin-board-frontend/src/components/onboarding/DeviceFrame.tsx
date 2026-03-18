import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface DeviceFrameProps {
  children: ReactNode;
  className?: string;
}

export function DeviceFrame({ children, className }: DeviceFrameProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl",
        className,
      )}
    >
      {/* Title bar */}
      <div className="flex items-center gap-1.5 border-b border-border/50 bg-muted/50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
      </div>

      {/* Content area */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-background">
        {children}
      </div>
    </div>
  );
}
