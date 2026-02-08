import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CreateListingRequest,
  Listing,
  ListingFilters,
  PaginatedResponse,
  UpdateListingRequest,
} from "@/lib/types";
import {
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  renewListing,
  markSold,
  getCategories,
  getFavorites,
  addFavorite,
  removeFavorite,
} from "@/lib/api/listings";

// ---- Query key factories ----

const listingKeys = {
  all: ["listings"] as const,
  lists: () => [...listingKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...listingKeys.lists(), filters] as const,
  details: () => [...listingKeys.all, "detail"] as const,
  detail: (id: string) => [...listingKeys.details(), id] as const,
  categories: (type?: string) => ["categories", type] as const,
  favorites: () => ["favorites"] as const,
};

// ---- Queries ----

export function useListings(
  filters: ListingFilters & { q?: string; sort?: string } = {},
  options?: { enabled?: boolean },
) {
  return useInfiniteQuery({
    queryKey: listingKeys.list(filters as Record<string, unknown>),
    queryFn: ({ pageParam = 1 }) =>
      getListings({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_next
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: options?.enabled,
  });
}

export function useListing(id: string | undefined) {
  return useQuery({
    queryKey: listingKeys.detail(id!),
    queryFn: () => getListing(id!),
    enabled: !!id,
  });
}

export function useCategories(type?: string) {
  return useQuery({
    queryKey: listingKeys.categories(type),
    queryFn: () => getCategories(type),
  });
}

export function useFavorites() {
  return useInfiniteQuery({
    queryKey: listingKeys.favorites(),
    queryFn: ({ pageParam = 1 }) => getFavorites(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_next
        ? lastPage.pagination.page + 1
        : undefined,
  });
}

// ---- Mutations ----

export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateListingRequest) => createListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listingKeys.lists() });
    },
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateListingRequest }) =>
      updateListing(id, data),
    onSuccess: (updatedListing) => {
      queryClient.setQueryData(
        listingKeys.detail(updatedListing.id),
        updatedListing,
      );
      queryClient.invalidateQueries({ queryKey: listingKeys.lists() });
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteListing(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: listingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: listingKeys.lists() });
    },
  });
}

export function useRenewListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => renewListing(id),
    onSuccess: (updatedListing) => {
      queryClient.setQueryData(
        listingKeys.detail(updatedListing.id),
        updatedListing,
      );
      queryClient.invalidateQueries({ queryKey: listingKeys.lists() });
    },
  });
}

export function useMarkSold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markSold(id),
    onSuccess: (updatedListing) => {
      queryClient.setQueryData(
        listingKeys.detail(updatedListing.id),
        updatedListing,
      );
      queryClient.invalidateQueries({ queryKey: listingKeys.lists() });
    },
  });
}

/**
 * Optimistic toggle for favoriting / un-favoriting a listing.
 * Immediately flips `is_favorited` in every cached listing page and
 * the single-listing detail cache, then rolls back on error.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      listingId,
      isFavorited,
    }: {
      listingId: string;
      isFavorited: boolean;
    }) => (isFavorited ? removeFavorite(listingId) : addFavorite(listingId)),

    onMutate: async ({ listingId, isFavorited }) => {
      // Cancel in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: listingKeys.all });
      await queryClient.cancelQueries({ queryKey: listingKeys.favorites() });

      // Snapshot previous values for rollback
      const previousDetail = queryClient.getQueryData<Listing>(
        listingKeys.detail(listingId),
      );

      // Optimistically update the single-listing cache
      queryClient.setQueryData<Listing>(
        listingKeys.detail(listingId),
        (old) => {
          if (!old) return old;
          return { ...old, is_favorited: !isFavorited };
        },
      );

      // Optimistically update every listing in infinite query pages
      queryClient.setQueriesData<InfiniteData<PaginatedResponse<Listing>>>(
        { queryKey: listingKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === listingId
                  ? { ...item, is_favorited: !isFavorited }
                  : item,
              ),
            })),
          };
        },
      );

      return { previousDetail };
    },

    onSuccess: (_data, { isFavorited }) => {
      toast.success(isFavorited ? "Removed from favorites" : "Added to favorites");
    },

    onError: (_err, { listingId, isFavorited }, context) => {
      // Roll back the detail cache
      if (context?.previousDetail) {
        queryClient.setQueryData(
          listingKeys.detail(listingId),
          context.previousDetail,
        );
      }
      // Refetch lists to restore correct state
      queryClient.invalidateQueries({ queryKey: listingKeys.lists() });
      // Show error toast
      toast.error(
        isFavorited
          ? "Failed to remove from favorites"
          : "Failed to add to favorites"
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listingKeys.favorites() });
    },
  });
}
