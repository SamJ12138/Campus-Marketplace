import { z } from "zod";

export const listingCreateSchema = z
  .object({
    type: z.enum(["service", "item"], {
      required_error: "Listing type is required",
    }),
    listing_mode: z.enum(["offering", "seeking"]).default("offering"),
    category_id: z
      .string({ required_error: "Category is required" })
      .min(1, "Category is required"),
    custom_category_label: z
      .string()
      .max(80, "Custom category must be at most 80 characters")
      .optional()
      .or(z.literal("")),
    title: z
      .string({ required_error: "Title is required" })
      .min(5, "Title must be at least 5 characters")
      .max(150, "Title must be at most 150 characters"),
    description: z
      .string({ required_error: "Description is required" })
      .min(20, "Description must be at least 20 characters")
      .max(5000, "Description must be at most 5000 characters"),
    price_hint: z
      .string()
      .max(100, "Price hint must be at most 100 characters")
      .optional()
      .or(z.literal("")),
    budget_min: z.coerce
      .number()
      .min(0, "Budget cannot be negative")
      .nullish()
      .or(z.literal("")),
    budget_max: z.coerce
      .number()
      .min(0, "Budget cannot be negative")
      .nullish()
      .or(z.literal("")),
    urgency: z
      .enum(["low", "medium", "high", "asap"])
      .nullish(),
    location_type: z.enum(["on_campus", "off_campus", "remote"], {
      required_error: "Location type is required",
    }),
    location_hint: z
      .string()
      .max(200, "Location hint must be at most 200 characters")
      .optional()
      .or(z.literal("")),
    availability: z
      .string()
      .max(200, "Availability must be at most 200 characters")
      .optional()
      .or(z.literal("")),
    contact_preference: z.enum(["in_app", "email", "phone"], {
      required_error: "Contact preference is required",
    }),
    is_regulated: z.boolean().default(false),
    disclaimer_accepted: z.boolean().default(false),
  })
  .refine((data) => data.disclaimer_accepted === true, {
    message: "You must accept the terms to post a listing",
    path: ["disclaimer_accepted"],
  })
  .refine(
    (data) => {
      const min = typeof data.budget_min === "number" ? data.budget_min : null;
      const max = typeof data.budget_max === "number" ? data.budget_max : null;
      if (min != null && max != null) return min <= max;
      return true;
    },
    {
      message: "Minimum budget cannot exceed maximum budget",
      path: ["budget_max"],
    },
  );

export const listingUpdateSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(150, "Title must be at most 150 characters")
    .optional(),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(5000, "Description must be at most 5000 characters")
    .optional(),
  category_id: z
    .string()
    .min(1, "Invalid category")
    .optional(),
  custom_category_label: z
    .string()
    .max(80, "Custom category must be at most 80 characters")
    .optional()
    .or(z.literal("")),
  price_hint: z
    .string()
    .max(100, "Price hint must be at most 100 characters")
    .nullish(),
  location_type: z
    .enum(["on_campus", "off_campus", "remote"])
    .optional(),
  location_hint: z
    .string()
    .max(200, "Location hint must be at most 200 characters")
    .nullish(),
  availability: z
    .string()
    .max(200, "Availability must be at most 200 characters")
    .nullish(),
  contact_preference: z
    .enum(["in_app", "email", "phone"])
    .optional(),
  is_regulated: z.boolean().optional(),
});

export type ListingCreateInput = z.infer<typeof listingCreateSchema>;
export type ListingUpdateInput = z.infer<typeof listingUpdateSchema>;
