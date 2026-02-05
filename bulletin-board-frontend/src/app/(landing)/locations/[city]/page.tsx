import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  MapPin,
  GraduationCap,
  ChevronRight,
  ShieldCheck,
  Users,
  MessageCircle,
} from "lucide-react";
import {
  getLocationLandingContent,
  getAllLocationSlugs,
} from "@/lib/data/landing-content";
import { SEO_CONFIG } from "@/lib/constants/seo";
import { BreadcrumbSchema, JsonLd } from "@/components/seo";
import { generateLocalBusinessSchema } from "@/lib/data/local-seo";

type Props = {
  params: Promise<{ city: string }>;
};

// Generate static paths for all location pages
export async function generateStaticParams() {
  const slugs = getAllLocationSlugs();
  return slugs.map((city) => ({ city }));
}

// Generate metadata for each location page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const content = getLocationLandingContent(city);

  if (!content) {
    return {
      title: "Location Not Found",
    };
  }

  const url = `${SEO_CONFIG.siteUrl}/locations/${city}`;

  return {
    title: `Campus Marketplace in ${content.fullName} | Gimme Dat`,
    description: content.description,
    keywords: content.keywords,
    openGraph: {
      title: `Campus Marketplace in ${content.fullName} | Gimme Dat`,
      description: content.description,
      type: "website",
      url,
      siteName: SEO_CONFIG.siteName,
    },
    twitter: {
      card: "summary_large_image",
      title: `Campus Marketplace in ${content.fullName}`,
      description: content.description,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function LocationLandingPage({ params }: Props) {
  const { city } = await params;
  const content = getLocationLandingContent(city);

  if (!content) {
    notFound();
  }

  // Local business schema
  const localBusinessSchema = generateLocalBusinessSchema();

  // FAQ Schema for this page
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  // Breadcrumb items
  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Locations", url: "/locations/gettysburg" },
    { name: content.fullName, url: `/locations/${city}` },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Structured Data */}
      <BreadcrumbSchema items={breadcrumbs} />
      <JsonLd data={faqSchema} />
      <JsonLd data={localBusinessSchema} />

      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">Gimme Dat</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/feed"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Browse All
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-5 py-3">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{content.fullName}</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-medium">{content.fullName}</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {content.heroTitle}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {content.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/feed"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                {content.ctaText}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent"
              >
                Join the Community
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Local Features Section */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-foreground">
            Your Local Campus Marketplace
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            {content.description}
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {content.localFeatures.map((feature, index) => (
              <div
                key={index}
                className="rounded-xl border border-border bg-card p-6 text-center"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  {index === 0 && (
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  )}
                  {index === 1 && <MapPin className="h-6 w-6 text-primary" />}
                  {index === 2 && <Users className="h-6 w-6 text-primary" />}
                  {index === 3 && (
                    <MessageCircle className="h-6 w-6 text-primary" />
                  )}
                </div>
                <p className="font-medium text-foreground">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Landmarks Section */}
      <section className="border-y border-border bg-muted/30 px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-foreground">
            Serving {content.name} and Surrounding Areas
          </h2>
          <p className="mt-4 text-muted-foreground">
            Gimme Dat connects students and community members near these local
            landmarks and areas:
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {content.landmarks.map((landmark, index) => (
              <span
                key={index}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground"
              >
                {landmark}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Services Available */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-foreground">
            What You Can Find in {content.name}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Textbooks", link: "/services/textbooks" },
              { name: "Tutoring", link: "/services/tutoring" },
              { name: "Electronics", link: "/services/electronics" },
              { name: "Furniture", link: "/services/furniture" },
              { name: "Ride Share", link: "/services/transportation" },
              { name: "Photography", link: "/services/photography" },
            ].map((service) => (
              <Link
                key={service.name}
                href={service.link}
                className="group flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
              >
                <span className="font-medium text-foreground">
                  {service.name}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-border bg-muted/30 px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-foreground">
            Frequently Asked Questions
          </h2>
          <div className="mt-8 space-y-6">
            {content.faqs.map((faq, index) => (
              <div
                key={index}
                className="rounded-lg border border-border bg-card p-6"
              >
                <h3 className="font-semibold text-foreground">{faq.question}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary px-5 py-16 text-primary-foreground">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Join the {content.name} Campus Marketplace
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Connect with verified students and community members today.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/feed"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary hover:bg-white/90"
            >
              Browse Listings
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-5 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="font-semibold">Gimme Dat</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/how-it-works" className="hover:text-foreground">
                How It Works
              </Link>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Gimme Dat. A student community
            project serving {content.fullName}.
          </p>
        </div>
      </footer>
    </div>
  );
}
