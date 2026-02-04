import { useQuery } from "@tanstack/react-query";
import type { Ad } from "@/lib/types/ads";
import { AdsResponseSchema, AdSchema } from "@/lib/types/ads";

// ── Query key factory ──

export const adKeys = {
  all: ["ads"] as const,
  list: (campusId?: string) => [...adKeys.all, "list", campusId] as const,
  detail: (id: string) => [...adKeys.all, "detail", id] as const,
};

// ── Fetchers ──

async function fetchAds(campusId?: string, limit?: number): Promise<Ad[]> {
  const params = new URLSearchParams();
  if (campusId) params.set("campusId", campusId);
  if (limit) params.set("limit", String(limit));

  const qs = params.toString();
  const url = `/api/ads${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch ads");
  }

  const json = await res.json();
  return AdsResponseSchema.parse(json);
}

async function fetchAd(id: string): Promise<Ad | null> {
  // For MVP, fetch all ads and find by ID.
  // Replace with a dedicated /api/ads/[id] endpoint when available.
  const ads = await fetchAds(undefined, 50);
  const ad = ads.find((a) => a.id === id) ?? null;
  if (ad) AdSchema.parse(ad);
  return ad;
}

// ── Hooks ──

export function useAds(campusId?: string, limit?: number) {
  return useQuery({
    queryKey: adKeys.list(campusId),
    queryFn: () => fetchAds(campusId, limit),
  });
}

export function useAd(id: string | undefined) {
  return useQuery({
    queryKey: adKeys.detail(id!),
    queryFn: () => fetchAd(id!),
    enabled: !!id,
  });
}
