import { mockPlaces } from '@/mocks/data';
import { apiRequest, USE_MOCK } from '@/api/client';
import type { PlaceCandidate } from '@/types';

export const placesApi = {
  /**
   * GET /api/places/search?region_id=&keyword=&page=&size=
   * 카카오맵 검색 결과를 백엔드가 중계한다.
   */
  async search(query: string, regionId: number, page = 1, size = 15): Promise<PlaceCandidate[]> {
    if (USE_MOCK) {
      const q = query.trim();
      if (!q) return mockPlaces.slice(0, 3);
      return mockPlaces.filter((place) => `${place.name}${place.address}`.includes(q));
    }

    const response = await apiRequest<{
      places: Array<{
        provider: 'KAKAO';
        provider_place_id: string;
        place_name: string;
        address: string | null;
        road_address: string | null;
        latitude: number;
        longitude: number;
      }>;
      page: number;
      size: number;
      is_end: boolean;
      pageable_count: number;
    }>('/api/places/search', {
      query: {
        region_id: regionId,
        keyword: query,
        page,
        size,
      },
    });

    return response.places.map((place) => ({
      provider: place.provider,
      provider_place_id: place.provider_place_id,
      name: place.place_name,
      address: place.road_address ?? place.address ?? '',
      latitude: place.latitude,
      longitude: place.longitude,
      place_type: 'TOURISM',
    }));
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
