"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";

export default function ListingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ListingDetail] route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <AlertTriangle className="h-16 w-16 text-amber-400" />
      <h2 className="mt-4 text-xl font-semibold text-slate-700">
        Something went wrong
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        We couldn&apos;t load this listing.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to listings
        </Link>
      </div>
      <details className="mt-6 max-w-md text-left">
        <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600">
          Error details
        </summary>
        <pre className="mt-2 overflow-auto rounded-lg bg-slate-100 p-3 text-xs text-slate-600">
          {error.message}
          {error.digest && `\nDigest: ${error.digest}`}
        </pre>
      </details>
    </div>
  );
}
