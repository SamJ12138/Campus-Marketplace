import { NextResponse } from "next/server";

// ──────────────────────────────────────────────
// Mock campuses – replace with real backend later
// ──────────────────────────────────────────────

const CAMPUSES = [
  { id: "gettysburg", name: "Gettysburg College", domain: "gettysburg.edu", slug: "gettysburg" },
];

export async function GET() {
  return NextResponse.json(CAMPUSES);
}
