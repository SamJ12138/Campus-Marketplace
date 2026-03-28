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

// --- Signup nudge popup (landing page, first-visit only) ---
const SIGNUP_NUDGE_KEY = "cb_signup_nudge_dismissed";

export function hasSeenSignupNudge(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SIGNUP_NUDGE_KEY) === "true";
}

export function dismissSignupNudge(): void {
  localStorage.setItem(SIGNUP_NUDGE_KEY, "true");
}
