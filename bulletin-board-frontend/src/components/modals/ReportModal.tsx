"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { useUIStore } from "@/lib/stores/ui";
import { createReport } from "@/lib/api/reports";
import type { ReportReason, ReportTargetType } from "@/lib/types";
import { Button } from "@/components/ui/Button";

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: t.reports.reasonSpam },
  { value: "inappropriate", label: t.reports.reasonInappropriate },
  { value: "prohibited", label: t.reports.reasonProhibited },
  { value: "scam", label: t.reports.reasonScam },
  { value: "harassment", label: t.reports.reasonHarassment },
  { value: "other", label: t.reports.reasonOther },
];

const MAX_DESCRIPTION_LENGTH = 2000;

export function ReportModal() {
  const { reportModal, closeReportModal } = useUIStore();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reportModal.open) {
      setReason(null);
      setDescription("");
      setError(null);
      setSuccess(false);
      setIsSubmitting(false);
    }
  }, [reportModal.open]);

  useEffect(() => {
    if (!reportModal.open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeReportModal();
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;
        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [reportModal.open, closeReportModal]);

  const handleSubmit = useCallback(async () => {
    if (!reason || !reportModal.targetType || !reportModal.targetId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createReport(
        reportModal.targetType as ReportTargetType,
        reportModal.targetId,
        reason,
        description.trim() || undefined,
      );
      setSuccess(true);
    } catch {
      setError(t.errors.generic);
    } finally {
      setIsSubmitting(false);
    }
  }, [reason, description, reportModal.targetType, reportModal.targetId]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        closeReportModal();
      }
    },
    [closeReportModal],
  );

  if (!reportModal.open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-lg rounded-lg border border-border bg-popover p-6 shadow-xl animate-slide-up"
      >
        <button
          onClick={closeReportModal}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {success ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <svg
                className="h-6 w-6 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.reports.reportConfirmation}
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={closeReportModal}
            >
              {t.common.close}
            </Button>
          </div>
        ) : (
          <>
            <h2
              id="report-modal-title"
              className="text-lg font-semibold text-popover-foreground"
            >
              {t.reports.reportTitle}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.reports.reportReason}
            </p>

            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors",
                    reason === r.value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:bg-accent",
                  )}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                      reason === r.value
                        ? "border-primary"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {reason === r.value && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </span>
                  {r.label}
                </label>
              ))}
            </div>

            <div className="mt-4">
              <label
                htmlFor="report-description"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                {t.reports.reportDescription}
              </label>
              <textarea
                id="report-description"
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))
                }
                rows={3}
                maxLength={MAX_DESCRIPTION_LENGTH}
                placeholder="Provide any additional context that might help our review..."
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </p>
            </div>

            {error && (
              <p className="mt-3 text-sm text-destructive">{error}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={closeReportModal}>
                {t.common.cancel}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!reason || isSubmitting}
                loading={isSubmitting}
              >
                {isSubmitting
                  ? "Submitting..."
                  : t.reports.reportSubmit}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
