// Resolved at request time from a server-injected value (see app/layout.tsx +
// components/ApiBaseSetter.tsx), falling back to the build-time
// NEXT_PUBLIC_API_URL for local dev. This deliberately avoids requiring the
// API's URL to be known at Docker *build* time — a platform-agnostic
// choice, not a workaround for one host.
let resolvedApiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function configureApiBase(url: string) {
  if (url) resolvedApiBase = url;
}

export function getApiBase(): string {
  return resolvedApiBase;
}

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

// Refresh tokens are single-use and rotate on every refresh — the server
// invalidates the old one the moment it issues a new pair. With multiple
// tabs open on the same origin (sharing this one localStorage entry), two
// tabs can both notice an expired access token and race to refresh at
// once: whichever hits the server first rotates the token and wins, and
// the other tab's refresh legitimately fails because *its* copy was just
// invalidated by the winner — not because the session is actually dead.
// Blindly clearing tokens on that failure would wipe out the perfectly
// valid pair the winning tab just wrote, logging the user out for no
// reason. So a failure only clears the session if the refresh token on
// file is still the same one we just tried — if it already changed,
// another tab won the race and the session is fine.
async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = getStoredTokens();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(`${resolvedApiBase}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) {
          if (getStoredTokens().refreshToken === refreshToken) clearTokens();
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

  let res = await fetch(`${resolvedApiBase}${path}`, { ...init, headers });

  if (res.status === 401 && !skipAuth) {
    // If our own refresh attempt fails because another tab already won a
    // rotation race (see refreshAccessToken above), storage may still hold
    // a perfectly valid token that tab just wrote — use it instead of
    // treating this request as unauthenticated.
    const newToken = (await refreshAccessToken()) ?? getStoredTokens().accessToken;
    if (newToken && newToken !== accessToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      res = await fetch(`${resolvedApiBase}${path}`, { ...init, headers });
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
