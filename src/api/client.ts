import type { ApiEnvelope } from '@/types';

/**
 * AUDIGO API 연결 통로.
 * 실제 백엔드 연동 시 VITE_API_BASE_URL 과 VITE_USE_MOCK=false 를 사용한다.
 *
 * API 명세: https://docs.google.com/spreadsheets/d/1TzLjPrQyFacu3QHNvTs71D12u_Yt2-N8eZ9KSzThijs
 * ERD: https://www.erdcloud.com/d/SSauy2XBMtMhpHnNf
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';

export class ApiError extends Error {
  status: number;
  payload?: unknown;
  retryAfterSeconds?: number;

  constructor(status: number, message: string, payload?: unknown, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.payload = payload;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  auth?: boolean;
  skipRefresh?: boolean;
  signal?: AbortSignal;
};

let sessionVersion = 0;
let refreshFlight: { controller: AbortController; promise: Promise<boolean> } | null = null;

export function getAuthSessionVersion() {
  return sessionVersion;
}

export function resetAuthSession() {
  sessionVersion += 1;
  refreshFlight?.controller.abort();
  refreshFlight = null;
}

function withQuery(path: string, query?: RequestOptions['query']) {
  if (!query) return path;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.append(key, String(value));
  });
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function refreshAccessToken(): Promise<boolean> {
  if (refreshFlight) return refreshFlight.promise;
  const controller = new AbortController();
  const version = sessionVersion;
  const flight = { controller, promise: Promise.resolve(false) };
  refreshFlight = flight;
  flight.promise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) return false;
      if (!response.ok) throw new ApiError(response.status, '토큰 갱신에 실패했습니다.');
      await response.json().catch(() => null);
      return version === sessionVersion && !controller.signal.aborted;
    } catch (error) {
      if (controller.signal.aborted) return false;
      throw error;
    } finally {
      if (refreshFlight === flight) refreshFlight = null;
    }
  })();
  return flight.promise;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const version = sessionVersion;
  const { method = 'GET', body, query, auth = true, skipRefresh } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_BASE_URL}${withQuery(path, query)}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include',
    signal: options.signal,
  });

  if (auth && version !== sessionVersion) throw new DOMException('Session changed', 'AbortError');

  if (response.status === 401 && auth && !skipRefresh) {
    if (await refreshAccessToken()) {
      if (version !== sessionVersion || options.signal?.aborted) throw new DOMException('Session changed', 'AbortError');
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

  if (auth && version !== sessionVersion) throw new DOMException('Session changed', 'AbortError');

  if (!response.ok) {
    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfterSeconds = retryAfterHeader && /^\d+$/.test(retryAfterHeader)
      ? Number(retryAfterHeader)
      : undefined;
    throw new ApiError(
      response.status,
      json && 'message' in json && json.message ? json.message : '요청에 실패했습니다.',
      json,
      retryAfterSeconds,
    );
  }

  if (json && typeof json === 'object' && 'data' in json) {
    return (json as ApiEnvelope<T>).data;
  }
  return json as T;
}
