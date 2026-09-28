import type { Page, Response } from '@playwright/test';
import { API_BASE_URL, apiPathOf } from './env';

/**
 * 실제 백엔드 응답 대기.
 * mock 으로 끼워 넣은 예외 응답(api.once 등)과 구분하려면 predicate 로 status 를 거른다.
 */
export function waitForApi(
  page: Page,
  method: string,
  path: string | RegExp,
  predicate: (response: Response) => boolean = () => true,
) {
  return page.waitForResponse((response) => {
    if (response.request().method() !== method) return false;
    const url = new URL(response.url());
    if (!response.url().startsWith(API_BASE_URL)) return false;
    const matched = typeof path === 'string' ? apiPathOf(url) === path : path.test(apiPathOf(url));
    return matched && predicate(response);
  });
}

/** `{ message, data }` 봉투의 data */
export async function dataOf<T>(response: Response): Promise<T> {
  const json = await response.json();
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

export type LiveTripSummary = {
  travel_plan_id: number;
  title: string;
  status?: string;
  start_date?: string;
  end_date?: string;
};

/** 실제 현재 시각 기준 미래 날짜: 다음 달 10~11일(1박 2일) */
export const LIVE_BASIC = { monthOffset: 1, startDay: 10, endDay: 11 } as const;

/** 오늘 날짜(Asia/Seoul, YYYY-MM-DD) */
export function todayKst() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

type LiveItineraryDay = {
  day_number: number;
  items: Array<{
    itinerary_item_id: number;
    place_name: string | null;
    latitude: number | null;
    longitude: number | null;
    start_time: string | null;
    end_time: string | null;
    is_completed: boolean;
  }>;
};

/** GET /api/travel-plans/:id/itinerary — 백엔드는 days 로 주고, 명세는 itinerary_days (앱 normalizeItinerary 와 같이 둘 다 받는다) */
export type LiveItinerary = {
  travel_plan_id: number;
  title: string;
  end_date: string;
  days?: LiveItineraryDay[];
  itinerary_days?: LiveItineraryDay[];
};
