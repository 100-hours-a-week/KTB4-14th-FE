const KEYS = {
  accessToken: 'audigo.access_token',
  refreshToken: 'audigo.refresh_token',
  user: 'audigo.user',
  travelDraft: 'audigo.travel_draft',
} as const;

function read(key: string) {
  return localStorage.getItem(key);
}

function write(key: string, value: string | null) {
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
}

export function getJson<T>(key: string): T | null {
  const raw = read(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setJson(key: string, value: unknown) {
  write(key, JSON.stringify(value));
}

export const storage = {
  keys: KEYS,
  getAccessToken() {
    return read(KEYS.accessToken);
  },
  setAccessToken(token: string | null) {
    write(KEYS.accessToken, token);
  },
  getRefreshToken() {
    return read(KEYS.refreshToken);
  },
  setRefreshToken(token: string | null) {
    // TODO(auth): Refresh Token은 HttpOnly Secure Cookie 관리가 확정되면 이 저장소를 제거한다.
    write(KEYS.refreshToken, token);
  },
  clearSession() {
    write(KEYS.accessToken, null);
    write(KEYS.refreshToken, null);
    write(KEYS.user, null);
  },
};
