const BASE_URL =
  (typeof process !== "undefined" &&
    process.env?.NEXT_PUBLIC_API_URL) ||
  "";

// ---- Server warm-up (wake Render from cold start) ----

let serverWarmedUp = false;
function warmUpServer(): void {
  if (serverWarmedUp || typeof window === "undefined") return;
  serverWarmedUp = true;
  const base = BASE_URL || window.location.origin;
  fetch(`${base}/health`, { method: "GET", mode: "no-cors" }).catch(() => {});
}

// ---- Custom API error class ----

export class ApiError extends Error {
  status: number;
  code: string;
  detail: string;

  constructor(status: number, detail: string, code: string = "unknown") {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

// ---- Network retry helpers ----

const MAX_NETWORK_RETRIES = 2;
const RETRY_DELAYS = [1000, 3000];

async function fetchWithRetry(
  url: string,
  options: RequestInit,
): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_NETWORK_RETRIES; attempt++) {
    try {
      return await fetch(url, options);
    } catch {
      if (attempt < MAX_NETWORK_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      }
    }
  }
  throw new ApiError(
    0,
    "Unable to reach the server. Please check your connection and try again.",
    "network_error",
  );
}

// ---- Token store (in-memory + localStorage for 30-day persistence) ----

const STORAGE_KEY = "cb_session";
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let accessToken: string | null = null;
let refreshToken: string | null = null;

function persistToStorage(access: string, refresh: string): void {
  if (typeof window === "undefined") return;
  try {
    const data = JSON.stringify({ access, refresh, storedAt: Date.now() });
    localStorage.setItem(STORAGE_KEY, data);
  } catch {
    // Storage full or unavailable — continue with in-memory only
  }
}

function clearStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/** Restore tokens from localStorage if they are less than 30 days old. */
export function restoreTokens(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as {
      access: string;
      refresh: string;
      storedAt: number;
    };
    if (Date.now() - data.storedAt > SESSION_MAX_AGE_MS) {
      clearStorage();
      return false;
    }
    accessToken = data.access;
    refreshToken = data.refresh;
    return true;
  } catch {
    clearStorage();
    return false;
  }
}

export function getAccessToken(): string | null {
  if (!accessToken) restoreTokens();
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (!refreshToken) restoreTokens();
  return refreshToken;
}

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
  persistToStorage(access, refresh);
  scheduleProactiveRefresh();
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  clearStorage();
  cancelProactiveRefresh();
}

// ---- Proactive token refresh ----

let proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

function cancelProactiveRefresh(): void {
  if (proactiveRefreshTimer !== null) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
}

/** Decode JWT payload (no verification) to read the `exp` claim. */
function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Schedule a proactive refresh 5 minutes before the access token expires.
 * This avoids the 401→refresh→retry chain entirely.
 */
function scheduleProactiveRefresh(): void {
  cancelProactiveRefresh();
  if (!accessToken) return;

  const exp = getTokenExpiry(accessToken);
  if (!exp) return;

  const nowSec = Math.floor(Date.now() / 1000);
  const refreshInSec = (exp - nowSec) - 5 * 60; // 5 min before expiry

  if (refreshInSec <= 0) return; // Already close to or past expiry — let reactive path handle it

  proactiveRefreshTimer = setTimeout(async () => {
    try {
      await getNewAccessToken();
      // setTokens() is called inside refreshAccessToken on success,
      // which re-schedules the next proactive refresh automatically.
    } catch {
      // Proactive refresh failed — the reactive 401 path will handle it
    }
  }, refreshInSec * 1000);
}

// ---- Token refresh logic ----

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const storedRefresh = refreshToken;
  if (!storedRefresh) {
    clearTokens();
    throw new ApiError(401, "No refresh token available", "no_refresh_token");
  }

  const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: storedRefresh }),
  });

  if (!res.ok) {
    // Only clear tokens on definitive auth rejection (401/403).
    // Network errors and 5xx may be transient — keep tokens for retry.
    if (res.status === 401 || res.status === 403) {
      clearTokens();
    }
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body.detail || "Token refresh failed",
      body.code || "refresh_failed",
    );
  }

  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

// De-duplicates concurrent refresh calls so only one fires at a time.
function getNewAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ---- Core fetch wrapper ----

interface RequestOptions {
  method: string;
  path: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
}

async function apiClient<T>(options: RequestOptions): Promise<T> {
  const { method, path, body, params, skipAuth } = options;

  // Wake the backend on the very first request of the session
  warmUpServer();

  // Build URL with query parameters
  const origin =
    BASE_URL ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000");
  const url = new URL(`${origin}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Ensure tokens are loaded from localStorage before first request
  if (!skipAuth && !accessToken) {
    restoreTokens();
  }
  if (!skipAuth && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const fetchOptions: RequestInit = { method, headers };
  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  let res: Response = await fetchWithRetry(url.toString(), fetchOptions);

  // On 401 attempt one token refresh + retry
  if (res.status === 401 && !skipAuth) {
    if (!refreshToken) restoreTokens();
    if (refreshToken) {
      try {
        const newToken = await getNewAccessToken();
        headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetchWithRetry(url.toString(), { method, headers, body: fetchOptions.body });
      } catch (refreshErr) {
        if (refreshErr instanceof ApiError) throw refreshErr;
        throw new ApiError(401, "Authentication failed", "auth_failed");
      }
    }
  }

  // Handle non-OK responses
  if (!res.ok) {
    let detail = "An unexpected error occurred";
    let code = "unknown";
    try {
      const errBody = await res.json();
      if (typeof errBody.detail === "string") {
        detail = errBody.detail;
      } else if (Array.isArray(errBody.detail)) {
        detail = errBody.detail
          .map((d: { msg: string }) => d.msg)
          .join("; ");
      }
      if (errBody.code) {
        code = errBody.code;
      }
    } catch {
      // response body was not JSON
    }
    throw new ApiError(res.status, detail, code);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ---- Typed helper methods ----

export const api = {
  get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined | null>,
  ): Promise<T> {
    return apiClient<T>({ method: "GET", path, params });
  },

  post<T>(path: string, body?: unknown, skipAuth?: boolean): Promise<T> {
    return apiClient<T>({ method: "POST", path, body, skipAuth });
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return apiClient<T>({ method: "PATCH", path, body });
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return apiClient<T>({ method: "PUT", path, body });
  },

  delete<T = void>(path: string): Promise<T> {
    return apiClient<T>({ method: "DELETE", path });
  },
};
