import type { Metadata } from "next";
import { SEO_CONFIG } from "@/lib/constants/seo";

type Props = {
  params: Promise<{ id: string }>;
};

// Define the listing type for type safety
interface ListingData {
  id: string;
  title: string;
  description?: string;
  type: "item" | "service";
  price_hint?: string;
  status: string;
  category?: {
    name: string;
    slug: string;
  };
  photos?: Array<{
    url: string;
    thumbnail_url?: string;
  }>;
  user?: {
    id: string;
    display_name: string;
  };
  created_at?: string;
  availability?: string;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    const res = await fetch(`${apiUrl}/api/v1/listings/${id}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return {
        title: "Listing Not Found",
        description:
          "This listing may have been removed or is no longer available.",
      };
    }

    const listing: ListingData = await res.json();

    const title = listing.title;
    const categoryName = listing.category?.name || "";
    const typeLabel = listing.type === "service" ? "Service" : "Item";

    // Enhanced description with keywords
    const description =
      listing.description?.slice(0, 155) ||
      `${listing.title} - ${typeLabel} available on Gimme Dat campus marketplace at Gettysburg College. ${categoryName ? `Category: ${categoryName}.` : ""} Browse student listings in Adams County, PA.`;

    const image = listing.photos?.[0]?.url || `${SEO_CONFIG.siteUrl}/images/og-image.png`;
    const listingUrl = `${SEO_CONFIG.siteUrl}/listings/${id}`;

    // Keywords specific to this listing
    const keywords = [
      title,
      categoryName,
      `${typeLabel.toLowerCase()} Gettysburg`,
      "Gettysburg College marketplace",
      "student marketplace PA",
      categoryName ? `${categoryName} Gettysburg` : "",
    ].filter(Boolean);

    return {
      title,
      description,
      keywords,
      openGraph: {
        title: `${title} | Gimme Dat`,
        description,
        type: "website",
        url: listingUrl,
        images: [
          {
            url: image,
            width: 800,
            height: 600,
            alt: title,
          },
        ],
        siteName: SEO_CONFIG.siteName,
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | Gimme Dat`,
        description,
        images: [image],
        creator: SEO_CONFIG.twitterHandle,
      },
      alternates: {
        canonical: listingUrl,
      },
      robots: {
        index: listing.status === "active",
        follow: true,
      },
    };
  } catch {
    return {
      title: "Listing",
      description: "View this listing on Gimme Dat campus marketplace.",
    };
  }
}

export default function ListingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
