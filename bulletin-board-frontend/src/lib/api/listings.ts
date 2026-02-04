import type {
  Category,
  Listing,
  ListingFilters,
  CreateListingRequest,
  UpdateListingRequest,
  PaginatedResponse,
} from "@/lib/types";
import { api } from "./client";

export async function getListings(
  params: ListingFilters & { q?: string; sort?: string } = {},
): Promise<PaginatedResponse<Listing>> {
  return api.get<PaginatedResponse<Listing>>("/api/v1/listings", {
    type: params.type,
    category_slug: params.category_slug,
    location_type: params.location_type,
    search: params.search,
    q: params.q,
    status: params.status,
    sort: params.sort,
    page: params.page,
    per_page: params.per_page,
  });
}

export async function getListing(id: string): Promise<Listing> {
  return api.get<Listing>(`/api/v1/listings/${id}`);
}

export async function createListing(
  data: CreateListingRequest,
): Promise<Listing> {
  return api.post<Listing>("/api/v1/listings", data);
}

export async function updateListing(
  id: string,
  data: UpdateListingRequest,
): Promise<Listing> {
  return api.patch<Listing>(`/api/v1/listings/${id}`, data);
}

export async function deleteListing(id: string): Promise<void> {
  return api.delete(`/api/v1/listings/${id}`);
}

export async function renewListing(id: string): Promise<Listing> {
  return api.post<Listing>(`/api/v1/listings/${id}/renew`);
}

export async function markSold(id: string): Promise<Listing> {
  return api.post<Listing>(`/api/v1/listings/${id}/mark-sold`);
}

export async function getCategories(
  listing_type?: string,
): Promise<Category[]> {
  return api.get<Category[]>("/api/v1/categories", {
    listing_type,
  });
}

export async function getFavorites(
  page?: number,
  per_page?: number,
): Promise<PaginatedResponse<Listing>> {
  return api.get<PaginatedResponse<Listing>>("/api/v1/favorites", {
    page,
    per_page,
  });
}

export async function addFavorite(listingId: string): Promise<void> {
  return api.post<void>(`/api/v1/listings/${listingId}/favorite`);
}

export async function removeFavorite(listingId: string): Promise<void> {
  return api.delete(`/api/v1/listings/${listingId}/favorite`);
}
