import { useQuery } from "@tanstack/react-query";
import type { Ad } from "@/lib/types/ads";
import { AdsResponseSchema, AdSchema } from "@/lib/types/ads";
import { api } from "@/lib/api/client";

// ── Query key factory ──

export const adKeys = {
  all: ["ads"] as const,
  list: (campusId?: string) => [...adKeys.all, "list", campusId] as const,
  detail: (id: string) => [...adKeys.all, "detail", id] as const,
};

// ── Fetchers ──

async function fetchAds(campusId?: string, limit?: number): Promise<Ad[]> {
  const params: Record<string, string> = {};
  if (campusId) params.campus_id = campusId;
  if (limit) params.limit = String(limit);

  try {
    // Try backend API first
    const data = await api.get<Ad[]>("/api/v1/ads", params);
    return AdsResponseSchema.parse(data);
  } catch {
    // Fall back to seed data route if backend is unavailable
    const qs = new URLSearchParams();
    if (campusId) qs.set("campusId", campusId);
    if (limit) qs.set("limit", String(limit));
    const url = `/api/ads${qs.toString() ? `?${qs}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch ads");
    const json = await res.json();
    return AdsResponseSchema.parse(json);
  }
}

async function fetchAd(id: string): Promise<Ad | null> {
  try {
    const ad = await api.get<Ad>(`/api/v1/ads/detail/${id}`);
    return AdSchema.parse(ad);
  } catch {
    // Fall back to fetching all and finding by ID
    const ads = await fetchAds(undefined, 50);
    return ads.find((a) => a.id === id) ?? null;
  }
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
