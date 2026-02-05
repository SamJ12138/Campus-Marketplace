import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Read the Gimme Dat terms of service. Understand the rules and guidelines for using our campus marketplace platform.",
  openGraph: {
    title: "Terms of Service | Gimme Dat",
    description: "Gimme Dat terms of service and usage guidelines.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
