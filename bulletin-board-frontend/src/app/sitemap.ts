import { MetadataRoute } from "next";
import { SEO_CONFIG, SERVICE_CATEGORIES, LOCAL_AREAS } from "@/lib/constants/seo";

const BASE_URL = SEO_CONFIG.siteUrl;

// Type for listing data from API
interface ListingItem {
  id: string;
  updated_at: string;
  type: "item" | "service";
}

interface ListingsResponse {
  items: ListingItem[];
  total: number;
}

// Fetch listings for sitemap
async function fetchListings(): Promise<ListingItem[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];

  try {
    const res = await fetch(`${apiUrl}/api/v1/listings?limit=1000&status=active`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) return [];

    const data: ListingsResponse = await res.json();
    return data.items || [];
  } catch {
    console.error("Failed to fetch listings for sitemap");
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/feed`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/feed?type=item`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/feed?type=service`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/how-it-works`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Service category landing pages
  const serviceCategoryPages: MetadataRoute.Sitemap = Object.values(
    SERVICE_CATEGORIES
  ).map((category) => ({
    url: `${BASE_URL}/services/${category.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Location-based landing pages
  const locationPages: MetadataRoute.Sitemap = Object.values(LOCAL_AREAS).map(
    (area) => ({
      url: `${BASE_URL}/locations/${area.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })
  );

  // Dynamic listing pages
  const listings = await fetchListings();
  const listingPages: MetadataRoute.Sitemap = listings.map((listing) => ({
    url: `${BASE_URL}/listings/${listing.id}`,
    lastModified: new Date(listing.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    ...staticPages,
    ...serviceCategoryPages,
    ...locationPages,
    ...listingPages,
  ];
}
