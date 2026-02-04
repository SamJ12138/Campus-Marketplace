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
  return api.post<void>(`/api/v1/users/${userId}/block`, { reason });
}

export async function unblockUser(userId: string): Promise<void> {
  return api.delete(`/api/v1/users/${userId}/block`);
}

export async function getBlockedUsers(): Promise<UserBrief[]> {
  return api.get<UserBrief[]>("/api/v1/users/me/blocked");
}
