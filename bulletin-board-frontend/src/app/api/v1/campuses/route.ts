import { NextResponse } from "next/server";

// ──────────────────────────────────────────────
// Mock campuses – replace with real backend later
// ──────────────────────────────────────────────

const CAMPUSES = [
  { id: "gettysburg", name: "Gettysburg College", domain: "gettysburg.edu", slug: "gettysburg" },
  { id: "dickinson", name: "Dickinson College", domain: "dickinson.edu", slug: "dickinson" },
  { id: "fandm", name: "Franklin & Marshall College", domain: "fandm.edu", slug: "fandm" },
  { id: "bucknell", name: "Bucknell University", domain: "bucknell.edu", slug: "bucknell" },
];

export async function GET() {
  return NextResponse.json(CAMPUSES);
}
