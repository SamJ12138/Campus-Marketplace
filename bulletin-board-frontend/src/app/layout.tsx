import type { Metadata } from "next";
import Script from "next/script";
import { Quicksand, Nunito } from "next/font/google";
import "@/globals.css";
import { Providers } from "./providers";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo";
import { ALL_KEYWORDS, SEO_CONFIG } from "@/lib/constants/seo";
import { Toaster } from "sonner";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

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
    default: SEO_CONFIG.defaultTitle,
    template: `%s | ${SEO_CONFIG.siteName}`,
  },
  description: SEO_CONFIG.defaultDescription,
  keywords: [...ALL_KEYWORDS],
  authors: [{ name: SEO_CONFIG.siteName }],
  creator: SEO_CONFIG.siteName,
  publisher: SEO_CONFIG.siteName,
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
    title: SEO_CONFIG.defaultTitle,
    description: SEO_CONFIG.defaultDescription,
    images: [
      {
        url: `${SEO_CONFIG.siteUrl}/images/og-image.png`,
        width: 1200,
        height: 630,
        alt: `${SEO_CONFIG.siteName} - Campus Marketplace`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_CONFIG.defaultTitle,
    description: SEO_CONFIG.defaultDescription,
    images: [`${SEO_CONFIG.siteUrl}/images/twitter-card.png`],
    creator: SEO_CONFIG.twitterHandle,
    site: SEO_CONFIG.twitterHandle,
  },
  alternates: {
    canonical: SEO_CONFIG.siteUrl,
  },
  category: "education",
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
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
