"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "./use-auth";

/**
 * Hook for gating actions behind authentication.
 *
 * `requireAuth(callback?)` — if the user is authenticated, runs the callback
 * immediately. Otherwise, redirects to `/login?redirect=<current_path>`.
 */
export function useRequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();
  const pathname = usePathname();

  const requireAuth = useCallback(
    (onAuthed?: () => void) => {
      if (isAuthenticated) {
        onAuthed?.();
        return true;
      }
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return false;
    },
    [isAuthenticated, router, pathname],
  );

  return { isAuthenticated, requireAuth };
}
