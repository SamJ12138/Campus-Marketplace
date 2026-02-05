import type { Metadata } from "next";
import { PAGE_METADATA, SEO_CONFIG } from "@/lib/constants/seo";

export const metadata: Metadata = {
  title: PAGE_METADATA.feed.title,
  description: PAGE_METADATA.feed.description,
  keywords: [...PAGE_METADATA.feed.keywords],
  openGraph: {
    title: `${PAGE_METADATA.feed.title} | Gimme Dat`,
    description: PAGE_METADATA.feed.description,
    type: "website",
    url: `${SEO_CONFIG.siteUrl}/feed`,
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_METADATA.feed.title,
    description: PAGE_METADATA.feed.description,
  },
  alternates: {
    canonical: `${SEO_CONFIG.siteUrl}/feed`,
  },
};

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
