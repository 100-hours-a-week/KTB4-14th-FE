import { storage } from '@/src/storage';
import type { ApiEnvelope, AuthTokens } from '@/src/types';

/**
 * AUDIGO API 연결 통로.
 * 실제 백엔드 연동 시 EXPO_PUBLIC_API_BASE_URL 과 EXPO_PUBLIC_USE_MOCK=false 를 사용한다.
 *
 * API 명세: https://docs.google.com/spreadsheets/d/1TzLjPrQyFacu3QHNvTs71D12u_Yt2-N8eZ9KSzThijs
 * ERD: https://www.erdcloud.com/d/SSauy2XBMtMhpHnNf
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
export const USE_MOCK = (process.env.EXPO_PUBLIC_USE_MOCK ?? 'true') !== 'false';

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
  skipRefresh?: boolean;
};

function withQuery(path: string, query?: RequestOptions['query']) {
  if (!query) return path;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.append(key, String(value));
  });
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await storage.getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE_URL}/users/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return null;

  const json = (await response.json()) as ApiEnvelope<AuthTokens>;
  await storage.setAccessToken(json.data.access_token);
  await storage.setRefreshToken(json.data.refresh_token);
  return json.data.access_token;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = true, skipRefresh } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = await storage.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${withQuery(path, query)}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && auth && !skipRefresh) {
    const next = await refreshAccessToken();
    if (next) {
      return apiRequest<T>(path, { ...options, skipRefresh: true });
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const json = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { message?: string }
    | null;

  if (!response.ok) {
    throw new ApiError(response.status, json && 'message' in json && json.message ? json.message : '요청에 실패했습니다.', json);
  }

  if (json && typeof json === 'object' && 'data' in json) {
    return (json as ApiEnvelope<T>).data;
  }
  return json as T;
}
