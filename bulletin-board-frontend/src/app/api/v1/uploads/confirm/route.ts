import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────
// Mock upload confirm – returns the stored data URL
// Replace with real backend later.
// ──────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __mockAvatarUrls: Map<string, string>;
}

if (!globalThis.__mockAvatarUrls) {
  globalThis.__mockAvatarUrls = new Map();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { upload_id, position } = body;

    if (!upload_id) {
      return NextResponse.json(
        { detail: "upload_id is required", code: "validation_error" },
        { status: 422 },
      );
    }

    const pending = globalThis.__mockPendingUploads?.get(upload_id);
    const blobUrl = globalThis.__mockUploadedBlobs?.get(upload_id);

    // Clean up
    globalThis.__mockPendingUploads?.delete(upload_id);
    globalThis.__mockUploadedBlobs?.delete(upload_id);

    const isAvatar = pending?.purpose === "avatar";
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    if (isAvatar) {
      if (blobUrl) {
        globalThis.__mockAvatarUrls.set("latest", blobUrl);
      }

      return NextResponse.json({
        avatar_url: blobUrl || null,
      });
    }

    return NextResponse.json({
      photo_id: photoId,
      url: blobUrl || null,
      position: position ?? 0,
    });
  } catch {
    return NextResponse.json(
      { detail: "Invalid request", code: "parse_error" },
      { status: 400 },
    );
  }
}
