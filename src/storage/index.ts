import type { CreateTravelPlanRequest } from '@/types';

const KEYS = {
  user: 'audigo.user',
  travelDraft: 'audigo.travel_draft',
  travelGenerationRequests: 'audigo.travel_generation_requests',
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

export function saveTravelGenerationRequest(
  travelPlanId: number,
  request: CreateTravelPlanRequest,
) {
  const requests = getJson<Record<string, CreateTravelPlanRequest>>(
    KEYS.travelGenerationRequests,
  ) ?? {};
  requests[String(travelPlanId)] = request;
  setJson(KEYS.travelGenerationRequests, requests);
}

export function getTravelGenerationRequest(travelPlanId: number) {
  const requests = getJson<Record<string, CreateTravelPlanRequest>>(
    KEYS.travelGenerationRequests,
  );
  return requests?.[String(travelPlanId)] ?? null;
}

export const storage = {
  keys: KEYS,
  clearSession() {
    write(KEYS.user, null);
    write('audigo.access_token', null);
    write('audigo.refresh_token', null);
  },
};
