import { NextRequest, NextResponse } from "next/server";

// ──────────────────────────────────────────────
// Mock blob storage – accepts PUT uploads and stores
// as base64 data URLs in memory.
// Replace with real S3/MinIO in production.
// ──────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __mockUploadedBlobs: Map<string, string>;
}

if (!globalThis.__mockUploadedBlobs) {
  globalThis.__mockUploadedBlobs = new Map();
}

export async function PUT(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ detail: "Missing upload id" }, { status: 400 });
  }

  try {
    const contentType = request.headers.get("content-type") || "image/jpeg";
    const buffer = await request.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    globalThis.__mockUploadedBlobs.set(id, dataUrl);

    return new NextResponse(null, { status: 200 });
  } catch {
    return NextResponse.json({ detail: "Upload failed" }, { status: 500 });
  }
}
