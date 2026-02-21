import { api } from "./client";

// ---- Request types ----

export interface SuggestDescriptionPayload {
  title: string;
  listing_type: "item" | "service";
  keywords?: string[];
  category?: string;
}

export interface SuggestTitlePayload {
  description: string;
  listing_type: "item" | "service";
  category?: string;
}

export interface SuggestPricePayload {
  title: string;
  description: string;
  listing_type: "item" | "service";
  category?: string;
}

export interface SuggestCategoryPayload {
  title: string;
  description: string;
  listing_type: "item" | "service";
}

export interface CompletenessPayload {
  title?: string;
  description?: string;
  price_hint?: string;
  category_id?: string;
  photos_count?: number;
  location_type?: string;
  location_hint?: string;
  availability?: Record<string, unknown>;
}

// ---- Response types ----

export interface SuggestDescriptionResponse {
  description: string;
  tips: string[];
}

export interface SuggestTitleResponse {
  titles: string[];
  reasoning: string;
}

export interface SuggestPriceResponse {
  price_hint: string;
  reasoning: string;
  price_range: { low?: number; high?: number };
}

export interface SuggestCategoryResponse {
  category_slug: string | null;
  category_name: string | null;
  confidence: number;
  reasoning: string;
}

export interface CompletenessResponse {
  score: number;
  max_score: number;
  percentage: number;
  breakdown: Record<string, number>;
  suggestions: string[];
}

// ---- API functions ----

export async function suggestDescription(
  payload: SuggestDescriptionPayload,
): Promise<SuggestDescriptionResponse> {
  return api.post<SuggestDescriptionResponse>(
    "/api/v1/listing-assist/suggest-description",
    payload,
  );
}

export async function suggestTitle(
  payload: SuggestTitlePayload,
): Promise<SuggestTitleResponse> {
  return api.post<SuggestTitleResponse>(
    "/api/v1/listing-assist/suggest-title",
    payload,
  );
}

export async function suggestPrice(
  payload: SuggestPricePayload,
): Promise<SuggestPriceResponse> {
  return api.post<SuggestPriceResponse>(
    "/api/v1/listing-assist/suggest-price",
    payload,
  );
}

export async function suggestCategory(
  payload: SuggestCategoryPayload,
): Promise<SuggestCategoryResponse> {
  return api.post<SuggestCategoryResponse>(
    "/api/v1/listing-assist/suggest-category",
    payload,
  );
}

export async function scoreCompleteness(
  payload: CompletenessPayload,
): Promise<CompletenessResponse> {
  return api.post<CompletenessResponse>(
    "/api/v1/listing-assist/completeness",
    payload,
  );
}
