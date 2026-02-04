import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────
// Mock token refresh – replace with real backend later
// ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token || !refresh_token.startsWith("mock_refresh_")) {
      return NextResponse.json(
        { detail: "Invalid refresh token", code: "invalid_token" },
        { status: 401 },
      );
    }

    // Extract the payload and reissue
    const payload = refresh_token.replace("mock_refresh_", "");

    return NextResponse.json({
      access_token: `mock_access_${payload}`,
      refresh_token: `mock_refresh_${payload}`,
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
