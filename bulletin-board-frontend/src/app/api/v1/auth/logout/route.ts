import { NextResponse } from "next/server";

// ──────────────────────────────────────────────
// Mock logout – replace with real backend later
// ──────────────────────────────────────────────

export async function POST() {
  return new NextResponse(null, { status: 204 });
}
