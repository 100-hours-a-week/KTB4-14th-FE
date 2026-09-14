import { mockPlaces } from '@/src/mocks/data';
import { apiRequest, USE_MOCK } from '@/src/api/client';
import type { PlaceCandidate } from '@/src/types';

export const placesApi = {
  /**
   * GET /api/places/search?query=
   * 카카오맵 검색 결과를 백엔드가 중계하는 형태를 가정한다.
   */
  async search(query: string): Promise<PlaceCandidate[]> {
    if (USE_MOCK) {
      const q = query.trim();
      if (!q) return mockPlaces.slice(0, 3);
      return mockPlaces.filter((place) => `${place.name}${place.address}`.includes(q));
    }
    return apiRequest<PlaceCandidate[]>('/api/places/search', { query: { query } });
  },

  /** PATCH /api/itinerary-items/:id/place — 일정 장소 변경 */
  async changePlace(itineraryItemId: number, place: PlaceCandidate) {
    if (USE_MOCK) return { itinerary_item_id: itineraryItemId, place };
    return apiRequest(`/api/itinerary-items/${itineraryItemId}/place`, {
      method: 'PATCH',
      body: place,
    });
  },
};
