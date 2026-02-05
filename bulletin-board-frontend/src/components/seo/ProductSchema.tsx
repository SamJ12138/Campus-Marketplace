import { JsonLd } from "./JsonLd";
import { SEO_CONFIG } from "@/lib/constants/seo";

interface ProductSchemaProps {
  name: string;
  description: string;
  price?: string | number;
  priceHint?: string;
  imageUrl?: string;
  url: string;
  category?: string;
  condition?: "NewCondition" | "UsedCondition" | "RefurbishedCondition";
  availability?:
    | "InStock"
    | "OutOfStock"
    | "SoldOut"
    | "PreOrder"
    | "Discontinued";
  seller?: {
    name: string;
    url?: string;
  };
  datePosted?: string;
}

export function ProductSchema({
  name,
  description,
  price,
  priceHint,
  imageUrl,
  url,
  category,
  condition = "UsedCondition",
  availability = "InStock",
  seller,
  datePosted,
}: ProductSchemaProps) {
  // Parse price from string if needed (e.g., "$25" or "Free")
  let priceValue: number | string = 0;
  if (typeof price === "number") {
    priceValue = price;
  } else if (price) {
    const numericPrice = parseFloat(price.replace(/[^0-9.]/g, ""));
    priceValue = isNaN(numericPrice) ? 0 : numericPrice;
  } else if (priceHint) {
    if (priceHint.toLowerCase() === "free") {
      priceValue = 0;
    } else {
      const numericPrice = parseFloat(priceHint.replace(/[^0-9.]/g, ""));
      priceValue = isNaN(numericPrice) ? 0 : numericPrice;
    }
  }

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: description.slice(0, 5000),
    url: url.startsWith("http") ? url : `${SEO_CONFIG.siteUrl}${url}`,
    category,
    itemCondition: `https://schema.org/${condition}`,
    offers: {
      "@type": "Offer",
      price: priceValue,
      priceCurrency: "USD",
      availability: `https://schema.org/${availability}`,
      url: url.startsWith("http") ? url : `${SEO_CONFIG.siteUrl}${url}`,
      priceValidUntil: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      seller: seller
        ? {
            "@type": "Person",
            name: seller.name,
            url: seller.url
              ? seller.url.startsWith("http")
                ? seller.url
                : `${SEO_CONFIG.siteUrl}${seller.url}`
              : undefined,
          }
        : undefined,
    },
  };

  if (imageUrl) {
    schema.image = imageUrl.startsWith("http")
      ? imageUrl
      : `${SEO_CONFIG.siteUrl}${imageUrl}`;
  }

  if (datePosted) {
    schema.datePosted = datePosted;
  }

  return <JsonLd data={schema} />;
}
