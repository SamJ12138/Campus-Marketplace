const ONBOARDING_KEY = "cb_onboarding_completed";

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}

// --- Signup nudge popup (landing page, cooldown-based) ---
const SIGNUP_NUDGE_KEY = "cb_signup_nudge_dismissed";
const NUDGE_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours

export function hasSeenSignupNudge(): boolean {
  if (typeof window === "undefined") return true;
  const dismissed = localStorage.getItem(SIGNUP_NUDGE_KEY);
  if (!dismissed) return false;
  // Legacy boolean "true" — treat as expired so nudge re-shows
  const timestamp = Number(dismissed);
  if (isNaN(timestamp)) return false;
  return Date.now() - timestamp < NUDGE_COOLDOWN_MS;
}

export function dismissSignupNudge(): void {
  localStorage.setItem(SIGNUP_NUDGE_KEY, String(Date.now()));
}
