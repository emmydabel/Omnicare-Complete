import { authCookies } from "./cookies";
import type { ApiErrorBody } from "./types";

const API_BASE = "https://omnicare-complete.onrender.com/api";

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.detail || `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  /** Flattens DRF's {field: [msg, ...]} validation errors into one readable line. */
  get fieldErrorSummary(): string | null {
    if (!this.body?.errors) return null;
    const parts = Object.entries(this.body.errors).map(
      ([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(" ") : msgs}`
    );
    return parts.join(" · ") || null;
  }
}

// Dedupe concurrent refresh attempts so 5 simultaneous 401s don't fire 5
// refresh requests — they all await the same in-flight promise instead.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = authCookies.refresh;
  if (!refresh) return null;

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = await res.json();
        authCookies.setAccess(data.access);
        // ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION are on server-side,
        // so the old refresh token is now invalid — must persist the new one.
        if (data.refresh) {
          authCookies.set(data.access, data.refresh, authCookies.role ?? "");
        }
        return data.access as string;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function handleAuthFailure() {
  authCookies.clear();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  isFormData?: boolean;
  skipAuthRetry?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, isFormData = false, skipAuthRetry = false } = options;
  const access = authCookies.access;

  const headers: Record<string, string> = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (access) headers["Authorization"] = `Bearer ${access}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
  });

  if (res.status === 401 && !skipAuthRetry) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      return request<T>(path, { ...options, skipAuthRetry: true });
    }
    handleAuthFailure();
    throw new ApiError(401, { detail: "Session expired. Please sign in again.", errors: null });
  }

  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const errorBody: ApiErrorBody = data?.detail
      ? data
      : { detail: summarizeUnknownError(data, res.status), errors: data && typeof data === "object" ? data : null };
    throw new ApiError(res.status, errorBody);
  }

  return data as T;
}

function summarizeUnknownError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const firstKey = Object.keys(data)[0];
    const firstVal = (data as Record<string, unknown>)[firstKey];
    if (firstKey && firstVal) {
      const msg = Array.isArray(firstVal) ? firstVal[0] : firstVal;
      return `${firstKey}: ${msg}`;
    }
  }
  return `Request failed (${status})`;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  postForm: <T>(path: string, form: FormData) => request<T>(path, { method: "POST", body: form, isFormData: true }),
  patchForm: <T>(path: string, form: FormData) => request<T>(path, { method: "PATCH", body: form, isFormData: true }),
};

/** Builds a query string from a params object, skipping empty/undefined values. */
export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") usp.set(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}
