import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as api from "../api";
import type { User } from "../types";

interface AuthValue {
  user: User | null;
  /** True until the stored token has been checked against the server. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    api.setToken(null);
    setUser(null);
  }, []);

  // A token rejected mid-session (expired, or the user was removed) should drop
  // us back to a logged-out state rather than leaving a broken shell on screen.
  useEffect(() => {
    api.setUnauthorizedHandler(() => setUser(null));
    return () => api.setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (!api.getToken()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) api.setToken(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: me } = await api.login(email, password);
    api.setToken(token);
    setUser(me);
  }, []);

  const signup = useCallback(async (email: string, name: string, password: string) => {
    const { token, user: me } = await api.signup(email, name, password);
    api.setToken(token);
    setUser(me);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout }),
    [user, loading, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
