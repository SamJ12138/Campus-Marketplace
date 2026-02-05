import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Sign up for Gimme Dat to join your campus marketplace. Create listings, find items and services, and connect with fellow students.",
  openGraph: {
    title: "Join Gimme Dat | Campus Marketplace",
    description:
      "Sign up to buy, sell, and trade with students at your campus.",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
