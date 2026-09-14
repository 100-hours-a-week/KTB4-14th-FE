import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  accessToken: 'audigo.access_token',
  refreshToken: 'audigo.refresh_token',
  user: 'audigo.user',
  travelDraft: 'audigo.travel_draft',
} as const;

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  keys: KEYS,
  async getAccessToken() {
    return AsyncStorage.getItem(KEYS.accessToken);
  },
  async setAccessToken(token: string | null) {
    if (token) await AsyncStorage.setItem(KEYS.accessToken, token);
    else await AsyncStorage.removeItem(KEYS.accessToken);
  },
  async getRefreshToken() {
    return AsyncStorage.getItem(KEYS.refreshToken);
  },
  async setRefreshToken(token: string | null) {
    // TODO(auth): Refresh Token은 HttpOnly Secure Cookie 관리가 확정되면 이 저장소를 제거한다.
    if (token) await AsyncStorage.setItem(KEYS.refreshToken, token);
    else await AsyncStorage.removeItem(KEYS.refreshToken);
  },
  async clearSession() {
    await Promise.all([
      AsyncStorage.removeItem(KEYS.accessToken),
      AsyncStorage.removeItem(KEYS.refreshToken),
      AsyncStorage.removeItem(KEYS.user),
    ]);
  },
};
