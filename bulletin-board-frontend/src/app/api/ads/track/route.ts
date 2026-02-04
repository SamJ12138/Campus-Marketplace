import { NextRequest, NextResponse } from "next/server";

// Stub endpoint for ad impression / click tracking.
// For MVP this simply acknowledges the event.
// Replace with real analytics persistence later.

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.adId !== "string" ||
    typeof body.event !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 },
    );
  }

  // In production, persist to analytics store here
  return NextResponse.json({ ok: true });
}
