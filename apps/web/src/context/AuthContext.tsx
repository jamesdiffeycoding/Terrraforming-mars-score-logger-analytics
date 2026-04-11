import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  cognitoSub: string;
}

interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setTokensAfterVerify: (tokens: AuthTokens) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'tm_auth';

function loadStoredTokens(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthTokens) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens | null>(loadStoredTokens);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(!!loadStoredTokens());

  useEffect(() => {
    if (!tokens) { setIsLoading(false); return; }
    fetchMe(tokens.idToken)
      .then(setUser)
      .catch(() => { clearAuth(); })
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistTokens(t: AuthTokens) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    setTokens(t);
  }

  function clearAuth() {
    localStorage.removeItem(STORAGE_KEY);
    setTokens(null);
    setUser(null);
  }

  async function fetchMe(idToken: string): Promise<AuthUser> {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) throw new Error('Unauthorized');
    return res.json() as Promise<AuthUser>;
  }

  async function login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = (await res.json()) as { message?: string };
      throw new Error(body.message ?? 'Login failed');
    }
    const data = (await res.json()) as AuthTokens;
    persistTokens(data);
    const me = await fetchMe(data.idToken);
    setUser(me);
  }

  function logout() {
    clearAuth();
  }

  function setTokensAfterVerify(t: AuthTokens) {
    persistTokens(t);
  }

  return (
    <AuthContext.Provider value={{ user, tokens, isLoading, login, logout, setTokensAfterVerify }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
