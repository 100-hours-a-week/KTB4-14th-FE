import { mockPlaces } from '@/mocks/data';
import { apiRequest, USE_MOCK } from '@/api/client';
import { searchKakaoPlaces } from '@/lib/kakaoPlaces';
import type { PlaceCandidate } from '@/types';

export const placesApi = {
  /** 카카오 지도 SDK로 지역 제한 없이 장소를 검색한다. */
  async search(query: string, _regionId: number, page = 1, size = 15): Promise<PlaceCandidate[]> {
    if (USE_MOCK) {
      const q = query.trim();
      if (!q) return mockPlaces.slice(0, 3);
      return mockPlaces.filter((place) => `${place.name}${place.address}`.includes(q));
    }

    return searchKakaoPlaces(query.trim(), page, size);
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
