import { NextRequest, NextResponse } from "next/server";
import type { Category } from "@/lib/types";

// ──────────────────────────────────────────────
// Seed data – replace with backend API calls later
// ──────────────────────────────────────────────

const SEED_CATEGORIES: Category[] = [
  // ── Services ──
  { id: "c1", name: "Tutoring", slug: "tutoring", listing_type: "service", description: "Academic tutoring and study help", icon: "📚", sort_order: 1 },
  { id: "c2", name: "Photography", slug: "photography", listing_type: "service", description: "Photo and video services", icon: "📸", sort_order: 2 },
  { id: "c3", name: "Hair & Beauty", slug: "hair-beauty", listing_type: "service", description: "Hair styling, braids, and beauty services", icon: "💇", sort_order: 3 },
  { id: "c6", name: "Rides", slug: "rides", listing_type: "service", description: "Ride shares and carpooling", icon: "🚗", sort_order: 4 },
  { id: "c7", name: "Music Lessons", slug: "music", listing_type: "service", description: "Instrument lessons and music tutoring", icon: "🎵", sort_order: 5 },
  { id: "c9", name: "Tech Help & Repair", slug: "tech-help", listing_type: "service", description: "Computer repair, setup, and tech support", icon: "🔧", sort_order: 6 },
  { id: "c10", name: "Cleaning", slug: "cleaning", listing_type: "service", description: "Room, apartment, or move-out cleaning", icon: "🧹", sort_order: 7 },
  { id: "c11", name: "Moving & Hauling", slug: "moving", listing_type: "service", description: "Help moving furniture and heavy items", icon: "📦", sort_order: 8 },
  { id: "c12", name: "Event Help", slug: "event-help", listing_type: "service", description: "Event planning, setup, and staffing", icon: "🎉", sort_order: 9 },
  { id: "c13", name: "Pet Care", slug: "pet-care", listing_type: "service", description: "Pet sitting, dog walking, and grooming", icon: "🐾", sort_order: 10 },
  { id: "c14", name: "Fitness & Training", slug: "fitness", listing_type: "service", description: "Personal training, yoga, and fitness coaching", icon: "💪", sort_order: 11 },
  { id: "c15", name: "Art & Design", slug: "art-design", listing_type: "service", description: "Graphic design, illustration, and commissions", icon: "🎨", sort_order: 12 },
  { id: "c16", name: "Writing & Editing", slug: "writing", listing_type: "service", description: "Proofreading, editing, and resume help", icon: "✍️", sort_order: 13 },
  { id: "c17", name: "Language & Translation", slug: "language", listing_type: "service", description: "Language tutoring and translation services", icon: "🌍", sort_order: 14 },
  { id: "c18", name: "Cooking & Baking", slug: "cooking", listing_type: "service", description: "Meal prep, baked goods, and catering", icon: "🍳", sort_order: 15 },
  { id: "c19", name: "Errands & Tasks", slug: "errands", listing_type: "service", description: "Grocery runs, pickups, and odd jobs", icon: "✅", sort_order: 16 },
  { id: "c50", name: "Other", slug: "other", listing_type: "service", description: "Services that don't fit other categories", icon: "📌", sort_order: 99 },

  // ── Items ──
  { id: "c4", name: "Textbooks", slug: "textbooks", listing_type: "item", description: "Course textbooks and study materials", icon: "📖", sort_order: 1 },
  { id: "c5", name: "Electronics", slug: "electronics", listing_type: "item", description: "Laptops, calculators, and gadgets", icon: "💻", sort_order: 2 },
  { id: "c8", name: "Furniture", slug: "furniture", listing_type: "item", description: "Dorm and apartment furniture", icon: "🪑", sort_order: 3 },
  { id: "c20", name: "Clothing & Accessories", slug: "clothing", listing_type: "item", description: "Clothes, shoes, bags, and accessories", icon: "👕", sort_order: 4 },
  { id: "c21", name: "Appliances", slug: "appliances", listing_type: "item", description: "Mini fridges, microwaves, and dorm appliances", icon: "🔌", sort_order: 5 },
  { id: "c22", name: "Sports & Outdoors", slug: "sports", listing_type: "item", description: "Sports gear, bikes, and outdoor equipment", icon: "⚽", sort_order: 6 },
  { id: "c23", name: "Tickets & Events", slug: "tickets", listing_type: "item", description: "Concert, game, and event tickets", icon: "🎟️", sort_order: 7 },
  { id: "c24", name: "Dorm Essentials", slug: "dorm-essentials", listing_type: "item", description: "Bedding, storage, lighting, and decor", icon: "🛏️", sort_order: 8 },
  { id: "c25", name: "Musical Instruments", slug: "instruments", listing_type: "item", description: "Guitars, keyboards, and other instruments", icon: "🎸", sort_order: 9 },
  { id: "c26", name: "Art & Craft Supplies", slug: "art-supplies", listing_type: "item", description: "Paints, canvas, and crafting materials", icon: "🖌️", sort_order: 10 },
  { id: "c27", name: "Games & Entertainment", slug: "games", listing_type: "item", description: "Video games, board games, and consoles", icon: "🎮", sort_order: 11 },
  { id: "c28", name: "Kitchen & Dining", slug: "kitchen", listing_type: "item", description: "Cookware, dishes, and kitchen gadgets", icon: "🍽️", sort_order: 12 },
  { id: "c29", name: "School Supplies", slug: "school-supplies", listing_type: "item", description: "Notebooks, pens, backpacks, and planners", icon: "📝", sort_order: 13 },
  { id: "c30", name: "Health & Personal Care", slug: "health-care", listing_type: "item", description: "Fitness accessories, personal care items", icon: "🧴", sort_order: 14 },
  { id: "c31", name: "Books & Media", slug: "books-media", listing_type: "item", description: "Non-textbook books, DVDs, and media", icon: "📀", sort_order: 15 },
  { id: "c51", name: "Other", slug: "other", listing_type: "item", description: "Items that don't fit other categories", icon: "📌", sort_order: 99 },
];

// ──────────────────────────────────────────────
// GET /api/v1/categories
// ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const listingType = searchParams.get("listing_type");

  let categories = [...SEED_CATEGORIES];

  if (listingType) {
    categories = categories.filter((c) => c.listing_type === listingType);
  }

  return NextResponse.json(categories);
}
