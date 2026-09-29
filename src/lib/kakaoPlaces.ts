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
      load?: (callback: () => void) => void;
      services?: KakaoServices;
    };
  };
};

const KAKAO_SDK_TIMEOUT_MS = 8000;
const KAKAO_SEARCH_TIMEOUT_MS = 15_000;
const KAKAO_SCRIPT_SELECTOR = 'script[data-audigo-kakao-map]';
const KAKAO_SCRIPT_URL = 'https://dapi.kakao.com/v2/maps/sdk.js';

let kakaoServicesPromise: Promise<KakaoServices> | null = null;

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
  const currentServices = getKakaoServices();
  if (currentServices) return Promise.resolve(currentServices);
  if (kakaoServicesPromise) return kakaoServicesPromise;

  const appKey = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;
  if (!appKey) {
    return Promise.reject(new Error('카카오 지도 JavaScript 키가 설정되지 않았습니다.'));
  }

  kakaoServicesPromise = new Promise<KakaoServices>((resolve, reject) => {
    let timeoutId: number | undefined;
    let settled = false;
    let cleanup = () => {};

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      cleanup();
      if (error) reject(error);
    };

    const resolveServices = () => {
      const services = getKakaoServices();
      if (!services) {
        finish(new Error('카카오 지도 서비스를 불러오지 못했습니다.'));
        return;
      }
      finish();
      resolve(services);
    };

    const loadServices = () => {
      const maps = getKakaoMaps();
      if (!maps?.load) {
        finish(new Error('카카오 지도 SDK를 불러오지 못했습니다.'));
        return;
      }
      maps.load(resolveServices);
    };

    const fail = () => finish(new Error('카카오 지도 SDK를 불러오지 못했습니다.'));
    timeoutId = window.setTimeout(
      () => finish(new Error('카카오 지도 서비스 로딩 시간이 초과되었습니다.')),
      KAKAO_SDK_TIMEOUT_MS,
    );

    const existingScript = document.querySelector<HTMLScriptElement>(KAKAO_SCRIPT_SELECTOR);
    if (existingScript) {
      if (getKakaoMaps()?.load) {
        loadServices();
      } else {
        const onLoad = () => loadServices();
        existingScript.addEventListener('load', onLoad, { once: true });
        existingScript.addEventListener('error', fail, { once: true });
        cleanup = () => {
          existingScript.removeEventListener('load', onLoad);
          existingScript.removeEventListener('error', fail);
        };
      }
    } else {
      const script = document.createElement('script');
      script.dataset.audigoKakaoMap = 'true';
      script.src = `${KAKAO_SCRIPT_URL}?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`;
      script.async = true;
      script.addEventListener('load', loadServices, { once: true });
      script.addEventListener('error', fail, { once: true });
      cleanup = () => {
        script.removeEventListener('load', loadServices);
        script.removeEventListener('error', fail);
      };
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    kakaoServicesPromise = null;
    throw error;
  });

  return kakaoServicesPromise;
}

function getKakaoMaps() {
  return (window as unknown as KakaoWindow).kakao?.maps;
}

function getKakaoServices() {
  return getKakaoMaps()?.services;
}
