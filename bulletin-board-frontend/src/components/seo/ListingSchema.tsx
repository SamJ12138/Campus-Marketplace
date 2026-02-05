"use client";

import { useEffect, useState } from "react";
import { SEO_CONFIG } from "@/lib/constants/seo";

interface ListingSchemaProps {
  listing: {
    id: string;
    title: string;
    description: string;
    type: "item" | "service";
    price_hint?: string | null;
    status: string;
    category?: {
      name: string;
      slug: string;
    };
    photos?: Array<{
      url: string;
    }>;
    user?: {
      id: string;
      display_name: string;
    };
    created_at?: string;
    availability?: string | null;
  };
}

export function ListingSchema({ listing }: ListingSchemaProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const url = `${SEO_CONFIG.siteUrl}/listings/${listing.id}`;
  const imageUrl = listing.photos?.[0]?.url || `${SEO_CONFIG.siteUrl}/images/og-image.png`;

  // Parse price from hint
  let priceValue: number = 0;
  if (listing.price_hint) {
    if (listing.price_hint.toLowerCase() !== "free") {
      const numericPrice = parseFloat(listing.price_hint.replace(/[^0-9.]/g, ""));
      priceValue = isNaN(numericPrice) ? 0 : numericPrice;
    }
  }

  // Determine availability for schema
  const getAvailability = () => {
    if (listing.status === "sold") return "https://schema.org/SoldOut";
    if (listing.status === "expired") return "https://schema.org/Discontinued";
    return "https://schema.org/InStock";
  };

  const schema =
    listing.type === "item"
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: listing.title,
          description: listing.description,
          url,
          image: imageUrl,
          category: listing.category?.name,
          itemCondition: "https://schema.org/UsedCondition",
          offers: {
            "@type": "Offer",
            price: priceValue,
            priceCurrency: "USD",
            availability: getAvailability(),
            url,
            priceValidUntil: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
            seller: listing.user
              ? {
                  "@type": "Person",
                  name: listing.user.display_name,
                  url: `${SEO_CONFIG.siteUrl}/u/${listing.user.id}`,
                }
              : undefined,
          },
        }
      : {
          "@context": "https://schema.org",
          "@type": "Service",
          name: listing.title,
          description: listing.description,
          url,
          image: imageUrl,
          serviceType: listing.category?.name || "Student Service",
          areaServed: {
            "@type": "City",
            name: "Gettysburg",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Gettysburg",
              addressRegion: "PA",
              addressCountry: "US",
            },
          },
          provider: listing.user
            ? {
                "@type": "Person",
                name: listing.user.display_name,
                url: `${SEO_CONFIG.siteUrl}/u/${listing.user.id}`,
              }
            : {
                "@type": "Organization",
                name: SEO_CONFIG.siteName,
                url: SEO_CONFIG.siteUrl,
              },
          offers: priceValue > 0 || listing.price_hint
            ? {
                "@type": "Offer",
                price: priceValue,
                priceCurrency: "USD",
                description: listing.price_hint,
              }
            : undefined,
          hoursAvailable: listing.availability
            ? {
                "@type": "OpeningHoursSpecification",
                description: listing.availability,
              }
            : undefined,
        };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema, null, 0),
      }}
    />
  );
}
