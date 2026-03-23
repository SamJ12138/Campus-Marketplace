const OFFER_TUTORIAL_KEY = "cb_offer_tutorial_completed";

export function hasCompletedOfferTutorial(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(OFFER_TUTORIAL_KEY) === "true";
}

export function markOfferTutorialComplete(): void {
  localStorage.setItem(OFFER_TUTORIAL_KEY, "true");
}

export function resetOfferTutorial(): void {
  localStorage.removeItem(OFFER_TUTORIAL_KEY);
}
