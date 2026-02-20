import { create } from "zustand";
import type { User } from "@/lib/types";
import { login as apiLogin, register as apiRegister, logout as apiLogout } from "@/lib/api/auth";
import { getMe } from "@/lib/api/users";
import { ApiError, setTokens, clearTokens, getAccessToken, getRefreshToken, restoreTokens } from "@/lib/api/client";

// ---- Cached user for instant page loads ----
const USER_CACHE_KEY = "cb_user_cache";

function getCachedUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function setCachedUser(user: User | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    // Storage full or unavailable
  }
}

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
    setCachedUser(user);
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
      setCachedUser(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  refreshUser: async () => {
    try {
      const user = await getMe();
      setCachedUser(user);
      set({ user, isAuthenticated: true });
    } catch (err) {
      // Only log out on definitive auth rejection (401/403).
      // Network errors / 5xx are transient — keep cached user.
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearTokens();
        setCachedUser(null);
        set({ user: null, isAuthenticated: false });
      }
    }
  },

  initialize: async () => {
    // Attempt to restore persisted session (survives page refresh for 30 days)
    restoreTokens();
    const token = getAccessToken();
    if (!token) {
      setCachedUser(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    // Immediately use cached user so the page renders without waiting for API
    const cached = getCachedUser();
    if (cached) {
      set({ user: cached, isAuthenticated: true, isLoading: false });
    }

    // Then refresh from server in background
    try {
      const user = await getMe();
      setCachedUser(user);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      // Only log out on definitive auth rejection (401/403).
      // Network errors / 5xx are transient — keep cached user & tokens.
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearTokens();
        setCachedUser(null);
        set({ user: null, isAuthenticated: false, isLoading: false });
      } else if (!cached) {
        // No cached user and server unreachable — show logged-out state
        set({ isLoading: false });
      }
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
