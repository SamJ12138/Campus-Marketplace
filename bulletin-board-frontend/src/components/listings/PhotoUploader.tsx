"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ChangeEvent,
} from "react";
import NextImage from "next/image";
import { Plus, X, ChevronUp, ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { uploadFile } from "@/lib/api/uploads";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
interface ManagedPhoto {
  id: string;
  url: string;
  thumbnail_url: string;
  position: number;
}

interface UploadingEntry {
  localId: string;
  file: File;
  previewUrl: string;
  progress: number;
  error: string | null;
  uploaded: ManagedPhoto | null;
}

interface PhotoUploaderProps {
  listingId: string | null;
  maxPhotos?: number;
  onPhotosChange: (photos: ManagedPhoto[]) => void;
  onUploadsComplete?: () => void;
  onPendingCountChange?: (count: number) => void;
  initialPhotos?: ManagedPhoto[];
}

// ----------------------------------------------------------------
// Validation helpers
// ----------------------------------------------------------------
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_DIMENSION = 8192;

function validateFileType(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return t.errors.unsupportedFormat;
  }
  return null;
}

function validateFileSize(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return t.errors.fileTooLarge.replace("{size}", "5");
  }
  return null;
}

function validateDimensions(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
        resolve(`Image dimensions must be ${MAX_DIMENSION}x${MAX_DIMENSION} or smaller`);
      }
      resolve(null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve("Unable to read image dimensions");
    };
    img.src = objectUrl;
  });
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------
export default function PhotoUploader({
  listingId,
  maxPhotos = 6,
  onPhotosChange,
  onUploadsComplete,
  onPendingCountChange,
  initialPhotos = [],
}: PhotoUploaderProps) {
  const [entries, setEntries] = useState<UploadingEntry[]>(() =>
    initialPhotos.map((p) => ({
      localId: p.id,
      file: null as unknown as File,
      previewUrl: p.thumbnail_url,
      progress: 100,
      error: null,
      uploaded: p,
    })),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploads = useRef(new Set<string>());

  // Sync completed photos back to parent
  const syncPhotos = useCallback(
    (updatedEntries: UploadingEntry[]) => {
      const completedPhotos: ManagedPhoto[] = updatedEntries
        .filter((e) => e.uploaded !== null)
        .map((e, idx) => ({
          ...e.uploaded!,
          position: idx,
        }));
      onPhotosChange(completedPhotos);
    },
    [onPhotosChange],
  );

  // Upload a single file
  const uploadSingleFile = useCallback(
    async (entry: UploadingEntry) => {
      if (activeUploads.current.has(entry.localId)) return;
      activeUploads.current.add(entry.localId);

      try {
        const result = await uploadFile(entry.file, "listing_photo", {
          listing_id: listingId ?? undefined,
          position: 0,
          onProgress: (percent) => {
            setEntries((prev) =>
              prev.map((e) =>
                e.localId === entry.localId ? { ...e, progress: percent } : e,
              ),
            );
          },
        });

        const managedPhoto: ManagedPhoto = {
          id: result.photo_id ?? entry.localId,
          url: result.url ?? entry.previewUrl,
          thumbnail_url: result.url ?? entry.previewUrl,
          position: 0,
        };

        setEntries((prev) => {
          const updated = prev.map((e) =>
            e.localId === entry.localId
              ? { ...e, progress: 100, error: null, uploaded: managedPhoto }
              : e,
          );
          syncPhotos(updated);
          return updated;
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Upload failed";
        setEntries((prev) =>
          prev.map((e) =>
            e.localId === entry.localId ? { ...e, error: message } : e,
          ),
        );
      } finally {
        activeUploads.current.delete(entry.localId);
      }
    },
    [listingId, syncPhotos],
  );

  // Handle file selection
  const handleFilesSelected = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList) return;

      const files = Array.from(fileList);
      const availableSlots = maxPhotos - entries.length;
      const filesToProcess = files.slice(0, availableSlots);

      const newEntries: UploadingEntry[] = [];

      for (const file of filesToProcess) {
        const typeErr = validateFileType(file);
        if (typeErr) {
          newEntries.push({
            localId: `${Date.now()}-${Math.random()}`,
            file,
            previewUrl: "",
            progress: 0,
            error: typeErr,
            uploaded: null,
          });
          continue;
        }

        const sizeErr = validateFileSize(file);
        if (sizeErr) {
          newEntries.push({
            localId: `${Date.now()}-${Math.random()}`,
            file,
            previewUrl: "",
            progress: 0,
            error: sizeErr,
            uploaded: null,
          });
          continue;
        }

        const dimErr = await validateDimensions(file);
        if (dimErr) {
          newEntries.push({
            localId: `${Date.now()}-${Math.random()}`,
            file,
            previewUrl: URL.createObjectURL(file),
            progress: 0,
            error: dimErr,
            uploaded: null,
          });
          continue;
        }

        newEntries.push({
          localId: `${Date.now()}-${Math.random().toString(36)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          progress: 0,
          error: null,
          uploaded: null,
        });
      }

      setEntries((prev) => {
        const updated = [...prev, ...newEntries];
        const pendingCount = updated.filter((e) => !e.error && !e.uploaded).length;
        onPendingCountChange?.(pendingCount);
        return updated;
      });

      // Start uploading valid entries (only if we have a listing ID)
      if (listingId) {
        for (const entry of newEntries) {
          if (!entry.error) {
            uploadSingleFile(entry);
          }
        }
      }

      // Reset the input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [entries.length, maxPhotos, uploadSingleFile],
  );

  // Remove a photo (with memory cleanup)
  const handleRemove = useCallback(
    (localId: string) => {
      setEntries((prev) => {
        const entryToRemove = prev.find((e) => e.localId === localId);
        // Revoke object URL to prevent memory leak
        if (entryToRemove?.previewUrl && entryToRemove.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(entryToRemove.previewUrl);
        }
        const updated = prev.filter((e) => e.localId !== localId);
        syncPhotos(updated);
        return updated;
      });
    },
    [syncPhotos],
  );

  // Reorder: move up
  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      setEntries((prev) => {
        const updated = [...prev];
        [updated[index - 1], updated[index]] = [
          updated[index],
          updated[index - 1],
        ];
        syncPhotos(updated);
        return updated;
      });
    },
    [syncPhotos],
  );

  // Reorder: move down
  const handleMoveDown = useCallback(
    (index: number) => {
      setEntries((prev) => {
        if (index >= prev.length - 1) return prev;
        const updated = [...prev];
        [updated[index], updated[index + 1]] = [
          updated[index + 1],
          updated[index],
        ];
        syncPhotos(updated);
        return updated;
      });
    },
    [syncPhotos],
  );

  // Retry a failed upload
  const handleRetry = useCallback(
    (localId: string) => {
      const entry = entries.find((e) => e.localId === localId);
      if (!entry) return;

      setEntries((prev) =>
        prev.map((e) =>
          e.localId === localId ? { ...e, error: null, progress: 0 } : e,
        ),
      );
      uploadSingleFile({ ...entry, error: null, progress: 0 });
    },
    [entries, uploadSingleFile],
  );

  // When listingId becomes available, upload all pending entries
  useEffect(() => {
    if (!listingId) return;

    // Get current entries from state (avoid stale closure)
    setEntries((currentEntries) => {
      const pending = currentEntries.filter(
        (e) => !e.error && !e.uploaded && !activeUploads.current.has(e.localId),
      );

      if (pending.length === 0) {
        onUploadsComplete?.();
        return currentEntries;
      }

      let completed = 0;
      for (const entry of pending) {
        // Start upload with the current listingId (not from stale closure)
        (async () => {
          if (activeUploads.current.has(entry.localId)) return;
          activeUploads.current.add(entry.localId);

          try {
            const result = await uploadFile(entry.file, "listing_photo", {
              listing_id: listingId,
              position: 0,
              onProgress: (percent) => {
                setEntries((prev) =>
                  prev.map((e) =>
                    e.localId === entry.localId ? { ...e, progress: percent } : e,
                  ),
                );
              },
            });

            const managedPhoto: ManagedPhoto = {
              id: result.photo_id ?? entry.localId,
              url: result.url ?? entry.previewUrl,
              thumbnail_url: result.url ?? entry.previewUrl,
              position: 0,
            };

            setEntries((prev) => {
              const updated = prev.map((e) =>
                e.localId === entry.localId
                  ? { ...e, progress: 100, error: null, uploaded: managedPhoto }
                  : e,
              );
              syncPhotos(updated);
              return updated;
            });
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Upload failed";
            setEntries((prev) =>
              prev.map((e) =>
                e.localId === entry.localId ? { ...e, error: message } : e,
              ),
            );
          } finally {
            activeUploads.current.delete(entry.localId);
            completed++;
            if (completed >= pending.length) {
              onUploadsComplete?.();
            }
          }
        })();
      }

      return currentEntries;
    });
  }, [listingId, syncPhotos, onUploadsComplete]);

  // Cleanup object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      entries.forEach((entry) => {
        if (entry.previewUrl && entry.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(entry.previewUrl);
        }
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canAddMore = entries.length < maxPhotos;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {/* Uploaded / uploading entries */}
        {entries.map((entry, index) => (
          <div
            key={entry.localId}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-lg border-2",
              entry.error
                ? "border-red-300 bg-red-50"
                : "border-slate-200 bg-slate-50",
            )}
          >
            {/* Thumbnail */}
            {entry.previewUrl ? (
              <NextImage
                src={entry.previewUrl}
                alt={`Photo ${index + 1}`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
            )}

            {/* Progress overlay */}
            {!entry.uploaded && !entry.error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
                <span className="mt-1 text-xs font-medium text-white">
                  {entry.progress}%
                </span>
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 h-1 w-full bg-black/20">
                  <div
                    className="h-full bg-blue-500 transition-all duration-200"
                    style={{ width: `${entry.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error overlay */}
            {entry.error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/60 p-1">
                <AlertCircle className="h-5 w-5 text-white" />
                <p className="mt-0.5 text-center text-[10px] leading-tight text-white">
                  {entry.error}
                </p>
                {entry.file && (
                  <button
                    type="button"
                    onClick={() => handleRetry(entry.localId)}
                    className="mt-1 rounded bg-white/90 px-2 py-0.5 text-[10px] font-medium text-red-700 hover:bg-white"
                  >
                    {t.common.retry}
                  </button>
                )}
              </div>
            )}

            {/* Remove button */}
            <button
              type="button"
              onClick={() => handleRemove(entry.localId)}
              aria-label={`Remove photo ${index + 1}`}
              className={cn(
                "absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white",
                "opacity-0 transition-opacity group-hover:opacity-100",
                "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
              )}
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Reorder buttons */}
            {entries.length > 1 && entry.uploaded && (
              <div className="absolute bottom-1 left-1 flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  aria-label="Move photo up"
                  className={cn(
                    "rounded bg-black/60 p-0.5 text-white",
                    "disabled:opacity-30",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                  )}
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === entries.length - 1}
                  aria-label="Move photo down"
                  className={cn(
                    "rounded bg-black/60 p-0.5 text-white",
                    "disabled:opacity-30",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                  )}
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Position indicator */}
            {index === 0 && entry.uploaded && (
              <span className="absolute left-1 top-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                Cover
              </span>
            )}
          </div>
        ))}

        {/* Add photo slot */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex aspect-square flex-col items-center justify-center rounded-lg",
              "border-2 border-dashed border-slate-300 bg-white",
              "text-slate-400 transition-colors",
              "hover:border-blue-400 hover:bg-blue-50 hover:text-blue-500",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            )}
          >
            <Plus className="h-6 w-6" />
            <span className="mt-1 text-xs font-medium">Add</span>
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFilesSelected}
        className="hidden"
        aria-label="Upload photos"
      />

      {/* Helper text */}
      <p className="text-xs text-slate-500">
        {t.listings.photosHelp} ({entries.length}/{maxPhotos})
      </p>
    </div>
  );
}
