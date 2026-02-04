import { api } from "./client";

// ---- Types ----

type UploadPurpose = "listing_photo" | "avatar";

interface PresignedUploadResponse {
  upload_url: string;
  upload_id: string;
  storage_key: string;
  expires_in: number;
}

interface UploadConfirmResponse {
  photo_id?: string;
  url?: string;
  avatar_url?: string;
}

interface UploadFileResult extends UploadConfirmResponse {}

// ---- API functions ----

export async function requestPresignedUpload(
  purpose: UploadPurpose,
  content_type: string,
  file_size: number,
  listing_id?: string,
): Promise<PresignedUploadResponse> {
  return api.post<PresignedUploadResponse>("/api/v1/uploads/presign", {
    purpose,
    content_type,
    file_size,
    listing_id,
  });
}

export async function confirmUpload(
  upload_id: string,
  position?: number,
): Promise<UploadConfirmResponse> {
  return api.post<UploadConfirmResponse>("/api/v1/uploads/confirm", {
    upload_id,
    position,
  });
}

/**
 * High-level helper: takes a File object, obtains a presigned URL,
 * uploads the file directly to storage via PUT, confirms the upload
 * with the backend, and returns the result.
 *
 * An optional `onProgress` callback receives values from 0 to 100
 * indicating upload percentage. Progress tracking uses XMLHttpRequest
 * for upload events; when unavailable (e.g. Node/SSR), the callback
 * fires once at 100 after the upload completes.
 */
export async function uploadFile(
  file: File,
  purpose: UploadPurpose,
  options: {
    listing_id?: string;
    position?: number;
    onProgress?: (percent: number) => void;
  } = {},
): Promise<UploadFileResult> {
  const { listing_id, position, onProgress } = options;

  // Step 1: Get presigned URL from backend
  const presigned = await requestPresignedUpload(
    purpose,
    file.type,
    file.size,
    listing_id,
  );

  // Step 2: Upload file directly to the presigned URL
  if (typeof XMLHttpRequest !== "undefined" && onProgress) {
    // Browser environment: use XHR for progress events
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presigned.upload_url, true);
      xhr.setRequestHeader("Content-Type", file.type);

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload network error"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload aborted"));
      });

      xhr.send(file);
    });
  } else {
    // Fallback: use fetch (no granular progress)
    const putRes = await fetch(presigned.upload_url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!putRes.ok) {
      throw new Error(`Upload failed with status ${putRes.status}`);
    }

    onProgress?.(100);
  }

  // Step 3: Confirm upload with backend
  const result = await confirmUpload(presigned.upload_id, position);
  return result;
}
