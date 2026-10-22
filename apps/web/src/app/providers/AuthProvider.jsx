import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import * as authService from '@/features/auth/api';
import {
  setAccessToken,
  setUnauthorizedHandler,
  setTwoFactorRequiredHandler,
} from '@/shared/api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending2FA, setPending2FA] = useState(null);

  // ---- bootstrap -----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    (async () => {
      try {
        const result = await authService.refresh();
        if (cancelled) return;
        if (result.requiresTwoFactor) {
          setPending2FA({
            sessionToken: result.sessionToken,
            methods: result.methods || [],
            reason: result.reason || 'reauth',
          });
          setUser(null);
        } else {
          setUser(result.user);
        }
      } catch (err) {
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
          if (import.meta.env.PROD) {
            console.warn(
              `[auth] bootstrap FAILED in ${Date.now() - startedAt}ms`,
              err?.message || err
            );
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ---- unauthorized handler -----------------------------------------------
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken(null);
      setUser(null);
    });
    setTwoFactorRequiredHandler((data) => {
      setPending2FA({
        sessionToken: data.sessionToken,
        methods: data.methods || [],
        reason: data.reason || 'reauth',
      });
      setUser(null);
    });
    return () => {
      setUnauthorizedHandler(null);
      setTwoFactorRequiredHandler(null);
    };
  }, []);

  // ---- actions -------------------------------------------------------------
  const signup = useCallback(async (payload) => {
    const { user: u } = await authService.signup(payload);
    setUser(u);
    return u;
  }, []);

  const login = useCallback(async (payload) => {
    const result = await authService.login(payload);
    if (result.requiresTwoFactor) {
      setPending2FA({
        sessionToken: result.sessionToken,
        methods: result.methods || [],
        reason: result.reason || 'login',
      });
      return result;
    }
    setUser(result.user);
    return result.user;
  }, []);

  const googleLogin = useCallback(async (googleAccessToken) => {
    const result = await authService.googleLogin(googleAccessToken);
    if (result.requiresTwoFactor) {
      setPending2FA({
        sessionToken: result.sessionToken,
        methods: result.methods || [],
        reason: result.reason || 'login',
      });
      return result;
    }
    setUser(result.user);
    return result.user;
  }, []);

  const verifyTwoFactor = useCallback(
    async ({ method, code }) => {
      if (!pending2FA) throw new Error('No pending 2FA challenge');
      const result = await authService.verifyTwoFactor(pending2FA.sessionToken, {
        method,
        code,
      });
      setPending2FA(null);
      setUser(result.user);
      return result.user;
    },
    [pending2FA]
  );

  const clearTwoFactor = useCallback(() => {
    setPending2FA(null);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setPending2FA(null);
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
      value={{
        user,
        loading,
        pending2FA,
        signup,
        login,
        googleLogin,
        verifyTwoFactor,
        clearTwoFactor,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}