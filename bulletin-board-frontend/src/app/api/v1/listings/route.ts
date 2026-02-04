import { NextRequest, NextResponse } from "next/server";
import type { Listing, PaginatedResponse } from "@/lib/types";

// ──────────────────────────────────────────────
// Seed data – replace with backend API calls later
// ──────────────────────────────────────────────

const SEED_LISTINGS: Listing[] = [
  {
    id: "1",
    type: "service",
    title: "Calculus I & II Tutoring",
    description:
      "Patient and thorough math tutoring from a senior math major. I break down complex concepts into simple steps. In-person at the library or via Zoom. Midterm prep sessions available.",
    price_hint: "$25/hr",
    category: { id: "c1", name: "Tutoring", slug: "tutoring" },
    location_type: "on_campus",
    location_hint: "Musselman Library",
    availability: "Weekday evenings, weekends",
    contact_preference: "in_app",
    is_regulated: false,
    status: "active",
    view_count: 87,
    photos: [],
    user: {
      id: "u1",
      display_name: "Maya Rodriguez",
      avatar_url: null,
      class_year: 2027,
    },
    is_favorited: false,
    is_own: false,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 28 * 86400000).toISOString(),
  },
  {
    id: "2",
    type: "service",
    title: "Portrait & Event Photography",
    description:
      "Capturing your college memories with a professional touch. Graduation photos, club events, Greek life formals, and candid campus shots. Quick turnaround — edited photos within 48 hours.",
    price_hint: "$75/session",
    category: { id: "c2", name: "Photography", slug: "photography" },
    location_type: "on_campus",
    location_hint: "Anywhere on campus",
    availability: "Flexible schedule",
    contact_preference: "in_app",
    is_regulated: false,
    status: "active",
    view_count: 134,
    photos: [],
    user: {
      id: "u2",
      display_name: "James Chen",
      avatar_url: null,
      class_year: 2026,
    },
    is_favorited: true,
    is_own: false,
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    expires_at: new Date(Date.now() + 28 * 86400000).toISOString(),
  },
  {
    id: "3",
    type: "service",
    title: "Box Braids & Protective Styles",
    description:
      "Specializing in box braids, knotless braids, twists, and cornrows. Quality products that protect your natural hair. Each style includes a consultation. Book at least 3 days ahead.",
    price_hint: "$80–$150",
    category: { id: "c3", name: "Hair & Beauty", slug: "hair-beauty" },
    location_type: "on_campus",
    location_hint: "Rice Hall 204",
    availability: "Weekends, some weekday evenings",
    contact_preference: "in_app",
    is_regulated: false,
    status: "active",
    view_count: 203,
    photos: [],
    user: {
      id: "u3",
      display_name: "Aisha Patel",
      avatar_url: null,
      class_year: 2028,
    },
    is_favorited: false,
    is_own: false,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 28 * 86400000).toISOString(),
  },
  {
    id: "4",
    type: "item",
    title: "Organic Chemistry 8th Ed. — Wade",
    description:
      "Lightly used, no highlighting. Includes study guide. Retail $220, selling because I finished the course. Can meet anywhere on campus.",
    price_hint: "$45",
    category: { id: "c4", name: "Textbooks", slug: "textbooks" },
    location_type: "on_campus",
    location_hint: "CUB lobby",
    availability: null,
    contact_preference: "in_app",
    is_regulated: false,
    status: "active",
    view_count: 56,
    photos: [],
    user: {
      id: "u4",
      display_name: "Tyler Brooks",
      avatar_url: null,
      class_year: 2026,
    },
    is_favorited: false,
    is_own: false,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 28 * 86400000).toISOString(),
  },
  {
    id: "5",
    type: "item",
    title: "MacBook Air M2 — Space Gray",
    description:
      "2023 MacBook Air M2 in excellent condition. 8GB RAM, 256GB SSD. Battery cycle count under 100. Includes original charger and protective case. Upgrading to Pro.",
    price_hint: "$750",
    category: { id: "c5", name: "Electronics", slug: "electronics" },
    location_type: "on_campus",
    location_hint: "Science Center",
    availability: null,
    contact_preference: "in_app",
    is_regulated: false,
    status: "active",
    view_count: 312,
    photos: [],
    user: {
      id: "u5",
      display_name: "Sophia Kim",
      avatar_url: null,
      class_year: 2027,
    },
    is_favorited: true,
    is_own: false,
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    expires_at: new Date(Date.now() + 28 * 86400000).toISOString(),
  },
  {
    id: "6",
    type: "service",
    title: "Weekend Rides to Baltimore / DC",
    description:
      "Driving to Baltimore or DC most weekends. Usually leave Friday afternoon, return Sunday evening. Gas split appreciated but not required for first ride.",
    price_hint: "$15 gas split",
    category: { id: "c6", name: "Rides", slug: "rides" },
    location_type: "off_campus",
    location_hint: "Gettysburg → Baltimore/DC",
    availability: "Most weekends",
    contact_preference: "in_app",
    is_regulated: false,
    status: "active",
    view_count: 178,
    photos: [],
    user: {
      id: "u6",
      display_name: "David Okafor",
      avatar_url: null,
      class_year: 2025,
    },
    is_favorited: false,
    is_own: false,
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
    expires_at: new Date(Date.now() + 28 * 86400000).toISOString(),
  },
  {
    id: "7",
    type: "service",
    title: "Guitar Lessons for Beginners",
    description:
      "Learn acoustic guitar from scratch! 8 years playing, 3 years teaching. Basic chords, strumming, your favorite songs. Spare guitar provided if you need one.",
    price_hint: "$20/lesson",
    category: { id: "c7", name: "Music Lessons", slug: "music" },
    location_type: "on_campus",
    location_hint: "Schmucker Hall",
    availability: "Tue/Thu afternoons",
    contact_preference: "in_app",
    is_regulated: false,
    status: "active",
    view_count: 64,
    photos: [],
    user: {
      id: "u7",
      display_name: "Emma Walsh",
      avatar_url: null,
      class_year: 2028,
    },
    is_favorited: false,
    is_own: false,
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 28 * 86400000).toISOString(),
  },
  {
    id: "8",
    type: "item",
    title: "IKEA Desk + Chair Combo",
    description:
      "White MALM desk and MARKUS office chair. Great condition, small corner scratch. Perfect for dorm or apartment. Must pick up.",
    price_hint: "$60 both",
    category: { id: "c8", name: "Furniture", slug: "furniture" },
    location_type: "off_campus",
    location_hint: "Lincoln Ave apts",
    availability: null,
    contact_preference: "in_app",
    is_regulated: false,
    status: "active",
    view_count: 91,
    photos: [],
    user: {
      id: "u8",
      display_name: "Marcus Liu",
      avatar_url: null,
      class_year: 2026,
    },
    is_favorited: false,
    is_own: false,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 28 * 86400000).toISOString(),
  },
  {
    id: "9",
    type: "service",
    title: "Spanish Conversation Practice",
    description:
      "Native speaker offering casual conversation sessions. Great for intermediate/advanced courses, improving fluency and pronunciation in a relaxed setting.",
    price_hint: "$15/hr",
    category: { id: "c1", name: "Tutoring", slug: "tutoring" },
    location_type: "on_campus",
    location_hint: "Library or Servo",
    availability: "Flexible",
    contact_preference: "in_app",
    is_regulated: false,
    status: "active",
    view_count: 42,
    photos: [],
    user: {
      id: "u3",
      display_name: "Aisha Patel",
      avatar_url: null,
      class_year: 2028,
    },
    is_favorited: false,
    is_own: false,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 28 * 86400000).toISOString(),
  },
  {
    id: "10",
    type: "item",
    title: "TI-84 Plus CE Calculator",
    description:
      "Graphing calculator in perfect condition. Fresh batteries, all standard programs loaded. Selling after finishing math-heavy courses.",
    price_hint: "$55",
    category: { id: "c5", name: "Electronics", slug: "electronics" },
    location_type: "on_campus",
    location_hint: "CUB",
    availability: null,
    contact_preference: "in_app",
    is_regulated: false,
    status: "active",
    view_count: 73,
    photos: [],
    user: {
      id: "u6",
      display_name: "David Okafor",
      avatar_url: null,
      class_year: 2025,
    },
    is_favorited: false,
    is_own: false,
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    expires_at: new Date(Date.now() + 28 * 86400000).toISOString(),
  },
];

// ──────────────────────────────────────────────
// GET /api/v1/listings
// ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");
  const categorySlug = searchParams.get("category_slug");
  const locationType = searchParams.get("location_type");
  const search = searchParams.get("search") || searchParams.get("q");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const perPage = parseInt(searchParams.get("per_page") ?? "20", 10);

  let items = [...SEED_LISTINGS];

  // Apply filters
  if (type) {
    items = items.filter((l) => l.type === type);
  }
  if (categorySlug) {
    items = items.filter((l) => l.category.slug === categorySlug);
  }
  if (locationType) {
    items = items.filter((l) => l.location_type === locationType);
  }
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.category.name.toLowerCase().includes(q),
    );
  }

  // Pagination
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const start = (page - 1) * perPage;
  const paginatedItems = items.slice(start, start + perPage);

  const response: PaginatedResponse<Listing> = {
    items: paginatedItems,
    pagination: {
      page,
      per_page: perPage,
      total_items: totalItems,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  };

  return NextResponse.json(response);
}

// ──────────────────────────────────────────────
// POST /api/v1/listings – create a new listing
// ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newId = `listing_${Date.now()}`;

    const newListing: Listing = {
      id: newId,
      type: body.type ?? "item",
      title: body.title ?? "Untitled",
      description: body.description ?? "",
      price_hint: body.price_hint ?? null,
      category: { id: body.category_id ?? "c51", name: "Other", slug: "other" },
      location_type: body.location_type ?? "on_campus",
      location_hint: body.location_hint ?? null,
      availability: body.availability ?? null,
      contact_preference: body.contact_preference ?? "in_app",
      is_regulated: body.is_regulated ?? false,
      status: "active",
      view_count: 0,
      photos: [],
      user: {
        id: "u1",
        display_name: "Demo Student",
        avatar_url: null,
        class_year: 2026,
      },
      is_favorited: false,
      is_own: true,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    };

    return NextResponse.json(newListing, { status: 201 });
  } catch {
    return NextResponse.json(
      { detail: "Invalid request body", code: "parse_error" },
      { status: 400 },
    );
  }
}
