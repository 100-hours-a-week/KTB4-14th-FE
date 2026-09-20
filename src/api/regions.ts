import { apiRequest, USE_MOCK } from '@/api/client';
import type { RegionSummary } from '@/types';

export const regionsApi = {
  /** GET /api/regions — 여행 생성 화면의 시/군/구 목록 */
  async list(): Promise<RegionSummary[]> {
    if (USE_MOCK) return [];
    return apiRequest<RegionSummary[]>('/api/regions');
  },
};
