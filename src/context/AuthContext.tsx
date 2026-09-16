import { authApi } from '@/api';
import { getJson, setJson, storage } from '@/storage';
import type { AuthUser } from '@/types';
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
    const saved = getJson<AuthUser>(storage.keys.user);
    if (saved) setUser(saved);
    setReady(true);
  }, []);

  const loginWithKakaoCode = useCallback(async (code: string) => {
    const result = await authApi.loginWithKakao(code);
    setJson(storage.keys.user, result);
    setUser(result);
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // 토큰 폐기 실패해도 로컬 세션은 종료한다.
    }
    storage.clearSession();
    setUser(null);
  }, []);

  const updateNickname = useCallback(async (nickname: string) => {
    setUser((prev) => (prev ? { ...prev, nickname } : prev));
    const saved = getJson<AuthUser>(storage.keys.user);
    if (saved) setJson(storage.keys.user, { ...saved, nickname });
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
