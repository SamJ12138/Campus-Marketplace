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
