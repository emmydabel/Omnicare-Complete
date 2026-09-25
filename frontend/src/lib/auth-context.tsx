"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "./api-client";
import { authCookies } from "./cookies";
import type { AuthResponse, User } from "./types";

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  date_of_birth?: string;
  gender?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const hydrate = useCallback(async () => {
    if (!authCookies.access) {
      setLoading(false);
      return;
    }
    try {
      const me = await api.get<User>("/auth/me/");
      setUser(me);
    } catch {
      // Access cookie was stale/invalid and the refresh-on-401 path (inside
      // the api client) already cleared cookies if it couldn't recover.
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<AuthResponse>("/auth/login/", { email, password });
    authCookies.set(data.access, data.refresh, data.user.role);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await api.post<AuthResponse>("/auth/register/", payload);
    authCookies.set(data.access, data.refresh, data.user.role);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refresh = authCookies.refresh;
    authCookies.clear();
    setUser(null);
    if (refresh) {
      // Best-effort server-side token blacklist — don't block the UI on it.
      api.post("/auth/logout/", { refresh }).catch(() => {});
    }
    router.push("/login");
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.get<User>("/auth/me/");
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
