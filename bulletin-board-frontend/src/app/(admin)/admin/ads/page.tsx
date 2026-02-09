"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Megaphone,
  ExternalLink,
  Tag,
  CalendarDays,
  Info,
  X,
  Upload,
  BarChart3,
  MousePointerClick,
  Download,
  TrendingUp,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

// ── Types ──

type AdTypeValue = "internal_detail" | "external_link" | "coupon" | "event";

interface AdminAd {
  id: string;
  type: AdTypeValue;
  title: string;
  subtitle: string | null;
  body: string | null;
  cta_text: string;
  image_url: string | null;
  image_alt: string | null;
  accent_color: string | null;
  external_url: string | null;
  coupon_code: string | null;
  event_start_at: string | null;
  event_location: string | null;
  priority: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  campus_id: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface AdminAdsResponse {
  items: AdminAd[];
  total: number;
}

interface DailyBreakdown {
  date: string;
  impressions: number;
  clicks: number;
}

interface AdAnalytics {
  ad_id: string;
  title: string;
  type: string;
  is_active: boolean;
  impressions: number;
  clicks: number;
  ctr: number;
  unique_impressions: number;
  unique_clicks: number;
  daily_breakdown: DailyBreakdown[];
}

interface AnalyticsResponse {
  ads: AdAnalytics[];
  totals: {
    total_impressions: number;
    total_clicks: number;
    overall_ctr: number;
  };
  period_days: number;
}

const AD_TYPE_OPTIONS: { value: AdTypeValue; label: string; icon: typeof Info }[] = [
  { value: "internal_detail", label: "Featured", icon: Info },
  { value: "external_link", label: "Sponsored Link", icon: ExternalLink },
  { value: "coupon", label: "Coupon", icon: Tag },
  { value: "event", label: "Event", icon: CalendarDays },
];

function adTypeLabel(type: AdTypeValue) {
  return AD_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function adTypeColor(type: AdTypeValue) {
  switch (type) {
    case "external_link":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
    case "coupon":
      return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
    case "event":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  }
}

// ── Image Upload Helper ──

async function uploadAdImage(file: File): Promise<string> {
  // Step 1: Get presigned URL
  const presigned = await api.post<{
    upload_url: string;
    upload_id: string;
    storage_key: string;
    expires_in: number;
  }>("/api/v1/uploads/presigned", {
    purpose: "ad_image",
    content_type: file.type,
    file_size: file.size,
  });

  // Step 2: Upload to S3/R2
  await fetch(presigned.upload_url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  // Step 3: Confirm upload
  const confirmed = await api.post<{ image_url: string }>(
    `/api/v1/uploads/confirm/${presigned.upload_id}`,
    { position: 0 },
  );

  return confirmed.image_url;
}

// ── Ad Form Modal ──

interface AdFormData {
  type: AdTypeValue;
  title: string;
  subtitle: string;
  body: string;
  cta_text: string;
  image_url: string;
  image_alt: string;
  accent_color: string;
  external_url: string;
  coupon_code: string;
  event_start_at: string;
  event_location: string;
  priority: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
}

function emptyForm(): AdFormData {
  return {
    type: "internal_detail",
    title: "",
    subtitle: "",
    body: "",
    cta_text: "Learn More",
    image_url: "",
    image_alt: "",
    accent_color: "",
    external_url: "",
    coupon_code: "",
    event_start_at: "",
    event_location: "",
    priority: 0,
    is_active: true,
    starts_at: "",
    ends_at: "",
  };
}

function adToForm(ad: AdminAd): AdFormData {
  return {
    type: ad.type,
    title: ad.title,
    subtitle: ad.subtitle ?? "",
    body: ad.body ?? "",
    cta_text: ad.cta_text,
    image_url: ad.image_url ?? "",
    image_alt: ad.image_alt ?? "",
    accent_color: ad.accent_color ?? "",
    external_url: ad.external_url ?? "",
    coupon_code: ad.coupon_code ?? "",
    event_start_at: ad.event_start_at ? ad.event_start_at.slice(0, 16) : "",
    event_location: ad.event_location ?? "",
    priority: ad.priority,
    is_active: ad.is_active,
    starts_at: ad.starts_at ? ad.starts_at.slice(0, 16) : "",
    ends_at: ad.ends_at ? ad.ends_at.slice(0, 16) : "",
  };
}

function AdFormModal({
  editingAd,
  onClose,
  onSaved,
}: {
  editingAd: AdminAd | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = editingAd !== null;
  const [form, setForm] = useState<AdFormData>(
    isEditing ? adToForm(editingAd) : emptyForm(),
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = useCallback(
    <K extends keyof AdFormData>(key: K, value: AdFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadAdImage(file);
      set("image_url", url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        title: form.title.trim(),
        cta_text: form.cta_text.trim() || "Learn More",
        priority: form.priority,
        is_active: form.is_active,
      };

      // Only include non-empty optional fields
      if (form.subtitle.trim()) payload.subtitle = form.subtitle.trim();
      else if (isEditing) payload.clear_subtitle = true;

      if (form.body.trim()) payload.body = form.body.trim();
      else if (isEditing) payload.clear_body = true;

      if (form.image_url.trim()) {
        payload.image_url = form.image_url.trim();
        payload.image_alt = form.image_alt.trim() || form.title.trim();
      } else if (isEditing) {
        payload.clear_image = true;
      }

      if (form.accent_color.trim()) payload.accent_color = form.accent_color.trim();

      if (form.external_url.trim()) payload.external_url = form.external_url.trim();
      else if (isEditing) payload.clear_external_url = true;

      if (form.coupon_code.trim()) payload.coupon_code = form.coupon_code.trim();
      else if (isEditing) payload.clear_coupon_code = true;

      if (form.event_start_at) payload.event_start_at = new Date(form.event_start_at).toISOString();
      else if (isEditing) payload.clear_event_start_at = true;

      if (form.event_location.trim()) payload.event_location = form.event_location.trim();
      else if (isEditing) payload.clear_event_location = true;

      if (form.starts_at) payload.starts_at = new Date(form.starts_at).toISOString();
      else if (isEditing) payload.clear_starts_at = true;

      if (form.ends_at) payload.ends_at = new Date(form.ends_at).toISOString();
      else if (isEditing) payload.clear_ends_at = true;

      if (isEditing) {
        await api.patch(`/api/v1/ads/admin/${editingAd.id}`, payload);
        toast.success("Ad updated");
      } else {
        await api.post("/api/v1/ads/admin/create", payload);
        toast.success("Ad created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save ad",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-12">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Edit Ad" : "Create New Ad"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Ad Type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {AD_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("type", opt.value)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      form.type === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={200}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Welcome Week Essentials"
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Subtitle</label>
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => set("subtitle", e.target.value)}
              maxLength={500}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Brief description shown below the title"
            />
          </div>

          {/* Body */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Body / Details</label>
            <textarea
              value={form.body}
              onChange={(e) => set("body", e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Full description shown on the ad detail page..."
            />
          </div>

          {/* Image */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Image</label>
            <div className="flex items-start gap-3">
              {form.image_url ? (
                <div className="relative h-20 w-32 overflow-hidden rounded-lg border border-border">
                  <Image
                    src={form.image_url}
                    alt={form.image_alt || "Ad image"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => {
                      set("image_url", "");
                      set("image_alt", "");
                    }}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex h-20 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  {uploading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span className="mt-1 text-xs">Upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              )}
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => set("image_url", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Or paste image URL directly"
                />
                <input
                  type="text"
                  value={form.image_alt}
                  onChange={(e) => set("image_alt", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Image alt text (for accessibility)"
                />
              </div>
            </div>
          </div>

          {/* CTA + Accent Color Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">CTA Button Text</label>
              <input
                type="text"
                value={form.cta_text}
                onChange={(e) => set("cta_text", e.target.value)}
                maxLength={100}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Learn More"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.accent_color || "#6366f1"}
                  onChange={(e) => set("accent_color", e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded border border-border"
                />
                <input
                  type="text"
                  value={form.accent_color}
                  onChange={(e) => set("accent_color", e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="#6366f1"
                />
              </div>
            </div>
          </div>

          {/* Type-specific fields */}
          {form.type === "external_link" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">External URL</label>
              <input
                type="url"
                value={form.external_url}
                onChange={(e) => set("external_url", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="https://example.com"
              />
            </div>
          )}

          {form.type === "coupon" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Coupon Code</label>
              <input
                type="text"
                value={form.coupon_code}
                onChange={(e) => set("coupon_code", e.target.value)}
                maxLength={100}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono uppercase focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="FREESHIP2026"
              />
            </div>
          )}

          {form.type === "event" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Event Date/Time</label>
                <input
                  type="datetime-local"
                  value={form.event_start_at}
                  onChange={(e) => set("event_start_at", e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Event Location</label>
                <input
                  type="text"
                  value={form.event_location}
                  onChange={(e) => set("event_location", e.target.value)}
                  maxLength={200}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Stine Lake Lawn"
                />
              </div>
            </div>
          )}

          {/* Priority + Active */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Priority</label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => set("priority", parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">Higher = shown first</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Visible From</label>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => set("starts_at", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Visible Until</label>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => set("ends_at", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                form.is_active ? "bg-primary" : "bg-muted",
              )}
              onClick={() => set("is_active", !form.is_active)}
            >
              <div
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  form.is_active ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </div>
            <span className="text-sm font-medium">
              {form.is_active ? "Active — visible to users" : "Inactive — hidden from users"}
            </span>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Ad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ──

function DeleteConfirmModal({
  ad,
  onClose,
  onConfirm,
}: {
  ad: AdminAd;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/api/v1/ads/admin/${ad.id}`);
      toast.success("Ad deleted");
      onConfirm();
    } catch {
      toast.error("Failed to delete ad");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold">Delete Ad</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Are you sure you want to permanently delete &ldquo;{ad.title}&rdquo;? This action
          cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mini Bar Chart (CSS-only) ──

function MiniBarChart({ data }: { data: DailyBreakdown[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-16 items-center justify-center text-xs text-muted-foreground">
        No data yet
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.impressions), 1);

  return (
    <div className="flex h-16 items-end gap-px">
      {data.map((d) => {
        const impressionH = (d.impressions / maxVal) * 100;
        const clickH = d.impressions > 0 ? (d.clicks / d.impressions) * impressionH : 0;
        return (
          <div
            key={d.date}
            className="group relative flex-1 min-w-[3px]"
            title={`${d.date}: ${d.impressions} imp, ${d.clicks} clicks`}
          >
            <div
              className="w-full rounded-t-sm bg-primary/20"
              style={{ height: `${Math.max(impressionH, 2)}%` }}
            >
              <div
                className="w-full rounded-t-sm bg-primary"
                style={{ height: `${clickH}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Analytics Summary Cards ──

function AnalyticsSummary({
  analytics,
  activeAdCount,
}: {
  analytics: AnalyticsResponse;
  activeAdCount: number;
}) {
  const cards = [
    {
      label: "Total Impressions",
      value: analytics.totals.total_impressions.toLocaleString(),
      icon: Eye,
    },
    {
      label: "Total Clicks",
      value: analytics.totals.total_clicks.toLocaleString(),
      icon: MousePointerClick,
    },
    {
      label: "Overall CTR",
      value: `${analytics.totals.overall_ctr}%`,
      icon: TrendingUp,
    },
    {
      label: "Active Ads",
      value: activeAdCount,
      icon: Megaphone,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="rounded-lg border border-border bg-card p-4 space-y-1"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold">{c.value}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Analytics Table ──

type SortKey = "impressions" | "clicks" | "ctr";

function AnalyticsTable({
  analytics,
}: {
  analytics: AnalyticsResponse;
}) {
  const [sortBy, setSortBy] = useState<SortKey>("impressions");
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = useMemo(() => {
    return [...analytics.ads].sort((a, b) => {
      const diff = a[sortBy] - b[sortBy];
      return sortDesc ? -diff : diff;
    });
  }, [analytics.ads, sortBy, sortDesc]);

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(key);
      setSortDesc(true);
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortBy !== key) return "";
    return sortDesc ? " \u2193" : " \u2191";
  }

  if (analytics.ads.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Ad</th>
            <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
            <th
              className="px-4 py-2.5 text-right font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
              onClick={() => handleSort("impressions")}
            >
              Impressions{sortIndicator("impressions")}
            </th>
            <th
              className="px-4 py-2.5 text-right font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
              onClick={() => handleSort("clicks")}
            >
              Clicks{sortIndicator("clicks")}
            </th>
            <th
              className="px-4 py-2.5 text-right font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
              onClick={() => handleSort("ctr")}
            >
              CTR{sortIndicator("ctr")}
            </th>
            <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
              Daily Trend
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((ad) => (
            <tr key={ad.ad_id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium truncate max-w-[200px]">{ad.title}</p>
                <p className="text-xs text-muted-foreground">{ad.type}</p>
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    ad.is_active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {ad.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {ad.impressions.toLocaleString()}
                <span className="block text-xs text-muted-foreground">
                  {ad.unique_impressions.toLocaleString()} unique
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {ad.clicks.toLocaleString()}
                <span className="block text-xs text-muted-foreground">
                  {ad.unique_clicks.toLocaleString()} unique
                </span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-medium">
                {ad.ctr}%
              </td>
              <td className="px-4 py-3">
                <div className="w-32 ml-auto">
                  <MiniBarChart data={ad.daily_breakdown} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── CSV Export ──

function exportAnalyticsCsv(analytics: AnalyticsResponse) {
  const rows: string[] = [
    "Ad Title,Type,Status,Impressions,Unique Impressions,Clicks,Unique Clicks,CTR %",
  ];

  for (const ad of analytics.ads) {
    rows.push(
      [
        `"${ad.title.replace(/"/g, '""')}"`,
        ad.type,
        ad.is_active ? "Active" : "Inactive",
        ad.impressions,
        ad.unique_impressions,
        ad.clicks,
        ad.unique_clicks,
        ad.ctr,
      ].join(","),
    );
  }

  // Add blank line and daily breakdown
  rows.push("");
  rows.push("Daily Breakdown");
  rows.push("Ad Title,Date,Impressions,Clicks");

  for (const ad of analytics.ads) {
    for (const day of ad.daily_breakdown) {
      rows.push(
        [
          `"${ad.title.replace(/"/g, '""')}"`,
          day.date,
          day.impressions,
          day.clicks,
        ].join(","),
      );
    }
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ad-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Ad Card ──

function AdCard({
  ad,
  adAnalytics,
  onEdit,
  onDelete,
  onToggle,
}: {
  ad: AdminAd;
  adAnalytics?: AdAnalytics;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "group rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        ad.is_active ? "border-border" : "border-dashed border-muted-foreground/30 opacity-60",
      )}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image preview */}
        <div className="relative h-32 w-full overflow-hidden rounded-t-xl bg-muted sm:h-auto sm:w-40 sm:rounded-l-xl sm:rounded-tr-none">
          {ad.image_url ? (
            <Image
              src={ad.image_url}
              alt={ad.image_alt || ad.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Megaphone className="h-8 w-8" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", adTypeColor(ad.type))}>
                  {adTypeLabel(ad.type)}
                </span>
                {!ad.is_active && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    <EyeOff className="h-3 w-3" />
                    Inactive
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  Priority: {ad.priority}
                </span>
              </div>
              <h3 className="mt-1.5 text-sm font-semibold truncate">{ad.title}</h3>
              {ad.subtitle && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {ad.subtitle}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onToggle}
                title={ad.is_active ? "Deactivate" : "Activate"}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                {ad.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={onEdit}
                title="Edit"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={onDelete}
                title="Delete"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Meta row + analytics */}
          <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-muted-foreground flex-wrap">
            {ad.starts_at && (
              <span>From {new Date(ad.starts_at).toLocaleDateString()}</span>
            )}
            {ad.ends_at && (
              <span>Until {new Date(ad.ends_at).toLocaleDateString()}</span>
            )}
            {ad.cta_text && (
              <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
                {ad.cta_text}
              </span>
            )}
            {adAnalytics && (
              <>
                <span className="flex items-center gap-1" title="Impressions">
                  <Eye className="h-3 w-3" />
                  {adAnalytics.impressions.toLocaleString()}
                </span>
                <span className="flex items-center gap-1" title="Clicks">
                  <MousePointerClick className="h-3 w-3" />
                  {adAnalytics.clicks.toLocaleString()}
                </span>
                <span className="flex items-center gap-1 font-medium" title="CTR">
                  <TrendingUp className="h-3 w-3" />
                  {adAnalytics.ctr}%
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──

type PageTab = "manage" | "analytics";
type AnalyticsPeriod = 7 | 30 | 90;

export default function AdminAdsPage() {
  const [ads, setAds] = useState<AdminAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(true);

  // Analytics state
  const [activeTab, setActiveTab] = useState<PageTab>("manage");
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>(30);

  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState<AdminAd | null>(null);
  const [deletingAd, setDeletingAd] = useState<AdminAd | null>(null);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<AdminAdsResponse>("/api/v1/ads/admin/list", {
        include_inactive: showInactive,
      });
      setAds(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ads");
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await api.get<AnalyticsResponse>("/api/v1/ads/admin/analytics", {
        days: analyticsPeriod,
      });
      setAnalytics(data);
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsPeriod]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Build analytics lookup map by ad_id
  const analyticsMap = useMemo(() => {
    if (!analytics) return new Map<string, AdAnalytics>();
    return new Map(analytics.ads.map((a) => [a.ad_id, a]));
  }, [analytics]);

  async function toggleActive(ad: AdminAd) {
    try {
      await api.patch(`/api/v1/ads/admin/${ad.id}`, {
        is_active: !ad.is_active,
      });
      toast.success(ad.is_active ? "Ad deactivated" : "Ad activated");
      fetchAds();
    } catch {
      toast.error("Failed to update ad");
    }
  }

  const activeAds = ads.filter((a) => a.is_active);
  const inactiveAds = ads.filter((a) => !a.is_active);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Ads Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage the featured ads carousel on the main feed
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingAd(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Ad
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
        <button
          onClick={() => setActiveTab("manage")}
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "manage"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Megaphone className="mr-2 inline h-4 w-4" />
          Manage Ads
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "analytics"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <BarChart3 className="mr-2 inline h-4 w-4" />
          Analytics
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <button onClick={fetchAds} className="ml-2 font-medium underline">
            Retry
          </button>
        </div>
      )}

      {/* ── Analytics Tab ── */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Period selector + export */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
              {([7, 30, 90] as AnalyticsPeriod[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setAnalyticsPeriod(d)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    analyticsPeriod === d
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d}d
                </button>
              ))}
            </div>
            <button
              onClick={() => analytics && exportAnalyticsCsv(analytics)}
              disabled={!analytics || analytics.ads.length === 0}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV
            </button>
          </div>

          {analyticsLoading ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-card" />
                ))}
              </div>
              <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
            </div>
          ) : analytics ? (
            <>
              <AnalyticsSummary
                analytics={analytics}
                activeAdCount={activeAds.length}
              />
              <AnalyticsTable analytics={analytics} />
            </>
          ) : null}
        </div>
      )}

      {/* ── Manage Tab ── */}
      {activeTab === "manage" && (
        <>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-xl border border-border bg-card"
                />
              ))}
            </div>
          ) : ads.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
              <Megaphone className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 text-lg font-semibold">No ads yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first ad to display in the featured carousel on the main feed.
              </p>
              <button
                onClick={() => {
                  setEditingAd(null);
                  setShowForm(true);
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Create Ad
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active ads */}
              <div className="space-y-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <Eye className="h-4 w-4" />
                  Active ({activeAds.length})
                </h2>
                {activeAds.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No active ads. Users won&apos;t see the carousel.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeAds.map((ad) => (
                      <AdCard
                        key={ad.id}
                        ad={ad}
                        adAnalytics={analyticsMap.get(ad.id)}
                        onEdit={() => {
                          setEditingAd(ad);
                          setShowForm(true);
                        }}
                        onDelete={() => setDeletingAd(ad)}
                        onToggle={() => toggleActive(ad)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Inactive ads */}
              {inactiveAds.length > 0 && (
                <div className="space-y-2">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    <EyeOff className="h-4 w-4" />
                    Inactive ({inactiveAds.length})
                  </h2>
                  <div className="space-y-3">
                    {inactiveAds.map((ad) => (
                      <AdCard
                        key={ad.id}
                        ad={ad}
                        adAnalytics={analyticsMap.get(ad.id)}
                        onEdit={() => {
                          setEditingAd(ad);
                          setShowForm(true);
                        }}
                        onDelete={() => setDeletingAd(ad)}
                        onToggle={() => toggleActive(ad)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <AdFormModal
          editingAd={editingAd}
          onClose={() => {
            setShowForm(false);
            setEditingAd(null);
          }}
          onSaved={() => {
            fetchAds();
            fetchAnalytics();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deletingAd && (
        <DeleteConfirmModal
          ad={deletingAd}
          onClose={() => setDeletingAd(null)}
          onConfirm={() => {
            setDeletingAd(null);
            fetchAds();
            fetchAnalytics();
          }}
        />
      )}
    </div>
  );
}
