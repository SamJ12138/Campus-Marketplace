import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────
// Mock presigned upload – replace with real backend later
// ──────────────────────────────────────────────

// Global store for pending uploads so the confirm route can look them up
declare global {
  // eslint-disable-next-line no-var
  var __mockPendingUploads: Map<string, { purpose: string; listing_id?: string }>;
}

if (!globalThis.__mockPendingUploads) {
  globalThis.__mockPendingUploads = new Map();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { purpose, listing_id } = body;

    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    globalThis.__mockPendingUploads.set(uploadId, { purpose, listing_id });

    // Point the upload URL to our own mock blob endpoint
    const origin = request.nextUrl.origin;

    return NextResponse.json({
      upload_url: `${origin}/api/v1/uploads/blob?id=${uploadId}`,
      upload_id: uploadId,
      storage_key: `mock/${uploadId}`,
      expires_in: 3600,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid request", code: "parse_error" },
      { status: 400 },
    );
  }
}
