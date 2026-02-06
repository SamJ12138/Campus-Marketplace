"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  Eye,
  ArrowLeft,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Category, LocationType, ContactPreference } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { en as t } from "@/lib/i18n/en";
import { listingCreateSchema, type ListingCreateInput } from "@/lib/validation/listing";
import { useCategories, useCreateListing } from "@/lib/hooks/use-listings";
import PhotoUploader from "@/components/listings/PhotoUploader";
import { ProtectedPage } from "@/components/auth/ProtectedPage";

// ----------------------------------------------------------------
// Preview card (lightweight ListingCard mock)
// ----------------------------------------------------------------
function PreviewCard({ values }: { values: Partial<ListingCreateInput> & { photoUrls?: string[] } }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {values.photoUrls && values.photoUrls.length > 0 ? (
        <div className="relative aspect-[4/3] w-full bg-slate-100">
          <Image
            src={values.photoUrls[0]}
            alt="Preview"
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-100">
          {values.type === "service" ? (
            <Briefcase className="h-12 w-12 text-slate-300" />
          ) : (
            <ShoppingBag className="h-12 w-12 text-slate-300" />
          )}
        </div>
      )}
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
          {values.title || "Your listing title"}
        </h3>
        {values.price_hint && (
          <p className="text-sm text-slate-600">{values.price_hint}</p>
        )}
        <p className="line-clamp-3 text-xs text-slate-500">
          {values.description || "Your listing description will appear here..."}
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Radio card helper
// ----------------------------------------------------------------
function RadioCard({
  selected,
  onClick,
  icon: Icon,
  label,
  description,
  color,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-2 rounded-xl border-2 p-5 text-center transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        selected
          ? `${color} shadow-sm`
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      <Icon className={cn("h-8 w-8", selected ? "text-current" : "text-slate-400")} />
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-slate-500">{description}</span>
    </button>
  );
}

// ----------------------------------------------------------------
// Form field wrapper
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
// Main create listing page
// ----------------------------------------------------------------
export default function CreateListingPage() {
  const router = useRouter();
  const createListing = useCreateListing();

  const [showPreview, setShowPreview] = useState(false);
  const [photoData, setPhotoData] = useState<
    { id: string; url: string; position: number }[]
  >([]);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const uploadsCompleteResolve = useRef<(() => void) | null>(null);
  const hasPendingPhotos = useRef(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ListingCreateInput>({
    resolver: zodResolver(listingCreateSchema),
    defaultValues: {
      type: undefined,
      category_id: "",
      custom_category_label: "",
      title: "",
      description: "",
      price_hint: "",
      location_type: "on_campus",
      location_hint: "",
      availability: "",
      contact_preference: "in_app",
      is_regulated: false,
      disclaimer_accepted: false,
    },
  });

  const selectedType = watch("type");
  const description = watch("description") ?? "";
  const watchedValues = watch();

  // Load categories filtered by selected type
  const { data: categories } = useCategories(selectedType);

  // Find selected category to check if it's regulated
  const selectedCategoryId = watch("category_id");
  const selectedCategory = useMemo(
    () => categories?.find((c: Category) => c.id === selectedCategoryId),
    [categories, selectedCategoryId],
  );

  // Warn on leave if form is dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = t.listings.editTitle;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Check if "Other" category is selected
  const isOtherCategory = selectedCategory?.slug === "other";

  // Submit handler
  const onSubmit = useCallback(
    async (data: ListingCreateInput) => {
      // Validate custom category label when "Other" is selected
      if (isOtherCategory && (!data.custom_category_label || !data.custom_category_label.trim())) {
        setError("custom_category_label", {
          message: "Please describe what category this belongs to",
        });
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { disclaimer_accepted, ...payload } = data;
      const cleanPayload = {
        ...payload,
        custom_category_label: isOtherCategory ? payload.custom_category_label?.trim() : undefined,
        price_hint: payload.price_hint || null,
        location_hint: payload.location_hint || null,
        availability: payload.availability || null,
      };

      const newListing = await createListing.mutateAsync(cleanPayload);
      // If photos were selected, wait for uploads to complete
      if (hasPendingPhotos.current) {
        await new Promise<void>((resolve) => {
          uploadsCompleteResolve.current = resolve;
          setCreatedListingId(newListing.id);
        });
      }
      router.push(`/listings/${newListing.id}`);
    },
    [createListing, router, isOtherCategory, setError],
  );

  // Cancel with confirmation
  const handleCancel = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave?",
      );
      if (!confirmed) return;
    }
    router.back();
  }, [isDirty, router]);

  return (
    <ProtectedPage>
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            {t.listings.createTitle}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Eye className="h-4 w-4" />
          Preview
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className={cn("space-y-6", showPreview ? "lg:col-span-2" : "lg:col-span-3")}
        >
          {/* Type selector */}
          <FormField
            label={t.listings.categoryLabel ? "What are you offering?" : "Type"}
            htmlFor="type"
            error={errors.type?.message}
            required
          >
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="flex gap-3">
                  <RadioCard
                    selected={field.value === "service"}
                    onClick={() => {
                      field.onChange("service");
                      setValue("category_id", "");
                    }}
                    icon={Briefcase}
                    label={t.listings.servicesTab}
                    description="Tutoring, rides, skills, and more"
                    color="border-blue-500 bg-blue-50 text-blue-700"
                  />
                  <RadioCard
                    selected={field.value === "item"}
                    onClick={() => {
                      field.onChange("item");
                      setValue("category_id", "");
                    }}
                    icon={ShoppingBag}
                    label={t.listings.itemsTab}
                    description="Textbooks, furniture, electronics, etc."
                    color="border-emerald-500 bg-emerald-50 text-emerald-700"
                  />
                </div>
              )}
            />
          </FormField>

          {/* Category dropdown */}
          {selectedType && (
            <>
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
                      {cat.icon ? `${cat.icon} ` : ""}{cat.name}
                    </option>
                  ))}
                </select>
              </FormField>

              {/* Custom category label — shown when "Other" is selected */}
              {selectedCategory?.slug === "other" && (
                <FormField
                  label="Describe your category"
                  htmlFor="custom_category_label"
                  error={errors.custom_category_label?.message}
                  required
                  hint="What type of item or service is this? (e.g., Lab Equipment, Tutoring Board Games)"
                >
                  <input
                    id="custom_category_label"
                    type="text"
                    {...register("custom_category_label")}
                    placeholder={selectedType === "item" ? "e.g., Lab Equipment, Camping Gear" : "e.g., Laundry Service, Dance Lessons"}
                    className={cn(
                      "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm",
                      "placeholder:text-slate-400",
                      "focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100",
                      errors.custom_category_label && "border-red-300",
                    )}
                  />
                </FormField>
              )}
            </>
          )}

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
                  description.length > 5000
                    ? "text-red-600"
                    : description.length > 4500
                      ? "text-amber-600"
                      : "text-slate-400",
                )}
              >
                {description.length}/5000
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
            hint={selectedType === "item" ? "Required for items - add up to 6 photos" : "Optional - add up to 6 photos"}
          >
            <PhotoUploader
              listingId={createdListingId}
              maxPhotos={6}
              onPhotosChange={(photos) => {
                setPhotoData(
                  photos.map((p) => ({ id: p.id, url: p.url, position: p.position })),
                );
              }}
              onUploadsComplete={() => {
                uploadsCompleteResolve.current?.();
              }}
              onPendingCountChange={(count) => {
                hasPendingPhotos.current = count > 0;
              }}
            />
          </FormField>

          {/* API error */}
          {createListing.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" />
                {createListing.error instanceof Error
                  ? createListing.error.message
                  : t.errors.generic}
              </p>
            </div>
          )}

          {/* Form actions */}
          <div className="flex items-center gap-3 border-t border-slate-200 pt-6">
            <button
              type="submit"
              disabled={isSubmitting || createListing.isPending}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white",
                "hover:bg-blue-700 disabled:opacity-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              )}
            >
              {(isSubmitting || createListing.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Post Offer
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t.common.cancel}
            </button>
          </div>
        </form>

        {/* Preview panel */}
        {showPreview && (
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <p className="mb-3 text-sm font-medium text-slate-500">
                Preview
              </p>
              <PreviewCard
                values={{
                  ...watchedValues,
                  photoUrls: photoData.map((p) => p.url),
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
    </ProtectedPage>
  );
}
