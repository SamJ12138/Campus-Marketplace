import { create } from "zustand";
import type { User } from "@/lib/types";
import { login as apiLogin, register as apiRegister, logout as apiLogout } from "@/lib/api/auth";
import { getMe } from "@/lib/api/users";
import { setTokens, clearTokens, getAccessToken, getRefreshToken, restoreTokens } from "@/lib/api/client";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    display_name: string,
    campus_slug: string,
    class_year?: number,
    phone_number?: string,
    notification_preferences?: { notify_email: boolean; notify_sms: boolean },
  ) => Promise<{ message: string; user_id: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, _get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const tokens = await apiLogin(email, password);
    setTokens(tokens.access_token, tokens.refresh_token);

    const user = await getMe();
    set({ user, isAuthenticated: true, isLoading: false });
  },

  register: async (
    email: string,
    password: string,
    display_name: string,
    campus_slug: string,
    class_year?: number,
    phone_number?: string,
    notification_preferences?: { notify_email: boolean; notify_sms: boolean },
  ) => {
    const result = await apiRegister(
      email,
      password,
      display_name,
      campus_slug,
      class_year,
      phone_number,
      notification_preferences,
    );
    return result;
  },

  logout: async () => {
    const refresh = getRefreshToken();
    try {
      if (refresh) {
        await apiLogout(refresh);
      }
    } catch {
      // Logout endpoint failure should not block client-side cleanup
    } finally {
      clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  refreshUser: async () => {
    try {
      const user = await getMe();
      set({ user, isAuthenticated: true });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false });
    }
  },

  initialize: async () => {
    // Attempt to restore persisted session (survives page refresh for 30 days)
    restoreTokens();
    const token = getAccessToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const user = await getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: user !== null });
  },
}));

/**
 * Convenience hook that selects the entire auth store.
 * Components can also use useAuthStore with a selector for finer control:
 *   const user = useAuthStore((s) => s.user);
 */
export function useAuth() {
  return useAuthStore();
}
