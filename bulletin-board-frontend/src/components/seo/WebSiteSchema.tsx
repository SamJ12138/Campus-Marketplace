import { JsonLd } from "./JsonLd";
import { SEO_CONFIG } from "@/lib/constants/seo";

export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SEO_CONFIG.siteName,
    alternateName: "Gimme Dat Campus Marketplace",
    url: SEO_CONFIG.siteUrl,
    description: SEO_CONFIG.defaultDescription,
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SEO_CONFIG.siteUrl}/feed?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: SEO_CONFIG.siteName,
      url: SEO_CONFIG.siteUrl,
    },
  };

  return <JsonLd data={schema} />;
}
