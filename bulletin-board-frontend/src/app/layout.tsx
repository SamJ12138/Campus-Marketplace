import type { Metadata } from "next";
import { Quicksand, Nunito } from "next/font/google";
import "@/globals.css";
import { Providers } from "./providers";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo";
import { ALL_KEYWORDS, SEO_CONFIG } from "@/lib/constants/seo";
import { Toaster } from "sonner";

const quicksand = Quicksand({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-quicksand",
  weight: ["300", "400", "500", "600", "700"],
  preload: true,
});

const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(SEO_CONFIG.siteUrl),
  title: {
    default: "Gimme Dat - Gettysburg College Campus Marketplace",
    template: "%s | Gimme Dat",
  },
  description:
    "Buy, sell, and trade textbooks, services, and more with verified Gettysburg College students. Your trusted campus marketplace for tutoring, electronics, furniture, and student services in Adams County, PA.",
  keywords: [...ALL_KEYWORDS],
  authors: [{ name: "Gimme Dat" }],
  creator: "Gimme Dat",
  publisher: "Gimme Dat",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SEO_CONFIG.siteUrl,
    siteName: SEO_CONFIG.siteName,
    title: "Gimme Dat - Gettysburg College Campus Marketplace",
    description:
      "Buy, sell, and trade textbooks, services, and more with verified Gettysburg College students. Your trusted campus marketplace.",
    images: [
      {
        url: `${SEO_CONFIG.siteUrl}/images/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Gimme Dat - Campus Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gimme Dat - Gettysburg College Campus Marketplace",
    description:
      "Your campus marketplace for textbooks, tutoring, and student services at Gettysburg College.",
    images: [`${SEO_CONFIG.siteUrl}/images/twitter-card.png`],
    creator: SEO_CONFIG.twitterHandle,
    site: SEO_CONFIG.twitterHandle,
  },
  alternates: {
    canonical: SEO_CONFIG.siteUrl,
  },
  category: "education",
  verification: {
    // Add these when you have them
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${quicksand.variable} ${nunito.variable}`}
      suppressHydrationWarning
    >
      <head>
        <OrganizationSchema />
        <WebSiteSchema />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
