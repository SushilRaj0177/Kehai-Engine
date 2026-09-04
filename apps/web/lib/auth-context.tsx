"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch, storeTokens, clearTokens, getAccessToken } from "./api";

export interface OrgMembership {
  role: "OWNER" | "ADMIN" | "ORGANIZER" | "VIEWER";
  organization: { id: string; name: string; slug: string };
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
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
    try {
      const data = await apiFetch<{ user: SessionUser; memberships: OrgMembership[] }>("/api/auth/me");
      setUser(data.user);
      setMemberships(data.memberships);
    } catch {
      clearTokens();
      setUser(null);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
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
