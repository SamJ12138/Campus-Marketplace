import { NextResponse } from "next/server";

// ──────────────────────────────────────────────
// Mock messages/threads – replace with real backend later
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

export async function POST() {
  return NextResponse.json({
    thread: { id: "t_mock", unread_count: 0 },
    message: { id: "m_mock", content: "Mock message", created_at: new Date().toISOString() },
  });
}
