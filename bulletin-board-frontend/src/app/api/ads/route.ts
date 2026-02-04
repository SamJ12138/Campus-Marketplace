import { NextRequest, NextResponse } from "next/server";
import type { Ad } from "@/lib/types/ads";

// ──────────────────────────────────────────────
// Seed data – replace with database queries later
// ──────────────────────────────────────────────

const SEED_ADS: Ad[] = [
  {
    id: "ad-001",
    campusId: "global",
    type: "INTERNAL_DETAIL",
    title: "Welcome Week Essentials",
    subtitle:
      "Everything you need for a great semester start — dorm gear, textbooks, and more from fellow students.",
    ctaText: "Explore now",
    image: {
      src: "https://images.unsplash.com/photo-1523050854058-8df90110c476?w=800&h=500&fit=crop",
      alt: "Students walking on a sunny campus quad",
    },
    body: "Check out the hottest listings from students who've been there. From mini-fridges to graphing calculators, find everything you need at student-friendly prices.\n\nBrowse the Items tab to get started, or post your own listing to help a fellow Bullet!",
    priority: 100,
    startsAt: "2025-01-01T00:00:00Z",
    endsAt: "2026-12-31T23:59:59Z",
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ad-002",
    campusId: "global",
    type: "EXTERNAL_LINK",
    title: "Bullet Bean Coffee Co.",
    subtitle:
      "10% off all drinks for Gettysburg students. Show your campus ID at checkout.",
    ctaText: "Visit Bullet Bean",
    image: {
      src: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=500&fit=crop",
      alt: "Latte art in a ceramic cup on a wooden table",
    },
    externalUrl: "https://example.com/bullet-bean",
    theme: { accent: "#7C3AED" },
    body: "Bullet Bean Coffee Co. is the go-to spot for Gettysburg College students. Located just steps from campus, we serve locally-roasted specialty coffee, fresh pastries, and grab-and-go lunch options.\n\nShow your student ID for 10% off any drink, any time.",
    priority: 90,
    startsAt: "2025-06-01T00:00:00Z",
    endsAt: "2026-12-31T23:59:59Z",
    createdAt: "2025-06-01T00:00:00Z",
  },
  {
    id: "ad-003",
    campusId: "global",
    type: "COUPON",
    title: "Campus Cuts — Free First Haircut",
    subtitle:
      "New customers get their first haircut free. Use coupon code below.",
    ctaText: "Get coupon",
    image: {
      src: "https://images.unsplash.com/photo-1585747860019-8043a94c590f?w=800&h=500&fit=crop",
      alt: "Barber shop interior with vintage chairs",
    },
    body: "Campus Cuts has been the student-favorite barbershop since 2019. We specialize in modern fades, classic cuts, and beard trims.\n\nPresent your coupon code at the front desk to redeem your free first haircut.",
    couponCode: "FIRSTFREE2025",
    priority: 80,
    startsAt: "2025-09-01T00:00:00Z",
    endsAt: "2026-12-31T23:59:59Z",
    createdAt: "2025-09-01T00:00:00Z",
  },
  {
    id: "ad-004",
    campusId: "global",
    type: "EVENT",
    title: "Spring Fling Market",
    subtitle:
      "Buy, sell, and swap textbooks, dorm supplies, and more at the annual student market.",
    ctaText: "View details",
    image: {
      src: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=500&fit=crop",
      alt: "Outdoor market with tents and people browsing",
    },
    body: "Join us for the biggest student market of the year! Whether you're clearing out before summer or stocking up for next semester, Spring Fling Market is the place to be.\n\nVendor tables are free for registered students. Food trucks on-site.",
    event: {
      startAt: "2026-04-12T10:00:00Z",
      location: "Stine Lake Lawn, Gettysburg College",
    },
    priority: 85,
    startsAt: "2025-03-01T00:00:00Z",
    endsAt: "2026-04-13T00:00:00Z",
    createdAt: "2025-03-01T00:00:00Z",
  },
  {
    id: "ad-005",
    campusId: "global",
    type: "INTERNAL_DETAIL",
    title: "Peer Tutoring Services",
    subtitle:
      "Find or offer tutoring help across all departments — free through student exchange.",
    ctaText: "Learn more",
    image: {
      src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=500&fit=crop",
      alt: "Students studying together at a library table",
    },
    body: "Campus Board makes it easy to find peer tutors for any subject. Post a tutoring service listing or browse existing offers from upperclassmen and grad students.\n\nAll tutoring exchanges happen between students — no fees charged through the platform.",
    priority: 70,
    startsAt: "2025-01-15T00:00:00Z",
    endsAt: "2026-12-31T23:59:59Z",
    createdAt: "2025-01-15T00:00:00Z",
  },
];

// ──────────────────────────────────────────────
// GET /api/ads
// ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const campusId = searchParams.get("campusId");
  const limit = parseInt(searchParams.get("limit") ?? "10", 10);

  const now = new Date();

  let ads = SEED_ADS
    // Filter out expired ads
    .filter((ad) => {
      if (ad.endsAt && new Date(ad.endsAt) < now) return false;
      if (ad.startsAt && new Date(ad.startsAt) > now) return false;
      return true;
    })
    // Campus scoping: show ads matching the campus OR global
    .filter((ad) => {
      if (!campusId) return ad.campusId === "global";
      return ad.campusId === campusId || ad.campusId === "global";
    })
    // Sort by priority desc, then createdAt desc
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, limit);

  return NextResponse.json(ads);
}
