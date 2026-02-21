import type { Listing } from "@/lib/types";
import { api } from "./client";

export interface SemanticSearchItem {
  listing: Listing;
  similarity: number;
}

export interface SemanticSearchResponse {
  items: SemanticSearchItem[];
  total: number;
}

export interface SimilarListingItem {
  listing: Listing;
  similarity: number;
}

export interface SimilarListingsResponse {
  items: SimilarListingItem[];
}

export interface RecommendationsResponse {
  items: SimilarListingItem[];
}

export async function semanticSearch(
  query: string,
  page: number = 1,
  perPage: number = 20,
): Promise<SemanticSearchResponse> {
  return api.get<SemanticSearchResponse>("/api/v1/search/semantic", {
    q: query,
    page,
    per_page: perPage,
  });
}

export async function getSimilarListings(
  listingId: string,
  limit: number = 10,
): Promise<SimilarListingsResponse> {
  return api.get<SimilarListingsResponse>(
    `/api/v1/search/listings/${listingId}/similar`,
    { limit },
  );
}

export async function getRecommendations(
  limit: number = 20,
): Promise<RecommendationsResponse> {
  return api.get<RecommendationsResponse>("/api/v1/search/recommendations", {
    limit,
  });
}
