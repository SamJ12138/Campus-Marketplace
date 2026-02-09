// ──────────────────────────────────────────────
// Enums & literal unions
// ──────────────────────────────────────────────

export type UserRole = "user" | "moderator" | "admin";

export type ListingType = "service" | "item";

export type LocationType = "on_campus" | "off_campus" | "remote";

export type ContactPreference = "in_app" | "email" | "phone";

export type ListingStatus = "draft" | "active" | "expired" | "removed" | "sold";

export type ReportReason =
  | "spam"
  | "inappropriate"
  | "prohibited"
  | "scam"
  | "harassment"
  | "other";

export type ReportTargetType = "listing" | "user" | "message";

// ──────────────────────────────────────────────
// Campus
// ──────────────────────────────────────────────

export interface Campus {
  id: string;
  name: string;
  domain: string;
  slug: string;
}

// ──────────────────────────────────────────────
// Users
// ──────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  class_year: number | null;
  bio: string | null;
  phone_number: string | null;
  role: UserRole;
  campus_slug: string;
  campus_name: string | null;
  email_verified: boolean;
  listing_count: number;
  created_at: string;
}

export interface UserBrief {
  id: string;
  display_name: string;
  avatar_url: string | null;
  class_year: number | null;
}

// ──────────────────────────────────────────────
// Categories
// ──────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  listing_type: ListingType;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_regulated?: boolean;
}

export interface CategoryBrief {
  id: string;
  name: string;
  slug: string;
}

// ──────────────────────────────────────────────
// Listings
// ──────────────────────────────────────────────

export interface ListingPhoto {
  id: string;
  url: string;
  thumbnail_url: string | null;
  position: number;
}

export interface Listing {
  id: string;
  type: ListingType;
  title: string;
  description: string;
  price_hint: string | null;
  category: CategoryBrief;
  location_type: LocationType;
  location_hint: string | null;
  availability: string | null;
  contact_preference: ContactPreference;
  is_regulated: boolean;
  status: ListingStatus;
  view_count: number;
  photos: ListingPhoto[];
  user: UserBrief;
  is_favorited: boolean;
  is_own: boolean;
  created_at: string;
  expires_at: string;
}

// ──────────────────────────────────────────────
// Messaging
// ──────────────────────────────────────────────

export interface ThreadListingBrief {
  id: string;
  title: string;
  first_photo_url: string | null;
}

export interface MessageThread {
  id: string;
  listing: ThreadListingBrief | null;
  other_user: UserBrief;
  last_message_preview: string | null;
  unread_count: number;
  last_message_at: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  is_read: boolean;
  is_own: boolean;
  created_at: string;
}

// ──────────────────────────────────────────────
// Reports & moderation
// ──────────────────────────────────────────────

export type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";

export interface Report {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  status: ReportStatus;
  created_at: string;
}

// ──────────────────────────────────────────────
// Pagination
// ──────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ──────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// ──────────────────────────────────────────────
// API errors
// ──────────────────────────────────────────────

export interface ApiError {
  detail: string;
  code: string;
}

// ──────────────────────────────────────────────
// Request / form DTOs
// ──────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
  campus_slug: string;
  phone_number?: string;
  notification_preferences?: {
    notify_email: boolean;
    notify_sms: boolean;
  };
}

export interface CreateListingRequest {
  type: ListingType;
  title: string;
  description: string;
  price_hint?: string | null;
  category_id: string;
  location_type: LocationType;
  location_hint?: string | null;
  availability?: string | null;
  contact_preference: ContactPreference;
  is_regulated: boolean;
}

export interface UpdateListingRequest {
  title?: string;
  description?: string;
  price_hint?: string | null;
  category_id?: string;
  location_type?: LocationType;
  location_hint?: string | null;
  availability?: string | null;
  contact_preference?: ContactPreference;
  is_regulated?: boolean;
}

export interface UpdateProfileRequest {
  display_name?: string;
  bio?: string | null;
  class_year?: number | null;
  phone_number?: string | null;
}

export interface CreateReportRequest {
  target_type: ReportTargetType;
  target_id: string;
  reason: ReportReason;
  description?: string;
}

export interface SendMessageRequest {
  content: string;
}

export interface CreateThreadRequest {
  listing_id: string;
  content: string;
}

// ──────────────────────────────────────────────
// Query parameter shapes
// ──────────────────────────────────────────────

export interface ListingFilters {
  type?: ListingType;
  category_slug?: string;
  location_type?: LocationType;
  search?: string;
  status?: ListingStatus;
  page?: number;
  per_page?: number;
}

export interface ReportFilters {
  status?: ReportStatus;
  target_type?: ReportTargetType;
  page?: number;
  per_page?: number;
}
