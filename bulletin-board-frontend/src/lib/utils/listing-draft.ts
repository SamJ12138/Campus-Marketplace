const DRAFT_KEY = "gimmedat_listing_draft";
const STALE_DAYS = 7;

interface ListingDraft {
  values: Record<string, unknown>;
  savedAt: string;
}

export function saveListingDraft(values: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const draft: ListingDraft = { values, savedAt: new Date().toISOString() };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function getListingDraft(): ListingDraft | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const draft: ListingDraft = JSON.parse(raw);
    const savedAt = new Date(draft.savedAt);
    const now = new Date();
    const diffDays = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > STALE_DAYS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return draft;
  } catch {
    localStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

export function clearListingDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFT_KEY);
}

export function hasListingDraft(): boolean {
  if (typeof window === "undefined") return false;
  return getListingDraft() !== null;
}
