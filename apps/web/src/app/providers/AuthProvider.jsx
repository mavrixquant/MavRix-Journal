// apps/web/src/app/providers/AuthProvider.jsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import * as authService from '@/services/auth.service';
import { setAccessToken, setUnauthorizedHandler } from '@/services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: attempt to restore session via the httpOnly refresh cookie.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { user: u } = await authService.refresh();
        if (!cancelled) setUser(u);
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // If a protected call fails AND refresh fails, log out locally.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken(null);
      setUser(null);
    });
  }, []);

  const signup = useCallback(async (payload) => {
    const { user: u } = await authService.signup(payload);
    setUser(u);
    return u;
  }, []);

  const login = useCallback(async (payload) => {
    const { user: u } = await authService.login(payload);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await authService.fetchMe();
      setUser(u);
      return u;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, signup, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}