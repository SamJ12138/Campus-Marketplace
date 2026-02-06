const BASE_URL =
  (typeof process !== "undefined" &&
    process.env?.NEXT_PUBLIC_API_URL) ||
  "";

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
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  clearStorage();
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
    clearTokens();
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

  let res: Response;
  try {
    res = await fetch(url.toString(), fetchOptions);
  } catch (err) {
    throw new ApiError(
      0,
      err instanceof Error ? err.message : "Network request failed",
      "network_error",
    );
  }

  // On 401 attempt one token refresh + retry
  if (res.status === 401 && !skipAuth) {
    if (!refreshToken) restoreTokens();
    if (refreshToken) {
      try {
        const newToken = await getNewAccessToken();
        headers["Authorization"] = `Bearer ${newToken}`;
        try {
          res = await fetch(url.toString(), { method, headers, body: fetchOptions.body });
        } catch (err) {
          throw new ApiError(
            0,
            err instanceof Error ? err.message : "Network request failed on retry",
            "network_error",
          );
        }
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
