import { JsonLd } from "./JsonLd";
import { SEO_CONFIG } from "@/lib/constants/seo";

interface ServiceSchemaProps {
  name: string;
  description: string;
  priceHint?: string;
  imageUrl?: string;
  url: string;
  category?: string;
  provider?: {
    name: string;
    url?: string;
  };
  areaServed?: string;
  availability?: string;
}

export function ServiceSchema({
  name,
  description,
  priceHint,
  imageUrl,
  url,
  category,
  provider,
  areaServed = "Gettysburg, PA",
  availability,
}: ServiceSchemaProps) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description: description.slice(0, 5000),
    url: url.startsWith("http") ? url : `${SEO_CONFIG.siteUrl}${url}`,
    serviceType: category || "Student Service",
    areaServed: {
      "@type": "City",
      name: areaServed,
      address: {
        "@type": "PostalAddress",
        addressLocality: "Gettysburg",
        addressRegion: "PA",
        addressCountry: "US",
      },
    },
    provider: provider
      ? {
          "@type": "Person",
          name: provider.name,
          url: provider.url
            ? provider.url.startsWith("http")
              ? provider.url
              : `${SEO_CONFIG.siteUrl}${provider.url}`
            : undefined,
        }
      : {
          "@type": "Organization",
          name: SEO_CONFIG.siteName,
          url: SEO_CONFIG.siteUrl,
        },
  };

  if (imageUrl) {
    schema.image = imageUrl.startsWith("http")
      ? imageUrl
      : `${SEO_CONFIG.siteUrl}${imageUrl}`;
  }

  if (priceHint) {
    // Add offer with price if available
    let priceValue: number | string = 0;
    if (priceHint.toLowerCase() !== "free") {
      const numericPrice = parseFloat(priceHint.replace(/[^0-9.]/g, ""));
      priceValue = isNaN(numericPrice) ? 0 : numericPrice;
    }

    schema.offers = {
      "@type": "Offer",
      price: priceValue,
      priceCurrency: "USD",
      description: priceHint,
    };
  }

  if (availability) {
    schema.hoursAvailable = {
      "@type": "OpeningHoursSpecification",
      description: availability,
    };
  }

  return <JsonLd data={schema} />;
}
