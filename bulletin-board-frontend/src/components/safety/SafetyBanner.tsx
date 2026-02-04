"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";

const STORAGE_KEY = "campus-board-safety-dismissed";

export function SafetyBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== "true") {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  if (dismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative rounded-lg border p-4",
        "border-warning/30 bg-warning/10 dark:border-warning/20 dark:bg-warning/5",
      )}
      role="alert"
    >
      <div className="flex gap-3">
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            {t.safety.safetyTitle}
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
              {t.safety.noPayments}
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
              {t.safety.meetPublic}
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
              {t.safety.userResponsibility}
            </li>
          </ul>
          <button
            onClick={handleDismiss}
            className="mt-3 rounded-md bg-warning/20 px-3 py-1.5 text-xs font-medium text-warning-foreground transition-colors hover:bg-warning/30 dark:text-warning"
          >
            Got it
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-warning/20 hover:text-foreground"
          aria-label="Dismiss safety banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
