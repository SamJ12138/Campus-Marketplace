import type { User, UserBrief, UpdateProfileRequest } from "@/lib/types";
import { api } from "./client";

export async function getMe(): Promise<User> {
  return api.get<User>("/api/v1/users/me");
}

export async function updateProfile(
  data: UpdateProfileRequest,
): Promise<User> {
  return api.patch<User>("/api/v1/users/me", data);
}

export async function changePassword(
  current_password: string,
  new_password: string,
): Promise<void> {
  return api.post<void>("/api/v1/users/me/change-password", {
    current_password,
    new_password,
  });
}

export async function getUserProfile(userId: string): Promise<User> {
  return api.get<User>(`/api/v1/users/${userId}`);
}

export async function blockUser(
  userId: string,
  reason?: string,
): Promise<void> {
  return api.post<void>("/api/v1/blocks", { user_id: userId, reason });
}

export async function unblockUser(userId: string): Promise<void> {
  return api.delete(`/api/v1/blocks/${userId}`);
}

export async function getBlockedUsers(): Promise<UserBrief[]> {
  return api.get<UserBrief[]>("/api/v1/blocks");
}

export async function deleteAccount(): Promise<void> {
  return api.delete("/api/v1/users/me");
}

export type DigestFrequency = "none" | "daily" | "weekly";

export interface NotificationPreferences {
  email_messages: boolean;
  email_listing_replies: boolean;
  email_report_updates: boolean;
  email_marketing: boolean;
  // Digest preferences
  digest_frequency: DigestFrequency;
  email_price_drops: boolean;
  email_listing_expiry: boolean;
  email_recommendations: boolean;
  // Smart timing
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return api.get<NotificationPreferences>("/api/v1/users/me/notifications");
}

export async function updateNotificationPreferences(
  data: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  return api.patch<NotificationPreferences>("/api/v1/users/me/notifications", data);
}
