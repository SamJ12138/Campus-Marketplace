import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Tag,
} from "lucide-react";
import {
  getServiceLandingContent,
  getAllServiceSlugs,
} from "@/lib/data/landing-content";
import { SEO_CONFIG } from "@/lib/constants/seo";
import { BreadcrumbSchema, JsonLd } from "@/components/seo";

type Props = {
  params: Promise<{ category: string }>;
};

// Generate static paths for all service categories
export async function generateStaticParams() {
  const slugs = getAllServiceSlugs();
  return slugs.map((category) => ({ category }));
}

// Generate metadata for each service page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const content = getServiceLandingContent(category);

  if (!content) {
    return {
      title: "Service Not Found",
    };
  }

  const url = `${SEO_CONFIG.siteUrl}/services/${category}`;

  return {
    title: content.title,
    description: content.description,
    keywords: content.keywords,
    openGraph: {
      title: `${content.title} | GimmeDat`,
      description: content.description,
      type: "website",
      url,
      siteName: SEO_CONFIG.siteName,
    },
    twitter: {
      card: "summary_large_image",
      title: content.title,
      description: content.description,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function ServiceLandingPage({ params }: Props) {
  const { category } = await params;
  const content = getServiceLandingContent(category);

  if (!content) {
    notFound();
  }

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
    { name: "Services", url: "/feed?type=service" },
    { name: content.title, url: `/services/${category}` },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Structured Data */}
      <BreadcrumbSchema items={breadcrumbs} />
      <JsonLd data={faqSchema} />

      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="GimmeDat" width={24} height={24} className="h-6 w-6 object-contain" />
            <span className="text-lg font-bold tracking-tight">GimmeDat</span>
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
            <Link href="/feed?type=service" className="hover:text-foreground">
              Services
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{content.title}</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {content.heroTitle}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              {content.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href={content.ctaLink}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                {content.ctaText}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground hover:bg-accent"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-foreground">
            Why Use GimmeDat for {content.title}?
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {content.benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
              >
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
                <p className="text-sm text-foreground">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example Posts Section */}
      {content.examplePosts && content.examplePosts.length > 0 && (
        <section className="border-y border-border bg-muted/30 px-5 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold text-foreground">
              Example Posts
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Here&apos;s what students are posting on GimmeDat
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {content.examplePosts.map((post, index) => (
                <div
                  key={index}
                  className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-sm"
                >
                  <h3 className="font-semibold text-foreground leading-snug">
                    {post.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      {post.price}
                    </span>
                  </div>
                  <p className="mt-3 flex-1 text-sm text-muted-foreground leading-relaxed">
                    {post.snippet}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href={content.ctaLink}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
              >
                See all {content.title.toLowerCase()} listings
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Description Section */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-foreground">
              About {content.title} on GimmeDat
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              {content.description}
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              GimmeDat connects verified college students for peer-to-peer
              transactions in a safe, trusted community. All users are verified
              with .edu email addresses, ensuring you&apos;re always dealing with
              fellow students from your campus.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-5 py-16">
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
            Ready to Get Started?
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Join the student marketplace community today.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={content.ctaLink}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary hover:bg-white/90"
            >
              {content.ctaText}
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
              <Image src="/images/logo.png" alt="GimmeDat" width={20} height={20} className="h-5 w-5 object-contain" />
              <span className="font-semibold">GimmeDat</span>
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
            &copy; {new Date().getFullYear()} GimmeDat. A student community
            project.
          </p>
        </div>
      </footer>
    </div>
  );
}
