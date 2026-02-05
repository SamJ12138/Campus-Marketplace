import type { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  // Fetch listing data for dynamic metadata
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  try {
    const res = await fetch(`${apiUrl}/api/v1/listings/${id}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    });

    if (!res.ok) {
      return {
        title: "Listing Not Found",
        description: "This listing may have been removed or is no longer available.",
      };
    }

    const listing = await res.json();

    const title = listing.title;
    const description = listing.description?.slice(0, 160) ||
      `${listing.title} - ${listing.type === "service" ? "Service" : "Item"} available on Gimme Dat campus marketplace.`;
    const image = listing.photos?.[0]?.url || "/images/og-image.png";

    return {
      title,
      description,
      openGraph: {
        title: `${title} | Gimme Dat`,
        description,
        type: "website",
        images: [
          {
            url: image,
            width: 800,
            height: 600,
            alt: title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | Gimme Dat`,
        description,
        images: [image],
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
