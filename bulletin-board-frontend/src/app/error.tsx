"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            An unexpected error occurred. You can try again or head back to the
            home page.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2",
              "text-sm font-medium text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <a
            href="/"
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input px-5 py-2",
              "text-sm font-medium",
              "hover:bg-accent transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <Home className="h-4 w-4" />
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
