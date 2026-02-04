import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────
// Mock login – replace with real backend later
// ──────────────────────────────────────────────

// Simple in-memory user store (shared with register route via module-level Map)
// In production this is a database lookup.
const SEED_USERS: Record<string, { password: string; id: string; display_name: string; campus_slug: string; class_year: number | null }> = {
  "demo@gettysburg.edu": { password: "password123", id: "u1", display_name: "Demo Student", campus_slug: "gettysburg", class_year: 2026 },
  "jane@gettysburg.edu": { password: "password123", id: "u2", display_name: "Jane Doe", campus_slug: "gettysburg", class_year: 2025 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { detail: "Email and password are required", code: "validation_error" },
        { status: 422 },
      );
    }

    // Check registered users (from global store) first, then seed users
    const registeredRaw = globalThis.__mockRegisteredUsers as Map<string, typeof SEED_USERS[string]> | undefined;
    const registered = registeredRaw?.get(email);
    const user = registered || SEED_USERS[email];

    if (!user || user.password !== password) {
      return NextResponse.json(
        { detail: "Invalid email or password", code: "invalid_credentials" },
        { status: 401 },
      );
    }

    // Return mock tokens
    const tokenPayload = JSON.stringify({ userId: user.id, email });
    const fakeToken = Buffer.from(tokenPayload).toString("base64");

    return NextResponse.json({
      access_token: `mock_access_${fakeToken}`,
      refresh_token: `mock_refresh_${fakeToken}`,
      token_type: "bearer",
      expires_in: 3600,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid request body", code: "parse_error" },
      { status: 400 },
    );
  }
}
