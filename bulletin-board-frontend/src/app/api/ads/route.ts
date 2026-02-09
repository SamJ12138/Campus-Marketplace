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
    title: "Welcome to GimmeDat!",
    subtitle:
      "Your campus marketplace built by Gettysburg students, for Gettysburg students. Buy, sell, and trade textbooks, services, and more with people you trust.",
    ctaText: "Start Browsing",
    ctaUrl: "/feed",
    image: {
      src: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=500&fit=crop",
      alt: "Gettysburg College campus with students walking",
    },
    theme: { accent: "#8b5cf6" },
    body: "GimmeDat was built because we noticed students needed a safe, easy way to exchange goods and services on campus. No more sketchy Facebook posts or lost flyers. Everything here is verified through your .edu email so you know you are dealing with real Gettysburg students.",
    priority: 100,
    startsAt: "2025-01-01T00:00:00Z",
    endsAt: "2027-12-31T23:59:59Z",
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ad-002",
    campusId: "global",
    type: "INTERNAL_DETAIL",
    title: "We Built This For You",
    subtitle:
      "GimmeDat started as a class project and grew into something real. We wanted to solve the problem of students not having a trusted place to trade on campus.",
    ctaText: "Learn More",
    ctaUrl: "/how-it-works",
    image: {
      src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=500&fit=crop",
      alt: "Students collaborating at a table",
    },
    theme: { accent: "#ec4899" },
    body: "Every semester, students waste time trying to sell textbooks, find tutors, or get rides home. We built GimmeDat to make all of that instant and safe. This is a student-run platform and your support keeps it going.",
    priority: 95,
    startsAt: "2025-01-01T00:00:00Z",
    endsAt: "2027-12-31T23:59:59Z",
    createdAt: "2025-01-02T00:00:00Z",
  },
  {
    id: "ad-003",
    campusId: "global",
    type: "INTERNAL_DETAIL",
    title: "Your Feedback Shapes GimmeDat",
    subtitle:
      "Found a bug? Have an idea? We are actively building and your feedback directly impacts what we work on next.",
    ctaText: "Give Feedback",
    ctaUrl: "action:feedback",
    image: {
      src: "https://images.unsplash.com/photo-1531545514256-b1400bc00f31?w=800&h=500&fit=crop",
      alt: "Person typing feedback on a laptop",
    },
    theme: { accent: "#f59e0b" },
    body: "This platform is in early access and we ship updates every week. Tell us what is working, what is broken, and what you wish existed. The best features came from student suggestions.",
    priority: 90,
    startsAt: "2025-01-01T00:00:00Z",
    endsAt: "2027-12-31T23:59:59Z",
    createdAt: "2025-01-03T00:00:00Z",
  },
  {
    id: "ad-004",
    campusId: "global",
    type: "INTERNAL_DETAIL",
    title: "How to Share Feedback",
    subtitle:
      "Tap your profile icon, go to Settings, and hit Send Feedback. You can also email us directly or DM us on Instagram. Every message gets read.",
    ctaText: "Open Settings",
    ctaUrl: "/profile/settings",
    image: {
      src: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&h=500&fit=crop",
      alt: "Hand holding phone showing a feedback form",
    },
    theme: { accent: "#10b981" },
    body: "Three easy ways to reach us:\n\n1. In-app: Profile > Settings > Send Feedback\n2. Email: gimmedat@gettysburg.edu\n3. Instagram DM: @gimmedatapp\n\nWhether it is a quick thought or a detailed suggestion, we want to hear it. Screenshots of bugs are especially helpful!",
    priority: 85,
    startsAt: "2025-01-01T00:00:00Z",
    endsAt: "2027-12-31T23:59:59Z",
    createdAt: "2025-01-04T00:00:00Z",
  },
  {
    id: "ad-005",
    campusId: "global",
    type: "INTERNAL_DETAIL",
    title: "Help Us Grow the Community",
    subtitle:
      "The more students who join, the better GimmeDat gets for everyone. Share the word with your friends, roommates, and study groups.",
    ctaText: "Invite Friends",
    ctaUrl: "action:share",
    image: {
      src: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=500&fit=crop",
      alt: "Group of college friends smiling together",
    },
    theme: { accent: "#6366f1" },
    body: "GimmeDat only works when there are enough people listing and buying. Right now we are growing fast but we need your help. Share the link with your group chats, mention it in class, or just tell your roommate.\n\nEvery new user makes the marketplace more useful for you too.",
    priority: 80,
    startsAt: "2025-01-01T00:00:00Z",
    endsAt: "2027-12-31T23:59:59Z",
    createdAt: "2025-01-05T00:00:00Z",
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

  const ads = SEED_ADS
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
