import { mockBusanDetail, mockMyTrips, mockRecent, mockTravelDetail, mockUpcoming } from '@/mocks/data';
import { apiRequest, USE_MOCK } from '@/api/client';
import type {
  CreateTravelPlanRequest,
  GenerationStep,
  TravelDetail,
  TravelGenerationStatus,
  TravelPlanCreatedResponse,
  TravelPlanStatus,
  TravelSummary,
  ItineraryDay,
  ItineraryItem,
  ItineraryRouteItem,
} from '@/types';

const generationStore = new Map<number, { createdAt: number; failed?: boolean }>();
let nextPlanId = 200;

const STEP_DEFS: { key: GenerationStep['key']; label: string }[] = [
  { key: 'PLACE_RECOMMEND', label: '장소·식당 추천' },
  { key: 'STAY_RECOMMEND', label: '숙소 위치 계산' },
  { key: 'ROUTE_OPTIMIZE', label: '이동 경로 연결' },
];

function mockStatus(planId: number): TravelGenerationStatus {
  const entry = generationStore.get(planId) ?? { createdAt: Date.now() };
  const elapsed = Date.now() - entry.createdAt;
  const doneCount = Math.min(3, Math.floor(elapsed / 900));
  const status: TravelPlanStatus = entry.failed
    ? 'FAILED'
    : doneCount >= 3
      ? 'COMPLETED'
      : 'GENERATING';
  return {
    travel_plan_id: planId,
    generation_job_id: planId,
    status,
    error_message: entry.failed ? '일정 생성에 실패했습니다.' : null,
    steps: STEP_DEFS.map((step, index) => ({
      ...step,
      state: entry.failed && index === doneCount
        ? 'FAILED'
        : index < doneCount
          ? 'DONE'
          : index === doneCount
            ? 'RUNNING'
            : 'PENDING',
    })),
  };
}

export const travelsApi = {
  /** GET /api/travel-plans/upcoming — 홈 다음 여행 카드 */
  async getUpcoming(): Promise<TravelSummary | null> {
    if (USE_MOCK) return mockUpcoming;
    return apiRequest<TravelSummary | null>('/api/travel-plans/upcoming');
  },

  /** GET /api/travel-plans/recent — 홈 최근 여행 */
  async getRecent(): Promise<TravelSummary[]> {
    if (USE_MOCK) return mockRecent;
    return apiRequest<TravelSummary[]>('/api/travel-plans/recent');
  },

  /** GET /api/travel-plans/me — 내 여행 기록 */
  async getMyTrips(): Promise<TravelSummary[]> {
    if (USE_MOCK) return mockMyTrips;
    return apiRequest<TravelSummary[]>('/api/travel-plans/me');
  },

  /** POST /api/travel-plans — 여행 생성 요청. GENERATING 상태로 생성 */
  async create(body: CreateTravelPlanRequest) {
    if (USE_MOCK) {
      const travel_plan_id = nextPlanId++;
      generationStore.set(travel_plan_id, { createdAt: Date.now() });
      return { travel_plan_id, generation_job_id: travel_plan_id, status: 'GENERATING' as const };
    }
    return apiRequest<TravelPlanCreatedResponse>('/api/travel-plans', {
      method: 'POST',
      body,
    });
  },

  /** GET /api/travel-plans/:id/status */
  async getStatus(travelPlanId: number): Promise<TravelGenerationStatus> {
    if (USE_MOCK) return mockStatus(travelPlanId);
    return apiRequest<TravelGenerationStatus>(`/api/travel-plans/${travelPlanId}/status`);
  },

  /** GET /api/ai-generation-jobs/:id — 생성 작업 단위 기준 상태 조회 */
  async getGenerationStatus(generationJobId: number): Promise<TravelGenerationStatus> {
    if (USE_MOCK) return mockStatus(generationJobId);
    return apiRequest<TravelGenerationStatus>(`/api/ai-generation-jobs/${generationJobId}`);
  },

  /** GET /api/travel-plans/:id */
  async getDetail(travelPlanId: number): Promise<TravelDetail> {
    if (USE_MOCK) {
      if (travelPlanId === 88) return mockBusanDetail;
      return { ...mockTravelDetail, travel_plan_id: travelPlanId };
    }
    const response = await apiRequest<BackendItineraryResponse>(`/api/travel-plans/${travelPlanId}/itinerary`);
    return normalizeItinerary(response);
  },

  /** PATCH /api/itinerary-items/:id/completion */
  async updateItineraryCompletion(itineraryItemId: number, isCompleted: boolean) {
    if (USE_MOCK) return { itinerary_item_id: itineraryItemId, is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null };
    return apiRequest<{ itinerary_item_id: number; is_completed: boolean; completed_at: string | null }>(
      `/api/itinerary-items/${itineraryItemId}/completion`,
      { method: 'PATCH', body: { is_completed: isCompleted } },
    );
  },

  /** POST /api/travel-plans/:id/routes/recalculate */
  async recalculateRoutes(travelPlanId: number) {
    if (USE_MOCK) return;
    return apiRequest(`/api/travel-plans/${travelPlanId}/routes/recalculate`, { method: 'POST' });
  },

  /** POST /api/travel-plans/:id/regeneration */
  async regenerate(travelPlanId: number) {
    if (USE_MOCK) {
      generationStore.set(travelPlanId, { createdAt: Date.now() });
      return { travel_plan_id: travelPlanId, generation_job_id: travelPlanId, status: 'GENERATING' as const };
    }
    return apiRequest<TravelPlanCreatedResponse>(
      `/api/travel-plans/${travelPlanId}/regeneration`,
      { method: 'POST' },
    );
  },

  /** DELETE /api/travel-plans/:id */
  async remove(travelPlanId: number) {
    if (USE_MOCK) return;
    await apiRequest<void>(`/api/travel-plans/${travelPlanId}`, { method: 'DELETE' });
  },
};

type BackendItineraryResponse = {
  travel_plan_id: number;
  title?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  status?: TravelPlanStatus;
  nights?: number;
  day_count?: number;
  days?: Array<{
    itinerary_day_id: number;
    day_number: number;
    date: string;
    items: BackendItineraryItem[];
    routes?: BackendRoute[];
  }>;
  itinerary_days?: Array<{
    itinerary_day_id: number;
    day_number: number;
    date: string;
    items: BackendItineraryItem[];
    routes?: BackendRoute[];
  }>;
};

type BackendItineraryItem = {
  itinerary_item_id: number;
  travel_plan_place_id: number;
  provider?: 'KAKAO';
  provider_place_id?: string;
  place_name?: string | null;
  place_type?: 'RESTAURANT' | 'ACCOMMODATION' | 'TOURISM';
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  start_time?: string;
  end_time?: string;
  item_type: 'PLACE';
  is_completed?: boolean;
  completed_at?: string | null;
};

type BackendRoute = {
  route_segment_id: number;
  from_itinerary_item_id: number;
  to_itinerary_item_id: number;
  transport_type: 'WALK' | 'CAR' | 'PUBLIC_TRANSPORT';
  duration_minutes?: number | null;
  distance_meter?: number | null;
  total_fare_amount?: number | null;
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

function normalizeItinerary(response: BackendItineraryResponse): TravelDetail {
  const days: ItineraryDay[] = (response.itinerary_days ?? response.days ?? []).map((day) => {
    const places: ItineraryItem[] = day.items.map((item) => ({
      itinerary_item_id: item.itinerary_item_id,
      type: 'PLACE',
      travel_plan_place_id: item.travel_plan_place_id,
      provider: item.provider,
      provider_place_id: item.provider_place_id,
      place_id: item.travel_plan_place_id,
      name: item.place_name ?? item.provider_place_id ?? '장소 정보 없음',
      address: item.address ?? undefined,
      start_time: item.start_time,
      end_time: item.end_time,
      latitude: item.latitude ?? undefined,
      longitude: item.longitude ?? undefined,
      place_type: item.place_type,
      is_completed: item.is_completed ?? false,
      completed_at: item.completed_at,
    }));
    const routes: ItineraryRouteItem[] = (day.routes ?? []).map((route) => ({
      itinerary_item_id: route.route_segment_id,
      type: 'ROUTE',
      route_segment_id: route.route_segment_id,
      from_itinerary_item_id: route.from_itinerary_item_id,
      to_itinerary_item_id: route.to_itinerary_item_id,
      transport_type: route.transport_type,
      transport: route.transport_type === 'PUBLIC_TRANSPORT' ? 'PUBLIC' : route.transport_type,
      duration_minutes: route.duration_minutes ?? undefined,
      distance_meter: route.distance_meter ?? undefined,
      distance_km: route.distance_meter == null ? undefined : route.distance_meter / 1000,
      total_fare_amount: route.total_fare_amount ?? undefined,
      order: route.order,
      line_name: route.line_name,
      vehicle_number: route.vehicle_number,
      boarding_stop_name: route.boarding_stop_name,
      alighting_stop_name: route.alighting_stop_name,
      next_arrival_minutes: route.next_arrival_minutes,
      estimated_departure_at: route.estimated_departure_at,
      estimated_arrival_at: route.estimated_arrival_at,
      realtime: route.realtime,
      last_refreshed_at: route.last_refreshed_at,
    }));

    const combined: ItineraryItem[] = [];
    places.forEach((place) => {
      combined.push(place);
      routes.filter((route) => route.from_itinerary_item_id === place.itinerary_item_id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .forEach((route) => combined.push(route));
    });
    return { itinerary_day_id: day.itinerary_day_id, day_number: day.day_number, date: day.date, items: combined, routes };
  });

  const startDate = response.start_date ?? days[0]?.date ?? '';
  const endDate = response.end_date ?? days.at(-1)?.date ?? startDate;
  return {
    travel_plan_id: response.travel_plan_id,
    title: response.title ?? '여행 일정',
    destination: response.destination ?? '',
    start_date: startDate,
    end_date: endDate,
    status: response.status ?? 'COMPLETED',
    nights: response.nights ?? Math.max(0, dateDiff(startDate, endDate)),
    days: response.day_count ?? days.length,
    itinerary_days: days,
  };
}

function dateDiff(start: string, end: string) {
  if (!start || !end) return 0;
  const startMs = Date.parse(`${start}T00:00:00`);
  const endMs = Date.parse(`${end}T00:00:00`);
  return Number.isFinite(startMs) && Number.isFinite(endMs) ? Math.round((endMs - startMs) / 86400000) : 0;
}
