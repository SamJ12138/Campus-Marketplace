import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read the Gimme Dat privacy policy. Learn how we collect, use, and protect your personal information on our campus marketplace platform.",
  openGraph: {
    title: "Privacy Policy | Gimme Dat",
    description: "Gimme Dat privacy policy and data protection practices.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
