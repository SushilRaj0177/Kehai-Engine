"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch, storeTokens, clearTokens, getAccessToken, ApiError } from "./api";

export interface OrgMembership {
  role: "OWNER" | "ADMIN" | "ORGANIZER" | "VIEWER";
  organization: { id: string; name: string; slug: string };
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  provider?: "PASSWORD" | "GOOGLE";
  emailNotificationsEnabled?: boolean;
  emailVerifiedAt?: string | null;
}

interface AuthState {
  user: SessionUser | null;
  memberships: OrgMembership[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!getAccessToken()) {
      setUser(null);
      setMemberships([]);
      setLoading(false);
      return;
    }

    // A definitive 401 means the server itself rejected the token — the
    // session really is dead, so clearing it is correct. Anything else
    // (a network error, a timeout, a 5xx, the free-tier API cold-starting
    // after it's been idle) is transient and has nothing to do with
    // whether the token is valid — wiping the stored tokens over one of
    // those was forcing a real logout on every reload that happened to
    // land during a brief hiccup, especially under concurrent load from
    // more than one signed-in session at once. Retry a few times before
    // giving up, and even then leave the tokens in storage so the very
    // next successful request anywhere in the app can still recover the
    // session — only this render treats the user as signed out.
    const attempt = async (retriesLeft: number): Promise<void> => {
      try {
        const data = await apiFetch<{ user: SessionUser; memberships: OrgMembership[] }>("/api/auth/me");
        setUser(data.user);
        setMemberships(data.memberships);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearTokens();
          setUser(null);
          setMemberships([]);
          return;
        }
        if (retriesLeft > 0) {
          await new Promise((resolve) => setTimeout(resolve, (4 - retriesLeft) * 1500));
          return attempt(retriesLeft - 1);
        }
        setUser(null);
        setMemberships([]);
      }
    };

    await attempt(3);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{ user: SessionUser; accessToken: string; refreshToken: string }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }), skipAuth: true }
      );
      storeTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      await refreshProfile();
    },
    [refreshProfile]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const data = await apiFetch<{ user: SessionUser; accessToken: string; refreshToken: string }>(
        "/api/auth/register",
        { method: "POST", body: JSON.stringify({ name, email, password }), skipAuth: true }
      );
      storeTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      await refreshProfile();
    },
    [refreshProfile]
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    setMemberships([]);
  }, []);

  return (
    <AuthContext.Provider value={{ user, memberships, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
