import { JsonLd } from "./JsonLd";
import { SEO_CONFIG } from "@/lib/constants/seo";

interface OrganizationSchemaProps {
  logoUrl?: string;
  socialLinks?: string[];
}

export function OrganizationSchema({
  logoUrl = `${SEO_CONFIG.siteUrl}/images/logo.png`,
  socialLinks = [],
}: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SEO_CONFIG.siteName,
    url: SEO_CONFIG.siteUrl,
    logo: logoUrl,
    description: SEO_CONFIG.defaultDescription,
    foundingDate: "2024",
    founder: {
      "@type": "Organization",
      name: "Gettysburg College Students",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Gettysburg",
      addressRegion: "PA",
      addressCountry: "US",
    },
    areaServed: {
      "@type": "GeoCircle",
      geoMidpoint: {
        "@type": "GeoCoordinates",
        latitude: 39.8309,
        longitude: -77.2311,
      },
      geoRadius: "50000", // 50km radius
    },
    sameAs: socialLinks,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${SEO_CONFIG.siteUrl}/how-it-works`,
    },
  };

  return <JsonLd data={schema} />;
}
