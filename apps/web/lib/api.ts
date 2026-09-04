export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function getStoredTokens(): { accessToken?: string; refreshToken?: string } {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("kehai.session");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function storeTokens(tokens: { accessToken: string; refreshToken: string }) {
  if (typeof window === "undefined") return;
  localStorage.setItem("kehai.session", JSON.stringify(tokens));
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("kehai.session");
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = getStoredTokens();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) {
          clearTokens();
          return null;
        }
        const data = await res.json();
        storeTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
        return data.accessToken as string;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean; raw?: boolean } = {}
): Promise<T> {
  const { skipAuth, raw, ...init } = options;
  const { accessToken } = getStoredTokens();

  const headers = new Headers(init.headers);
  if (!raw) headers.set("Content-Type", "application/json");
  if (accessToken && !skipAuth) headers.set("Authorization", `Bearer ${accessToken}`);

  let res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(`${API_BASE}${path}`, { ...init, headers });
    }
  }

  if (!res.ok) {
    let message = res.statusText;
    let code: string | undefined;
    let details: unknown;
    try {
      const body = await res.json();
      message = body?.error?.message ?? message;
      code = body?.error?.code;
      details = body?.error?.details;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, message, code, details);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getAccessToken(): string | undefined {
  return getStoredTokens().accessToken;
}
