import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Marketplace",
  description:
    "Browse listings for services, items, and more from students at your campus. Find tutoring, textbooks, electronics, and community connections.",
  openGraph: {
    title: "Browse Marketplace | Gimme Dat",
    description:
      "Browse listings for services, items, and more from students at your campus.",
  },
};

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
