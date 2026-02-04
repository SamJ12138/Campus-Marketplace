import type { Campus, TokenResponse } from "@/lib/types";
import { api } from "./client";

export async function login(
  email: string,
  password: string,
): Promise<TokenResponse> {
  return api.post<TokenResponse>(
    "/api/v1/auth/login",
    { email, password },
    true,
  );
}

export async function register(
  email: string,
  password: string,
  display_name: string,
  campus_slug: string,
  class_year?: number,
  phone_number?: string,
  notification_preferences?: { notify_email: boolean; notify_sms: boolean },
): Promise<{ message: string; user_id: string }> {
  return api.post<{ message: string; user_id: string }>(
    "/api/v1/auth/register",
    { email, password, display_name, campus_slug, class_year, phone_number, notification_preferences },
    true,
  );
}

export async function logout(refresh_token: string): Promise<void> {
  return api.post<void>("/api/v1/auth/logout", { refresh_token });
}

export async function refreshTokenApi(
  refresh_token: string,
): Promise<TokenResponse> {
  return api.post<TokenResponse>(
    "/api/v1/auth/refresh",
    { refresh_token },
    true,
  );
}

export async function verifyEmail(
  token: string,
): Promise<{ message: string }> {
  return api.post<{ message: string }>(
    "/api/v1/auth/verify-email",
    { token },
    true,
  );
}

export async function resendVerification(
  email: string,
): Promise<{ message: string }> {
  return api.post<{ message: string }>(
    "/api/v1/auth/resend-verification",
    { email },
    true,
  );
}

export async function forgotPassword(
  email: string,
): Promise<{ message: string }> {
  return api.post<{ message: string }>(
    "/api/v1/auth/forgot-password",
    { email },
    true,
  );
}

export async function resetPassword(
  token: string,
  new_password: string,
): Promise<{ message: string }> {
  return api.post<{ message: string }>(
    "/api/v1/auth/reset-password",
    { token, new_password },
    true,
  );
}

export async function getCampuses(): Promise<Campus[]> {
  return api.get<Campus[]>("/api/v1/campuses");
}
