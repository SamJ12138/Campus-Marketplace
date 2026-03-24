const OFFER_POSTING_TUTORIAL_KEY = "cb_offer_posting_tutorial_completed";

export function hasCompletedOfferPostingTutorial(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(OFFER_POSTING_TUTORIAL_KEY) === "true";
}

export function markOfferPostingTutorialComplete(): void {
  localStorage.setItem(OFFER_POSTING_TUTORIAL_KEY, "true");
}

export function resetOfferPostingTutorial(): void {
  localStorage.removeItem(OFFER_POSTING_TUTORIAL_KEY);
}
