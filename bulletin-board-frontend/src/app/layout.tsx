import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.gimme-dat.com"),
  title: {
    default: "Gimme Dat - Campus Marketplace",
    template: "%s | Gimme Dat",
  },
  description:
    "Your campus marketplace for services, items, and community connections. Buy, sell, and trade with fellow students.",
  keywords: [
    "Gettysburg College marketplace",
    "Gettysburg student marketplace",
    "campus marketplace",
    "college marketplace",
    "student marketplace",
    "buy sell trade",
    "textbooks",
    "tutoring",
    "college services",
    "student services",
    "Gettysburg PA",
  ],
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
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.gimme-dat.com",
    siteName: "Gimme Dat",
    title: "Gimme Dat - Campus Marketplace",
    description:
      "Your campus marketplace for services, items, and community connections. Buy, sell, and trade with fellow students.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gimme Dat - Campus Marketplace",
    description:
      "Your campus marketplace for services, items, and community connections.",
  },
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
