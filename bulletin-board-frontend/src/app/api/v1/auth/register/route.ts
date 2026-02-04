import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────
// Mock register – replace with real backend later
// ──────────────────────────────────────────────

// Global store so login route can see newly registered users
declare global {
  // eslint-disable-next-line no-var
  var __mockRegisteredUsers: Map<string, { password: string; id: string; display_name: string; campus_slug: string; class_year: number | null }>;
}

if (!globalThis.__mockRegisteredUsers) {
  globalThis.__mockRegisteredUsers = new Map();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, display_name, campus_slug, class_year } = body;

    if (!email || !password || !display_name || !campus_slug) {
      return NextResponse.json(
        { detail: "All required fields must be provided", code: "validation_error" },
        { status: 422 },
      );
    }

    if (!email.endsWith(".edu")) {
      return NextResponse.json(
        { detail: "Only .edu email addresses are allowed", code: "invalid_email" },
        { status: 422 },
      );
    }

    if (globalThis.__mockRegisteredUsers.has(email)) {
      return NextResponse.json(
        { detail: "An account with this email already exists", code: "duplicate_email" },
        { status: 409 },
      );
    }

    const userId = `u_${Date.now()}`;

    globalThis.__mockRegisteredUsers.set(email, {
      password,
      id: userId,
      display_name,
      campus_slug,
      class_year: class_year ?? null,
    });

    return NextResponse.json({
      message: "Registration successful. You can now sign in.",
      user_id: userId,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid request body", code: "parse_error" },
      { status: 400 },
    );
  }
}
