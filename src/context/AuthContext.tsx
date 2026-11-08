import { authApi } from '@/api';
import { AUTH_SESSION_EXPIRED_EVENT, AUTH_SESSION_UNAVAILABLE_EVENT, ApiError, getAuthSessionVersion, resetAuthSession, USE_MOCK } from '@/api/client';
import { getJson, setJson, storage } from '@/storage';
import type { AuthUser } from '@/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type AuthContextValue = {
  ready: boolean;
  sessionCheckError: boolean;
  retrySessionCheck: () => Promise<void>;
  user: AuthUser | null;
  sessionVersion: number;
  expireSession: () => void;
  loginWithKakaoCode: (code: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sessionCheckError, setSessionCheckError] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionVersion, setSessionVersion] = useState(0);
  const sessionTask = useRef<AbortController | null>(null);

  const invalidateSession = useCallback(() => {
    sessionTask.current?.abort();
    resetAuthSession();
    setSessionVersion((value) => value + 1);
  }, []);

  const expireSession = useCallback(() => {
    invalidateSession();
    storage.clearSession();
    setUser(null);
    setSessionCheckError(false);
  }, [invalidateSession]);

  const retrySessionCheck = useCallback(async () => {
    const saved = getJson<AuthUser>(storage.keys.user);
    if (!saved || USE_MOCK) {
      setSessionCheckError(false);
      setReady(true);
      return;
    }
    setReady(false);
    const version = getAuthSessionVersion();
    try {
      await authApi.refresh();
      if (version !== getAuthSessionVersion()) return;
      setUser(saved);
      setSessionCheckError(false);
    } catch (error) {
      if (version !== getAuthSessionVersion()) return;
      if (error instanceof ApiError && error.status === 401) {
        expireSession();
      } else {
        setSessionCheckError(true);
      }
    } finally {
      setReady(true);
    }
  }, [expireSession]);

  useEffect(() => {
    void retrySessionCheck();
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, expireSession);
    const onUnavailable = () => setSessionCheckError(true);
    window.addEventListener(AUTH_SESSION_UNAVAILABLE_EVENT, onUnavailable);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== storage.keys.user) return;
      invalidateSession();
      setUser(getJson<AuthUser>(storage.keys.user));
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, expireSession);
      window.removeEventListener(AUTH_SESSION_UNAVAILABLE_EVENT, onUnavailable);
      window.removeEventListener('storage', onStorage);
    };
  }, [expireSession, invalidateSession, retrySessionCheck]);

  const loginWithKakaoCode = useCallback(async (code: string) => {
    invalidateSession();
    const controller = new AbortController();
    sessionTask.current = controller;
    storage.clearSession();
    setUser(null);
    const result = await authApi.loginWithKakao(code, controller.signal);
    if (controller.signal.aborted) throw new DOMException('Session changed', 'AbortError');
    setJson(storage.keys.user, result);
    setUser(result);
    setSessionCheckError(false);
    return result;
  }, [invalidateSession]);

  const logout = useCallback(async () => {
    expireSession();
    const controller = new AbortController();
    sessionTask.current = controller;
    try {
      await authApi.logout(controller.signal);
    } catch {
      // 토큰 폐기 실패해도 로컬 세션은 종료한다.
    }
  }, [expireSession]);

  const updateNickname = useCallback(async (nickname: string) => {
    setUser((prev) => (prev ? { ...prev, nickname } : prev));
    const saved = getJson<AuthUser>(storage.keys.user);
    if (saved) setJson(storage.keys.user, { ...saved, nickname });
  }, []);

  const value = useMemo(
    () => ({ ready, user, sessionCheckError, retrySessionCheck, sessionVersion, expireSession, loginWithKakaoCode, logout, updateNickname }),
    [ready, user, sessionCheckError, retrySessionCheck, sessionVersion, expireSession, loginWithKakaoCode, logout, updateNickname],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
