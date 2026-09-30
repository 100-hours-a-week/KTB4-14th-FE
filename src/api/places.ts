import { mockPlaces } from '@/mocks/data';
import { apiRequest, USE_MOCK } from '@/api/client';
import { searchKakaoPlaces } from '@/lib/kakaoPlaces';
import type { PlaceCandidate } from '@/types';

const LIVE_PLACE_RESOLUTION_CONCURRENCY = 3;
const livePlaceRequests = new Map<string, Promise<LivePlaceInfo | null>>();

export type LivePlaceInfo = {
  provider: 'KAKAO';
  provider_place_id: string;
  place_name: string | null;
  latitude: number | null;
  longitude: number | null;
  place_url: string;
};

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

  /** GET /api/places/:provider/:providerPlaceId/live — 상세 URL 기반 실시간 장소 메타데이터 조회 */
  async resolveLivePlace(providerPlaceId: string): Promise<LivePlaceInfo | null> {
    const normalizedId = providerPlaceId.trim();
    if (!normalizedId || USE_MOCK) return null;

    const cached = livePlaceRequests.get(normalizedId);
    if (cached) return cached;

    const request = apiRequest<LivePlaceInfo>(
      `/api/places/KAKAO/${encodeURIComponent(normalizedId)}/live`,
    )
      .then((place) => hasLivePlaceMetadata(place) ? place : null)
      .catch(() => null);
    livePlaceRequests.set(normalizedId, request);
    return request;
  },

  /** 장소명 실시간 조회를 제한된 병렬성으로 수행한다. 결과는 브라우저 메모리에만 둔다. */
  async resolveLivePlaces(providerPlaceIds: string[], concurrency = LIVE_PLACE_RESOLUTION_CONCURRENCY) {
    const uniqueIds = [...new Set(providerPlaceIds.map((id) => id.trim()).filter(Boolean))];
    const resolved = new Map<string, LivePlaceInfo>();
    if (uniqueIds.length === 0) return resolved;

    let nextIndex = 0;
    const workerCount = Math.min(Math.max(1, concurrency), uniqueIds.length);
    const worker = async () => {
      while (nextIndex < uniqueIds.length) {
        const id = uniqueIds[nextIndex++];
        const place = await placesApi.resolveLivePlace(id);
        if (place) resolved.set(id, place);
      }
    };

    await Promise.all(Array.from({ length: workerCount }, worker));
    return resolved;
  },
};

function hasLivePlaceMetadata(place: LivePlaceInfo | null | undefined) {
  if (!place) return false;
  return Boolean(place.place_name)
    || Number.isFinite(place.latitude)
    || Number.isFinite(place.longitude);
}
