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
