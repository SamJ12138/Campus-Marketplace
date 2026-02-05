import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Learn how to use Gimme Dat campus marketplace. Create listings, connect with buyers and sellers, and safely trade items and services with fellow students.",
  openGraph: {
    title: "How It Works | Gimme Dat",
    description:
      "Learn how to use Gimme Dat campus marketplace to buy, sell, and trade with fellow students.",
  },
};

export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
