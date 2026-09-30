/**
 * 목(mock) 백엔드가 돌려주는 테스트 데이터 팩토리.
 * 필드 형태는 src/api/*.ts 가 기대하는 "백엔드 응답" 기준이다(화면용 타입이 아님).
 */

export type AuthUser = {
  user_id: number;
  nickname: string;
  profile_image_url: string | null;
  is_new_user: boolean;
};

export type Region = { region_id: number; name: string; full_name: string };

export type KakaoPlace = {
  provider: 'KAKAO';
  provider_place_id: string;
  place_name: string;
  address: string | null;
  road_address: string | null;
  latitude: number;
  longitude: number;
};

export type TravelSummary = {
  travel_plan_id: number;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: 'GENERATING' | 'COMPLETED' | 'FAILED';
  companion_label?: string;
  cover_color?: string;
  /** 진행률 표시용(ITIN-01). 백엔드 필드명 확정 전 가정값 */
  completed_place_count?: number;
  total_place_count?: number;
};

export type BackendItem = {
  itinerary_item_id: number;
  travel_plan_place_id: number;
  provider: 'KAKAO';
  provider_place_id: string;
  place_name: string | null;
  place_type: 'RESTAURANT' | 'ACCOMMODATION' | 'TOURISM';
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  start_time: string;
  end_time: string;
  item_type: 'PLACE';
  is_completed: boolean;
  completed_at: string | null;
};

export type BackendRoute = {
  route_segment_id: number;
  from_itinerary_item_id: number;
  to_itinerary_item_id: number;
  transport_type: 'WALK' | 'CAR' | 'PUBLIC_TRANSPORT';
  duration_minutes: number | null;
  distance_meter: number | null;
  total_fare_amount: number | null;
  order: number;
  line_name?: string | null;
  vehicle_number?: string | null;
  boarding_stop_name?: string | null;
  alighting_stop_name?: string | null;
  next_arrival_minutes?: number | null;
  estimated_departure_at?: string | null;
  estimated_arrival_at?: string | null;
  realtime?: boolean;
  last_refreshed_at?: string | null;
};

export type BackendDay = {
  itinerary_day_id: number;
  day_number: number;
  date: string;
  items: BackendItem[];
  routes: BackendRoute[];
};

export type BackendItinerary = {
  travel_plan_id: number;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: 'GENERATING' | 'COMPLETED' | 'FAILED';
  nights: number;
  day_count: number;
  companion_type?: string;
  recommended_music?: Array<{ track_id: number; title: string; artist: string }>;
  itinerary_days: BackendDay[];
};

export type AppNotification = {
  notification_id: number;
  type: 'MATCH_SUCCESS' | 'NEW_MESSAGE' | 'TRAVEL_BEFORE' | 'TRAVEL_COMPLETE' | 'TRAVEL_FAILED';
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  travel_plan_id?: number;
  target_type?: 'TRAVEL_PLAN';
  target_id?: number;
};

export function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return { user_id: 1, nickname: '송월', profile_image_url: null, is_new_user: false, ...overrides };
}

export function regions(): Region[] {
  return [
    { region_id: 11, name: '종로구', full_name: '서울특별시 종로구' },
    { region_id: 12, name: '중구', full_name: '서울특별시 중구' },
    { region_id: 13, name: '강남구', full_name: '서울특별시 강남구' },
    { region_id: 21, name: '해운대구', full_name: '부산광역시 해운대구' },
  ];
}

function kakaoPlace(id: string, name: string, address: string, lat: number, lng: number): KakaoPlace {
  return {
    provider: 'KAKAO',
    provider_place_id: id,
    place_name: name,
    address,
    road_address: address,
    latitude: lat,
    longitude: lng,
  };
}

export function kakaoPlaces(): KakaoPlace[] {
  return [
    kakaoPlace('1001', '경복궁', '서울 종로구 사직로 161', 37.5796, 126.977),
    kakaoPlace('1002', '광장시장', '서울 종로구 창경궁로 88', 37.57, 126.9996),
    kakaoPlace('1003', '북촌한옥마을', '서울 종로구 계동길 37', 37.5826, 126.9831),
    kakaoPlace('1004', '남산서울타워', '서울 용산구 남산공원길 105', 37.5512, 126.9882),
  ];
}

export function summary(overrides: Partial<TravelSummary> = {}): TravelSummary {
  return {
    travel_plan_id: 77,
    title: '서울 1박 2일 여행',
    destination: '서울특별시 종로구',
    start_date: '2026-10-01',
    end_date: '2026-10-02',
    status: 'COMPLETED',
    companion_label: '친구',
    completed_place_count: 0,
    total_place_count: 5,
    ...overrides,
  };
}

function item(
  id: number,
  name: string,
  type: BackendItem['place_type'],
  date: string,
  start: string,
  end: string,
  lat: number | null,
  lng: number | null,
): BackendItem {
  return {
    itinerary_item_id: id,
    travel_plan_place_id: id + 1000,
    provider: 'KAKAO',
    provider_place_id: String(id + 5000),
    place_name: name,
    place_type: type,
    address: `${name} 주소`,
    latitude: lat,
    longitude: lng,
    start_time: `${date}T${start}:00`,
    end_time: `${date}T${end}:00`,
    item_type: 'PLACE',
    is_completed: false,
    completed_at: null,
  };
}

/**
 * 기본 일정(1박 2일, 장소 5곳, 이동 3구간).
 *  DAY1: 경복궁(10:00-11:30) → [대중교통 25분] → 광장시장(12:00-13:00) → [도보 15분] → 북촌한옥마을(13:30-15:00)
 *  DAY2: 남산서울타워(10:00-12:00) → [자동차 20분] → 명동교자(12:30-13:30)
 */
export function itinerary(travelPlanId = 77, overrides: Partial<BackendItinerary> = {}): BackendItinerary {
  const d1 = '2026-10-01';
  const d2 = '2026-10-02';
  return {
    travel_plan_id: travelPlanId,
    title: '서울 1박 2일 여행',
    destination: '서울특별시 종로구',
    start_date: d1,
    end_date: d2,
    status: 'COMPLETED',
    nights: 1,
    day_count: 2,
    companion_type: 'FRIEND',
    recommended_music: [{ track_id: 1, title: '여행의 시작', artist: 'AUDIGO' }],
    itinerary_days: [
      {
        itinerary_day_id: 1,
        day_number: 1,
        date: d1,
        items: [
          item(101, '경복궁', 'TOURISM', d1, '10:00', '11:30', 37.5796, 126.977),
          item(102, '광장시장', 'RESTAURANT', d1, '12:00', '13:00', 37.57, 126.9996),
          item(103, '북촌한옥마을', 'TOURISM', d1, '13:30', '15:00', 37.5826, 126.9831),
        ],
        routes: [
          {
            route_segment_id: 9001,
            from_itinerary_item_id: 101,
            to_itinerary_item_id: 102,
            transport_type: 'PUBLIC_TRANSPORT',
            duration_minutes: 25,
            distance_meter: 3200,
            total_fare_amount: 1500,
            order: 1,
            line_name: '7212',
            vehicle_number: '7212',
            boarding_stop_name: '경복궁역',
            alighting_stop_name: '종로5가',
            next_arrival_minutes: 5,
            estimated_departure_at: `${d1}T11:35:00`,
            estimated_arrival_at: `${d1}T12:00:00`,
            realtime: true,
            last_refreshed_at: `${d1}T09:00:00`,
          },
          {
            route_segment_id: 9002,
            from_itinerary_item_id: 102,
            to_itinerary_item_id: 103,
            transport_type: 'WALK',
            duration_minutes: 15,
            distance_meter: 1200,
            total_fare_amount: null,
            order: 1,
          },
        ],
      },
      {
        itinerary_day_id: 2,
        day_number: 2,
        date: d2,
        items: [
          item(201, '남산서울타워', 'TOURISM', d2, '10:00', '12:00', 37.5512, 126.9882),
          item(202, '명동교자', 'RESTAURANT', d2, '12:30', '13:30', 37.5626, 126.9856),
        ],
        routes: [
          {
            route_segment_id: 9003,
            from_itinerary_item_id: 201,
            to_itinerary_item_id: 202,
            transport_type: 'CAR',
            duration_minutes: 20,
            distance_meter: 4500,
            total_fare_amount: 8000,
            order: 1,
          },
        ],
      },
    ],
    ...overrides,
  };
}

/**
 * 완료 체크 시각 기준으로 같은 날의 이후 장소 시간을 밀거나 당긴다(백엔드 재계산 흉내).
 * delta = 실제 완료 시각 - 해당 장소의 예정 종료 시각
 */
export function shiftFollowingPlaces(plan: BackendItinerary, itemId: number, completedAt: Date) {
  for (const day of plan.itinerary_days) {
    const index = day.items.findIndex((it) => it.itinerary_item_id === itemId);
    if (index < 0) continue;
    const plannedEnd = new Date(`${day.items[index].end_time}+09:00`);
    const deltaMs = completedAt.getTime() - plannedEnd.getTime();
    for (const next of day.items.slice(index + 1)) {
      next.start_time = shiftLocal(next.start_time, deltaMs);
      next.end_time = shiftLocal(next.end_time, deltaMs);
    }
  }
}

function shiftLocal(value: string, deltaMs: number) {
  const shifted = new Date(new Date(`${value}+09:00`).getTime() + deltaMs);
  const kst = new Date(shifted.getTime() + 9 * 3600_000);
  return kst.toISOString().slice(0, 19);
}

let notificationSeq = 1;
export function notification(overrides: Partial<AppNotification> = {}): AppNotification {
  const id = overrides.notification_id ?? notificationSeq++;
  return {
    notification_id: id,
    type: 'TRAVEL_COMPLETE',
    title: '여행 일정이 완성됐어요',
    body: '서울 1박 2일 여행 일정을 확인해 보세요.',
    is_read: false,
    created_at: '2026-10-01T08:00:00+09:00',
    travel_plan_id: 77,
    target_type: 'TRAVEL_PLAN',
    target_id: 77,
    ...overrides,
  };
}
