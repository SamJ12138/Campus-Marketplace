import type { Metadata } from "next";
import { SEO_CONFIG } from "@/lib/constants/seo";

export const metadata: Metadata = {
  title: {
    template: "%s | Gimme Dat",
    default: "Student Services - Gimme Dat",
  },
  description:
    "Find student services at Gettysburg College including tutoring, photography, tech help, and more. Browse services from verified students.",
  openGraph: {
    siteName: SEO_CONFIG.siteName,
    type: "website",
  },
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
