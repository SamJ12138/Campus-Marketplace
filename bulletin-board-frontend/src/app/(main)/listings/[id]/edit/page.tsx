"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Briefcase,
  ShoppingBag,
  MapPin,
  Wifi,
  Building,
  MessageCircle,
  Mail,
  Phone,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Category, LocationType, ContactPreference } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { listingUpdateSchema, type ListingUpdateInput } from "@/lib/validation/listing";
import {
  useListing,
  useCategories,
  useUpdateListing,
  useDeleteListing,
} from "@/lib/hooks/use-listings";
import { useAuth } from "@/lib/hooks/use-auth";
import PhotoUploader from "@/components/listings/PhotoUploader";
import { ProtectedPage } from "@/components/auth/ProtectedPage";

// ----------------------------------------------------------------
// Form field wrapper (same as create page, duplicated for colocation)
// ----------------------------------------------------------------
function FormField({
  label,
  htmlFor,
  error,
  required,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Confirm modal
// ----------------------------------------------------------------
function ConfirmModal({
  title,
  message,
  confirmLabel,
  isDestructive,
  isLoading,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50",
              isDestructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700",
            )}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Loading skeleton
// ----------------------------------------------------------------
function EditSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-4 py-6">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="mt-8 space-y-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="h-10 w-full rounded-lg bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Not found / unauthorized state
// ----------------------------------------------------------------
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <AlertTriangle className="h-16 w-16 text-red-300" />
      <h2 className="mt-4 text-xl font-semibold text-slate-700">
        Access denied
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        You can only edit your own listings.
      </p>
    </div>
  );
}

// ----------------------------------------------------------------
// Main edit listing page
// ----------------------------------------------------------------
export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.id as string;

  const { data: listing, isLoading: listingLoading } = useListing(listingId);
  const { user: _user } = useAuth();
  const updateListingMutation = useUpdateListing();
  const deleteListingMutation = useDeleteListing();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [_photoData, setPhotoData] = useState<
    { id: string; url: string; position: number }[]
  >([]);

  // Load categories for the listing type
  const { data: categories } = useCategories(listing?.type);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ListingUpdateInput>({
    resolver: zodResolver(listingUpdateSchema),
    defaultValues: {
      title: "",
      description: "",
      category_id: "",
      price_hint: "",
      location_type: "on_campus",
      location_hint: "",
      availability: "",
      contact_preference: "in_app",
      is_regulated: false,
    },
  });

  // Populate form when listing data loads
  useEffect(() => {
    if (listing) {
      reset({
        title: listing.title,
        description: listing.description,
        category_id: listing.category.id,
        price_hint: listing.price_hint ?? "",
        location_type: listing.location_type,
        location_hint: listing.location_hint ?? "",
        availability: listing.availability ?? "",
        contact_preference: listing.contact_preference,
        is_regulated: listing.is_regulated,
      });
      setPhotoData(
        listing.photos.map((p) => ({
          id: p.id,
          url: p.url,
          position: p.position,
        })),
      );
    }
  }, [listing, reset]);

  const description = watch("description") ?? "";

  // Warn on leave if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Submit handler
  const onSubmit = useCallback(
    async (data: ListingUpdateInput) => {
      const cleanPayload = {
        ...data,
        price_hint: data.price_hint || null,
        location_hint: data.location_hint || null,
        availability: data.availability || null,
      };

      await updateListingMutation.mutateAsync({
        id: listingId,
        data: cleanPayload,
      });
      router.push(`/listings/${listingId}`);
    },
    [updateListingMutation, listingId, router],
  );

  // Delete handler
  const handleDelete = useCallback(() => {
    deleteListingMutation.mutate(listingId, {
      onSuccess: () => {
        router.push("/feed");
      },
    });
  }, [deleteListingMutation, listingId, router]);

  // Cancel with confirmation
  const handleCancel = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave?",
      );
      if (!confirmed) return;
    }
    router.push(`/listings/${listingId}`);
  }, [isDirty, router, listingId]);

  // Loading
  if (listingLoading) return <ProtectedPage><EditSkeleton /></ProtectedPage>;

  // Not found or not owner
  if (!listing) {
    return (
      <ProtectedPage>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="h-16 w-16 text-slate-300" />
        <h2 className="mt-4 text-xl font-semibold text-slate-700">
          Offer not found
        </h2>
      </div>
      </ProtectedPage>
    );
  }

  if (!listing.is_own) {
    return <ProtectedPage><AccessDenied /></ProtectedPage>;
  }

  return (
    <ProtectedPage>
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">
          {t.listings.editTitle}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Listing type indicator (read-only) */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            {listing.type === "service" ? (
              <Briefcase className="h-6 w-6 text-blue-600" />
            ) : (
              <ShoppingBag className="h-6 w-6 text-emerald-600" />
            )}
            <div>
              <p className="text-sm font-medium text-slate-700">
                {listing.type === "service"
                  ? t.listings.servicesTab
                  : t.listings.itemsTab}
              </p>
              <p className="text-xs text-slate-500">
                Offer type cannot be changed after creation
              </p>
            </div>
          </div>
        </div>

        {/* Category dropdown */}
        <FormField
          label={t.listings.categoryLabel}
          htmlFor="category_id"
          error={errors.category_id?.message}
          required
        >
          <select
            id="category_id"
            {...register("category_id")}
            className={cn(
              "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm",
              "focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100",
              errors.category_id && "border-red-300",
            )}
          >
            <option value="">Select a category</option>
            {categories?.map((cat: Category) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </FormField>

        {/* Title */}
        <FormField
          label={t.listings.titleLabel}
          htmlFor="title"
          error={errors.title?.message}
          required
        >
          <input
            id="title"
            type="text"
            {...register("title")}
            placeholder="Give your listing a clear title"
            className={cn(
              "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm",
              "placeholder:text-slate-400",
              "focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100",
              errors.title && "border-red-300",
            )}
          />
        </FormField>

        {/* Description */}
        <FormField
          label={t.listings.descriptionLabel}
          htmlFor="description"
          error={errors.description?.message}
          required
          hint="Between 20 and 5,000 characters"
        >
          <textarea
            id="description"
            {...register("description")}
            rows={6}
            placeholder="Describe what you're offering in detail..."
            className={cn(
              "w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm",
              "placeholder:text-slate-400",
              "focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100",
              errors.description && "border-red-300",
            )}
          />
          <div className="flex justify-end">
            <span
              className={cn(
                "text-xs",
                (description?.length ?? 0) > 5000
                  ? "text-red-600"
                  : (description?.length ?? 0) > 4500
                    ? "text-amber-600"
                    : "text-slate-400",
              )}
            >
              {description?.length ?? 0}/5000
            </span>
          </div>
        </FormField>

        {/* Price hint */}
        <FormField
          label={t.listings.priceHintLabel}
          htmlFor="price_hint"
          error={errors.price_hint?.message}
          hint={t.listings.priceHintHelp}
        >
          <input
            id="price_hint"
            type="text"
            {...register("price_hint")}
            placeholder="e.g., $20/hr, $50, Free"
            className={cn(
              "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm",
              "placeholder:text-slate-400",
              "focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100",
            )}
          />
        </FormField>

        {/* Location type */}
        <FormField
          label={t.listings.locationLabel}
          htmlFor="location_type"
          error={errors.location_type?.message}
          required
        >
          <Controller
            name="location_type"
            control={control}
            render={({ field }) => (
              <div className="flex gap-2">
                {[
                  {
                    value: "on_campus" as LocationType,
                    label: t.listings.locationOnCampus,
                    icon: Building,
                  },
                  {
                    value: "off_campus" as LocationType,
                    label: t.listings.locationOffCampus,
                    icon: MapPin,
                  },
                  {
                    value: "remote" as LocationType,
                    label: t.listings.locationRemote,
                    icon: Wifi,
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      field.value === opt.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <opt.icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          />
        </FormField>

        {/* Location hint */}
        <FormField
          label={t.listings.locationHintLabel}
          htmlFor="location_hint"
          error={errors.location_hint?.message}
        >
          <input
            id="location_hint"
            type="text"
            {...register("location_hint")}
            placeholder="e.g., Musselman Library, Room 204"
            className={cn(
              "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm",
              "placeholder:text-slate-400",
              "focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100",
            )}
          />
        </FormField>

        {/* Contact preference */}
        <FormField
          label={t.listings.contactPreferenceLabel}
          htmlFor="contact_preference"
          error={errors.contact_preference?.message}
          required
        >
          <Controller
            name="contact_preference"
            control={control}
            render={({ field }) => (
              <div className="flex gap-2">
                {[
                  {
                    value: "in_app" as ContactPreference,
                    label: t.listings.contactInApp,
                    icon: MessageCircle,
                  },
                  {
                    value: "email" as ContactPreference,
                    label: t.listings.contactEmail,
                    icon: Mail,
                  },
                  {
                    value: "phone" as ContactPreference,
                    label: t.listings.contactPhone,
                    icon: Phone,
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      field.value === opt.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <opt.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          />
        </FormField>

        {/* Photos */}
        <FormField
          label={t.listings.photosLabel}
          htmlFor="photos"
          hint={listing.type === "item" ? "Required for items - add up to 6 photos" : "Optional - add up to 6 photos"}
        >
          <PhotoUploader
            listingId={listingId}
            maxPhotos={6}
            initialPhotos={listing.photos.map((p) => ({
              id: p.id,
              url: p.url,
              thumbnail_url: p.thumbnail_url,
              position: p.position,
            }))}
            onPhotosChange={(photos) => {
              setPhotoData(
                photos.map((p) => ({ id: p.id, url: p.url, position: p.position })),
              );
            }}
          />
        </FormField>

        {/* API error */}
        {updateListingMutation.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {updateListingMutation.error instanceof Error
                ? updateListingMutation.error.message
                : t.errors.generic}
            </p>
          </div>
        )}

        {/* Form actions */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-6">
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || updateListingMutation.isPending}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white",
                "hover:bg-blue-700 disabled:opacity-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              )}
            >
              {(isSubmitting || updateListingMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Save Changes
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t.common.cancel}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
            Delete Offer
          </button>
        </div>
      </form>

      {/* Delete confirm modal */}
      {confirmDelete && (
        <ConfirmModal
          title="Delete Offer"
          message={t.listings.deleteConfirm}
          confirmLabel={t.common.delete}
          isDestructive
          isLoading={deleteListingMutation.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
    </ProtectedPage>
  );
}
