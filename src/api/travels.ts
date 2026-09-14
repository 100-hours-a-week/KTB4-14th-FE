import { mockBusanDetail, mockMyTrips, mockRecent, mockTravelDetail, mockUpcoming } from '@/src/mocks/data';
import { apiRequest, USE_MOCK } from '@/src/api/client';
import type {
  CreateTravelPlanRequest,
  GenerationStep,
  TravelDetail,
  TravelGenerationStatus,
  TravelPlanStatus,
  TravelSummary,
} from '@/src/types';

const generationStore = new Map<number, { createdAt: number; failed?: boolean }>();
let nextPlanId = 200;

const STEP_DEFS: { key: GenerationStep['key']; label: string }[] = [
  { key: 'PLACE_RECOMMEND', label: '장소 대상 추천' },
  { key: 'STAY_RECOMMEND', label: '숙소 위치 추천' },
  { key: 'ROUTE_OPTIMIZE', label: '경로 최적 구성' },
  { key: 'MUSIC_RECOMMEND', label: '여행 음악 추천' },
];

function mockStatus(planId: number): TravelGenerationStatus {
  const entry = generationStore.get(planId) ?? { createdAt: Date.now() };
  const elapsed = Date.now() - entry.createdAt;
  const doneCount = Math.min(4, Math.floor(elapsed / 900));
  const status: TravelPlanStatus = entry.failed
    ? 'FAILED'
    : doneCount >= 4
      ? 'COMPLETED'
      : 'GENERATING';
  return {
    travel_plan_id: planId,
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
      return { travel_plan_id, status: 'GENERATING' as const };
    }
    return apiRequest<{ travel_plan_id: number; status: TravelPlanStatus }>('/api/travel-plans', {
      method: 'POST',
      body,
    });
  },

  /** GET /api/travel-plans/:id/status */
  async getStatus(travelPlanId: number): Promise<TravelGenerationStatus> {
    if (USE_MOCK) return mockStatus(travelPlanId);
    return apiRequest<TravelGenerationStatus>(`/api/travel-plans/${travelPlanId}/status`);
  },

  /** GET /api/travel-plans/:id */
  async getDetail(travelPlanId: number): Promise<TravelDetail> {
    if (USE_MOCK) {
      if (travelPlanId === 88) return mockBusanDetail;
      return { ...mockTravelDetail, travel_plan_id: travelPlanId };
    }
    return apiRequest<TravelDetail>(`/api/travel-plans/${travelPlanId}`);
  },

  /** POST /api/travel-plans/:id/regenerate */
  async regenerate(travelPlanId: number) {
    if (USE_MOCK) {
      generationStore.set(travelPlanId, { createdAt: Date.now() });
      return { travel_plan_id: travelPlanId, status: 'GENERATING' as const };
    }
    return apiRequest<{ travel_plan_id: number; status: TravelPlanStatus }>(
      `/api/travel-plans/${travelPlanId}/regenerate`,
      { method: 'POST' },
    );
  },

  /** DELETE /api/travel-plans/:id */
  async remove(travelPlanId: number) {
    if (USE_MOCK) return;
    await apiRequest<void>(`/api/travel-plans/${travelPlanId}`, { method: 'DELETE' });
  },
};
