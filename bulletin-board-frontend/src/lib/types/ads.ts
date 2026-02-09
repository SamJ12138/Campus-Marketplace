import { z } from "zod";

// ──────────────────────────────────────────────
// Ad type union
// ──────────────────────────────────────────────

export type AdType = "INTERNAL_DETAIL" | "EXTERNAL_LINK" | "COUPON" | "EVENT";

// ──────────────────────────────────────────────
// Ad model
// ──────────────────────────────────────────────

export interface Ad {
  id: string;
  campusId: string;
  type: AdType;
  title: string;
  subtitle?: string;
  ctaText: string;
  ctaUrl?: string;
  image: { src: string; alt: string };
  theme?: { accent?: string };
  externalUrl?: string;
  body?: string;
  couponCode?: string;
  event?: { startAt: string; location?: string };
  priority: number;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
}

// ──────────────────────────────────────────────
// Zod schemas (validation in the fetch layer)
// ──────────────────────────────────────────────

export const AdSchema = z.object({
  id: z.string(),
  campusId: z.string(),
  type: z.enum(["INTERNAL_DETAIL", "EXTERNAL_LINK", "COUPON", "EVENT"]),
  title: z.string(),
  subtitle: z.string().optional(),
  ctaText: z.string(),
  ctaUrl: z.string().optional(),
  image: z.object({
    src: z.string(),
    alt: z.string(),
  }),
  theme: z
    .object({
      accent: z.string().optional(),
    })
    .optional(),
  externalUrl: z.string().url().optional(),
  body: z.string().optional(),
  couponCode: z.string().optional(),
  event: z
    .object({
      startAt: z.string(),
      location: z.string().optional(),
    })
    .optional(),
  priority: z.number(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  createdAt: z.string(),
});

export const AdsResponseSchema = z.array(AdSchema);
