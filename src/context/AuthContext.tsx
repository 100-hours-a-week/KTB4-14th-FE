import { authApi } from '@/src/api';
import { getJson, setJson, storage } from '@/src/storage';
import type { AuthUser } from '@/src/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type AuthContextValue = {
  ready: boolean;
  user: AuthUser | null;
  loginWithKakaoCode: (code: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    (async () => {
      const saved = await getJson<AuthUser>(storage.keys.user);
      const token = await storage.getAccessToken();
      if (saved && token) setUser(saved);
      setReady(true);
    })();
  }, []);

  const loginWithKakaoCode = useCallback(async (code: string) => {
    const result = await authApi.loginWithKakao(code);
    await storage.setAccessToken(result.access_token);
    await storage.setRefreshToken(result.refresh_token);
    await setJson(storage.keys.user, result.user);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    const refresh = await storage.getRefreshToken();
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {
        // 토큰 폐기 실패해도 로컬 세션은 종료한다.
      }
    }
    await storage.clearSession();
    setUser(null);
  }, []);

  const updateNickname = useCallback(async (nickname: string) => {
    setUser((prev) => (prev ? { ...prev, nickname } : prev));
    const saved = await getJson<AuthUser>(storage.keys.user);
    if (saved) await setJson(storage.keys.user, { ...saved, nickname });
  }, []);

  const value = useMemo(
    () => ({ ready, user, loginWithKakaoCode, logout, updateNickname }),
    [ready, user, loginWithKakaoCode, logout, updateNickname],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
