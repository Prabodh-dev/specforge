import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  loginApi,
  logoutApi,
  meApi,
  refreshApi,
  registerApi,
  type User,
} from "../lib/auth";

type AuthState = {
  token: string | null;
  user: User | null;
  isBooting: boolean;
};

type AuthCtx = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    name?: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setToken: (t: string | null) => void;
};

const AuthContext = createContext<AuthCtx | null>(null);

const TOKEN_KEY = "specforge_access_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<User | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      console.log("AuthProvider booting...");
      try {
        if (token) {
          console.log("Found token, calling /me");
          const me = await meApi(token);
          if (!cancelled) setUser(me.user);
          console.log("User loaded:", me.user);
          return;
        }

        console.log("No token, trying refresh");
        const refreshed = await refreshApi();
        if (cancelled) return;
        setToken(refreshed.accessToken);

        const me = await meApi(refreshed.accessToken);
        if (!cancelled) setUser(me.user);
        console.log("User loaded from refresh:", me.user);
      } catch (err) {
        console.log("Auth boot failed:", err);
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        console.log("Boot complete, isBooting = false");
        if (!cancelled) setIsBooting(false);
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    const res = await loginApi({ email, password });
    setToken(res.accessToken);
    setUser(res.user);
  }

  async function register(payload: {
    name?: string;
    email: string;
    password: string;
  }) {
    const res = await registerApi(payload);
    setToken(res.accessToken);
    setUser(res.user);
  }

  async function logout() {
    try {
      await logoutApi();
    } finally {
      setToken(null);
      setUser(null);
    }
  }

  const value = useMemo<AuthCtx>(
    () => ({ token, user, isBooting, login, register, logout, setToken }),
    [token, user, isBooting],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
