import { NextResponse } from "next/server";

// ──────────────────────────────────────────────
// Mock favorites – replace with real backend later
// ──────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    items: [],
    pagination: {
      page: 1,
      per_page: 20,
      total_items: 0,
      total_pages: 0,
      has_next: false,
      has_prev: false,
    },
  });
}
