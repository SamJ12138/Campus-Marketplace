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
