"use client";

import { useState, useCallback } from "react";
import { Sparkles, Lightbulb, DollarSign, Tag, BarChart3, Loader2 } from "lucide-react";
import {
  suggestDescription,
  suggestTitle,
  suggestPrice,
  suggestCategory,
  scoreCompleteness,
  type SuggestDescriptionResponse,
  type SuggestTitleResponse,
  type SuggestPriceResponse,
  type SuggestCategoryResponse,
  type CompletenessResponse,
} from "@/lib/api/listing-assist";

interface AIAssistPanelProps {
  title?: string;
  description?: string;
  listingType?: "item" | "service";
  category?: string;
  priceHint?: string;
  categoryId?: string;
  photosCount?: number;
  locationType?: string;
  locationHint?: string;
  availability?: Record<string, unknown>;
  onApplyDescription?: (description: string) => void;
  onApplyTitle?: (title: string) => void;
  onApplyPrice?: (price: string) => void;
  onApplyCategory?: (slug: string, name: string) => void;
}

type ActiveAction =
  | "description"
  | "title"
  | "price"
  | "category"
  | "completeness"
  | null;

export default function AIAssistPanel({
  title = "",
  description = "",
  listingType = "item",
  category,
  priceHint,
  categoryId,
  photosCount = 0,
  locationType,
  locationHint,
  availability,
  onApplyDescription,
  onApplyTitle,
  onApplyPrice,
  onApplyCategory,
}: AIAssistPanelProps) {
  const [loading, setLoading] = useState<ActiveAction>(null);
  const [error, setError] = useState<string | null>(null);

  const [descResult, setDescResult] = useState<SuggestDescriptionResponse | null>(null);
  const [titleResult, setTitleResult] = useState<SuggestTitleResponse | null>(null);
  const [priceResult, setPriceResult] = useState<SuggestPriceResponse | null>(null);
  const [categoryResult, setCategoryResult] = useState<SuggestCategoryResponse | null>(null);
  const [completenessResult, setCompletenessResult] = useState<CompletenessResponse | null>(null);

  const clearResults = useCallback(() => {
    setDescResult(null);
    setTitleResult(null);
    setPriceResult(null);
    setCategoryResult(null);
    setCompletenessResult(null);
    setError(null);
  }, []);

  const handleSuggestDescription = useCallback(async () => {
    if (!title || title.length < 3) {
      setError("Enter a title (3+ characters) to generate a description");
      return;
    }
    setLoading("description");
    setError(null);
    clearResults();
    try {
      const result = await suggestDescription({
        title,
        listing_type: listingType,
        category,
      });
      setDescResult(result);
    } catch {
      setError("Failed to generate description. Please try again.");
    } finally {
      setLoading(null);
    }
  }, [title, listingType, category, clearResults]);

  const handleSuggestTitle = useCallback(async () => {
    if (!description || description.length < 10) {
      setError("Enter a description (10+ characters) to suggest titles");
      return;
    }
    setLoading("title");
    setError(null);
    clearResults();
    try {
      const result = await suggestTitle({
        description,
        listing_type: listingType,
        category,
      });
      setTitleResult(result);
    } catch {
      setError("Failed to suggest titles. Please try again.");
    } finally {
      setLoading(null);
    }
  }, [description, listingType, category, clearResults]);

  const handleSuggestPrice = useCallback(async () => {
    if (!title || title.length < 3 || !description || description.length < 10) {
      setError("Enter a title and description to get price suggestions");
      return;
    }
    setLoading("price");
    setError(null);
    clearResults();
    try {
      const result = await suggestPrice({
        title,
        description,
        listing_type: listingType,
        category,
      });
      setPriceResult(result);
    } catch {
      setError("Failed to suggest price. Please try again.");
    } finally {
      setLoading(null);
    }
  }, [title, description, listingType, category, clearResults]);

  const handleSuggestCategory = useCallback(async () => {
    if (!title || title.length < 3 || !description || description.length < 10) {
      setError("Enter a title and description to detect category");
      return;
    }
    setLoading("category");
    setError(null);
    clearResults();
    try {
      const result = await suggestCategory({
        title,
        description,
        listing_type: listingType,
      });
      setCategoryResult(result);
    } catch {
      setError("Failed to detect category. Please try again.");
    } finally {
      setLoading(null);
    }
  }, [title, description, listingType, clearResults]);

  const handleCheckCompleteness = useCallback(async () => {
    setLoading("completeness");
    setError(null);
    clearResults();
    try {
      const result = await scoreCompleteness({
        title: title || undefined,
        description: description || undefined,
        price_hint: priceHint || undefined,
        category_id: categoryId || undefined,
        photos_count: photosCount,
        location_type: locationType || undefined,
        location_hint: locationHint || undefined,
        availability: availability || undefined,
      });
      setCompletenessResult(result);
    } catch {
      setError("Failed to check completeness. Please try again.");
    } finally {
      setLoading(null);
    }
  }, [title, description, priceHint, categoryId, photosCount, locationType, locationHint, availability, clearResults]);

  const isLoading = loading !== null;

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-indigo-900">AI Assist</h3>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={handleSuggestDescription}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "description" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Lightbulb className="h-3 w-3" />
          )}
          Generate Description
        </button>
        <button
          type="button"
          onClick={handleSuggestTitle}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "title" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Tag className="h-3 w-3" />
          )}
          Suggest Titles
        </button>
        <button
          type="button"
          onClick={handleSuggestPrice}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "price" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <DollarSign className="h-3 w-3" />
          )}
          Suggest Price
        </button>
        <button
          type="button"
          onClick={handleSuggestCategory}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "category" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Tag className="h-3 w-3" />
          )}
          Detect Category
        </button>
        <button
          type="button"
          onClick={handleCheckCompleteness}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "completeness" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <BarChart3 className="h-3 w-3" />
          )}
          Check Completeness
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Description result */}
      {descResult && (
        <div className="space-y-2 rounded-md bg-white p-3 ring-1 ring-indigo-100">
          <p className="text-sm text-gray-800">{descResult.description}</p>
          {descResult.tips.length > 0 && (
            <ul className="list-disc pl-4 text-xs text-gray-500">
              {descResult.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          )}
          {onApplyDescription && (
            <button
              type="button"
              onClick={() => onApplyDescription(descResult.description)}
              className="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Use this description
            </button>
          )}
        </div>
      )}

      {/* Title result */}
      {titleResult && (
        <div className="space-y-2 rounded-md bg-white p-3 ring-1 ring-indigo-100">
          <p className="text-xs text-gray-500 mb-1">{titleResult.reasoning}</p>
          <div className="space-y-1">
            {titleResult.titles.map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-800">{t}</span>
                {onApplyTitle && (
                  <button
                    type="button"
                    onClick={() => onApplyTitle(t)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Use
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price result */}
      {priceResult && (
        <div className="space-y-2 rounded-md bg-white p-3 ring-1 ring-indigo-100">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">
              {priceResult.price_hint}
            </span>
            {priceResult.price_range?.low != null && priceResult.price_range?.high != null && (
              <span className="text-xs text-gray-500">
                (range: ${priceResult.price_range.low}–${priceResult.price_range.high})
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{priceResult.reasoning}</p>
          {onApplyPrice && (
            <button
              type="button"
              onClick={() => onApplyPrice(priceResult.price_hint)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Use this price
            </button>
          )}
        </div>
      )}

      {/* Category result */}
      {categoryResult && (
        <div className="space-y-2 rounded-md bg-white p-3 ring-1 ring-indigo-100">
          {categoryResult.category_name ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {categoryResult.category_name}
                </span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                  {Math.round(categoryResult.confidence * 100)}% confident
                </span>
              </div>
              <p className="text-xs text-gray-500">{categoryResult.reasoning}</p>
              {onApplyCategory && categoryResult.category_slug && (
                <button
                  type="button"
                  onClick={() =>
                    onApplyCategory(
                      categoryResult.category_slug!,
                      categoryResult.category_name!,
                    )
                  }
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Use this category
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Could not determine a category. {categoryResult.reasoning}
            </p>
          )}
        </div>
      )}

      {/* Completeness result */}
      {completenessResult && (
        <div className="space-y-2 rounded-md bg-white p-3 ring-1 ring-indigo-100">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12">
              <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={
                    completenessResult.percentage >= 80
                      ? "#22c55e"
                      : completenessResult.percentage >= 50
                        ? "#eab308"
                        : "#ef4444"
                  }
                  strokeWidth="3"
                  strokeDasharray={`${completenessResult.percentage}, 100`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                {completenessResult.percentage}%
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {completenessResult.score}/{completenessResult.max_score} points
              </p>
              <p className="text-xs text-gray-500">
                {completenessResult.percentage >= 80
                  ? "Great listing!"
                  : completenessResult.percentage >= 50
                    ? "Good start — a few improvements will help"
                    : "Add more details to attract buyers"}
              </p>
            </div>
          </div>
          {completenessResult.suggestions.length > 0 && (
            <ul className="list-disc pl-4 text-xs text-gray-600 space-y-0.5">
              {completenessResult.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
