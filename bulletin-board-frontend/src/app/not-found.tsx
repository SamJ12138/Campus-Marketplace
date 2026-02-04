"use client";

import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-10 w-10 text-muted-foreground" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t.errors.notFound}</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>

        <Link
          href="/"
          className={cn(
            "inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2",
            "text-sm font-medium text-primary-foreground",
            "hover:bg-primary/90 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
}
