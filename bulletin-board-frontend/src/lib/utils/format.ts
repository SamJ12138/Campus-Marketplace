/**
 * Format a price_hint string to ensure it has a $ prefix.
 * If the value already starts with a currency symbol ($, €, £), it is returned as-is.
 */
export function formatPrice(priceHint: string): string {
  const trimmed = priceHint.trim();
  if (/^[$€£¥]/.test(trimmed)) {
    return trimmed;
  }
  return `$${trimmed}`;
}

/**
 * Format a budget range for display on request listings.
 */
export function formatBudgetRange(
  min: number | null,
  max: number | null,
): string {
  if (min != null && max != null) return `$${min} – $${max}`;
  if (min != null) return `From $${min}`;
  if (max != null) return `Up to $${max}`;
  return "Flexible";
}

/**
 * Sanitize a redirect URL to prevent open redirect attacks.
 * Only allows relative paths starting with "/". Falls back to the provided default.
 */
export function safeRedirect(redirect: string | null, fallback = "/feed"): string {
  if (!redirect) return fallback;
  // Must start with "/" and not "//" (protocol-relative URL)
  if (redirect.startsWith("/") && !redirect.startsWith("//")) {
    return redirect;
  }
  return fallback;
}
