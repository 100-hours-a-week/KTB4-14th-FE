import type { PlaceCandidate } from '@/types';

type KakaoPlaceDocument = {
  id?: string;
  place_name?: string;
  address_name?: string;
  road_address_name?: string;
  x?: string;
  y?: string;
};

type KakaoPlacesService = {
  keywordSearch: (
    keyword: string,
    callback: (documents: KakaoPlaceDocument[], status: string) => void,
    options?: { page?: number; size?: number },
  ) => void;
};

type KakaoServices = {
  Places: new () => KakaoPlacesService;
  Status: {
    OK: string;
    ZERO_RESULT: string;
  };
};

type KakaoWindow = {
  kakao?: {
    maps?: {
      services?: KakaoServices;
    };
  };
};

const KAKAO_SDK_TIMEOUT_MS = 8000;
const KAKAO_SEARCH_TIMEOUT_MS = 15_000;

class KakaoPlaceSearchTimeoutError extends Error {
  readonly code = 'search_timeout';

  constructor() {
    super('카카오 장소 검색 시간이 초과되었습니다.');
    this.name = 'KakaoPlaceSearchTimeoutError';
  }
}

export async function searchKakaoPlaces(
  keyword: string,
  page = 1,
  size = 15,
): Promise<PlaceCandidate[]> {
  const services = await waitForKakaoServices();

  return new Promise((resolve, reject) => {
    const places = new services.Places();
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      settled = true;
      reject(new KakaoPlaceSearchTimeoutError());
    }, KAKAO_SEARCH_TIMEOUT_MS);

    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      callback();
    };

    places.keywordSearch(keyword, (documents, status) => {
      if (settled) return;
      if (status === services.Status.ZERO_RESULT) {
        settle(() => resolve([]));
        return;
      }
      if (status !== services.Status.OK) {
        settle(() => reject(new Error('카카오 장소 검색에 실패했습니다.')));
        return;
      }

      const mappedPlaces = documents.flatMap((place) => {
        const latitude = Number(place.y);
        const longitude = Number(place.x);
        if (!place.id || !place.place_name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return [];
        }
        return [{
          provider: 'KAKAO' as const,
          provider_place_id: place.id,
          name: place.place_name,
          address: place.road_address_name || place.address_name || '',
          latitude,
          longitude,
          place_type: 'TOURISM' as const,
        }];
      });
      settle(() => resolve(mappedPlaces));
    }, { page, size });
  });
}

function waitForKakaoServices(): Promise<KakaoServices> {
  const appKey = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;
  if (!appKey) {
    return Promise.reject(new Error('카카오 지도 JavaScript 키가 설정되지 않았습니다.'));
  }

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      const services = (window as unknown as KakaoWindow).kakao?.maps?.services;
      if (services) {
        resolve(services);
        return;
      }
      if (Date.now() - startedAt >= KAKAO_SDK_TIMEOUT_MS) {
        reject(new Error('카카오 지도 서비스를 불러오지 못했습니다.'));
        return;
      }
      window.setTimeout(check, 50);
    };
    check();
  });
}
