import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────
// Mock /users/me – replace with real backend later
// ──────────────────────────────────────────────

const SEED_USERS: Record<string, { id: string; display_name: string; campus_slug: string; class_year: number | null }> = {
  "demo@gettysburg.edu": { id: "u1", display_name: "Demo Student", campus_slug: "gettysburg", class_year: 2026 },
  "jane@gettysburg.edu": { id: "u2", display_name: "Jane Doe", campus_slug: "gettysburg", class_year: 2025 },
};

function parseToken(authHeader: string | null): { userId: string; email: string } | null {
  if (!authHeader?.startsWith("Bearer mock_access_")) return null;
  try {
    const payload = authHeader.replace("Bearer mock_access_", "");
    const decoded = Buffer.from(payload, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const tokenData = parseToken(auth);

  if (!tokenData) {
    return NextResponse.json(
      { detail: "Not authenticated", code: "not_authenticated" },
      { status: 401 },
    );
  }

  // Look up in registered users first, then seed
  const registeredRaw = globalThis.__mockRegisteredUsers as Map<string, { id: string; display_name: string; campus_slug: string; class_year: number | null }> | undefined;
  const registered = registeredRaw?.get(tokenData.email);
  const seed = SEED_USERS[tokenData.email];
  const userData = registered || seed;

  if (!userData) {
    return NextResponse.json(
      { detail: "User not found", code: "not_found" },
      { status: 404 },
    );
  }

  // Check for uploaded avatar
  const avatarMap = (globalThis as Record<string, unknown>).__mockAvatarUrls as Map<string, string> | undefined;
  const avatarUrl = avatarMap?.get("latest") ?? null;

  return NextResponse.json({
    id: userData.id,
    email: tokenData.email,
    display_name: userData.display_name,
    avatar_url: avatarUrl,
    class_year: userData.class_year,
    bio: null,
    phone_number: null,
    role: "user",
    campus_slug: userData.campus_slug,
    campus_name: "Gettysburg College",
    email_verified: true,
    listing_count: 0,
    created_at: new Date().toISOString(),
  });
}

export async function DELETE(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const tokenData = parseToken(auth);

  if (!tokenData) {
    return NextResponse.json(
      { detail: "Not authenticated", code: "not_authenticated" },
      { status: 401 },
    );
  }

  // Remove from registered users if present
  const registeredRaw = globalThis.__mockRegisteredUsers as Map<string, unknown> | undefined;
  registeredRaw?.delete(tokenData.email);

  return NextResponse.json({ message: "Account deleted" });
}

export async function PATCH(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const tokenData = parseToken(auth);

  if (!tokenData) {
    return NextResponse.json(
      { detail: "Not authenticated", code: "not_authenticated" },
      { status: 401 },
    );
  }

  const body = await request.json();

  return NextResponse.json({
    id: tokenData.userId,
    email: tokenData.email,
    display_name: body.display_name || "Demo Student",
    avatar_url: body.avatar_url || null,
    class_year: body.class_year || null,
    bio: body.bio || null,
    phone_number: body.phone_number || null,
    role: "user",
    campus_slug: "gettysburg",
    campus_name: "Gettysburg College",
    email_verified: true,
    listing_count: 0,
    created_at: new Date().toISOString(),
  });
}
