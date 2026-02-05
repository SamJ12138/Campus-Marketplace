import type { Metadata } from "next";
import { SEO_CONFIG } from "@/lib/constants/seo";

export const metadata: Metadata = {
  title: {
    template: "%s | Gimme Dat",
    default: "Local Campus Marketplace - Gimme Dat",
  },
  description:
    "Campus marketplace serving Gettysburg College and Adams County, PA. Buy, sell, and trade with verified students in your local area.",
  openGraph: {
    siteName: SEO_CONFIG.siteName,
    type: "website",
  },
};

export default function LocationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
