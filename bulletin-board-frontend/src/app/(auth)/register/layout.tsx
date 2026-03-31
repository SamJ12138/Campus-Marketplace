import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to Gimme Dat to access your campus marketplace. Create listings, find items and services, and connect with fellow students.",
  openGraph: {
    title: "Sign In | GimmeDat Campus Marketplace",
    description:
      "Sign in to buy, sell, and trade with students at your campus.",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
