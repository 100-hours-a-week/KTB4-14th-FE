import type { PlaceCandidate } from '@/types';
import { useEffect, useRef, useState } from 'react';

type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};

type KakaoMapInstance = {
  setCenter: (position: KakaoLatLng) => void;
  setBounds: (bounds: unknown) => void;
};

type KakaoMapApi = {
  maps: {
    load: (callback: () => void) => void;
    Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMapInstance;
    LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
    LatLngBounds: new () => { extend: (position: KakaoLatLng) => void };
    Marker: new (options: { map: KakaoMapInstance; position: KakaoLatLng; title?: string }) => {
      setMap: (map: KakaoMapInstance | null) => void;
    };
    Polyline: new (options: {
      map: KakaoMapInstance;
      path: KakaoLatLng[];
      strokeWeight: number;
      strokeColor: string;
      strokeOpacity: number;
      strokeStyle: string;
    }) => {
      setMap: (map: KakaoMapInstance | null) => void;
    };
    CustomOverlayMap: new (options: {
      map: KakaoMapInstance;
      position: KakaoLatLng;
      content: string;
      yAnchor?: number;
    }) => {
      setMap: (map: KakaoMapInstance | null) => void;
    };
    event: {
      addListener: (target: unknown, eventName: string, callback: () => void) => void;
    };
  };
};

declare global {
  interface Window {
    kakao?: KakaoMapApi;
  }
}

const KAKAO_MAP_SCRIPT_SELECTOR = 'script[data-audigo-kakao-map]';
const KAKAO_MAP_SCRIPT_URL = 'https://dapi.kakao.com/v2/maps/sdk.js';
const KAKAO_MAP_LOAD_TIMEOUT_MS = 8000;

function loadKakaoMapScript(appKey: string, onReady: () => void, onError: () => void) {
  let timeoutId: number | undefined;
  let settled = false;

  const fail = () => {
    if (settled) return;
    settled = true;
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    onError();
  };

  const ready = () => {
    if (settled) return;
    settled = true;
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    onReady();
  };

  const handleLoad = () => {
    if (!window.kakao?.maps?.load) {
      fail();
      return;
    }
    window.kakao.maps.load(ready);
  };

  timeoutId = window.setTimeout(fail, KAKAO_MAP_LOAD_TIMEOUT_MS);
  const existing = document.querySelector<HTMLScriptElement>(KAKAO_MAP_SCRIPT_SELECTOR);
  if (existing) {
    if (window.kakao) {
      handleLoad();
    } else {
      existing.addEventListener('load', handleLoad, { once: true });
      existing.addEventListener('error', fail, { once: true });
    }
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      existing.removeEventListener('load', handleLoad);
      existing.removeEventListener('error', fail);
    };
  }

  const script = document.createElement('script');
  script.dataset.audigoKakaoMap = 'true';
  script.src = `${KAKAO_MAP_SCRIPT_URL}?appkey=${encodeURIComponent(appKey)}&autoload=false`;
  script.async = true;
  script.addEventListener('load', handleLoad, { once: true });
  script.addEventListener('error', fail, { once: true });
  document.head.appendChild(script);
  return () => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    script.removeEventListener('load', handleLoad);
    script.removeEventListener('error', fail);
    script.remove();
  };
}

export function KakaoMap({
  places,
  selectedPlaceId,
  onSelect,
}: {
  places: PlaceCandidate[];
  selectedPlaceId?: string;
  onSelect: (place: PlaceCandidate) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef<Array<{ setMap: (map: KakaoMapInstance | null) => void }>>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const appKey = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;

  useEffect(() => {
    if (!appKey) return undefined;
    setReady(false);
    setLoadError(false);
    return loadKakaoMapScript(
      appKey,
      () => setReady(true),
      () => setLoadError(true),
    );
  }, [appKey]);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.kakao) return;
    const center = new window.kakao.maps.LatLng(33.4507, 126.5707);
    mapRef.current = new window.kakao.maps.Map(containerRef.current, { center, level: 8 });
    return () => {
      mapRef.current = null;
      markersRef.current = [];
    };
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current;
    const kakao = window.kakao;
    if (!map || !kakao) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new kakao.maps.LatLngBounds();
    let validPlaceCount = 0;
    places.forEach((place) => {
      if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) return;
      const position = new kakao.maps.LatLng(place.latitude, place.longitude);
      const marker = new kakao.maps.Marker({ map, position, title: place.name });
      kakao.maps.event.addListener(marker, 'click', () => onSelect(place));
      markersRef.current.push(marker);
      bounds.extend(position);
      validPlaceCount += 1;
    });
    if (validPlaceCount > 0) map.setBounds(bounds);
  }, [places, onSelect, ready]);

  if (!appKey) {
    return (
      <div className="kakao-map-fallback">
        {places.map((place, index) => (
          <button
            key={place.provider_place_id}
            type="button"
            className={`map-pin${selectedPlaceId === place.provider_place_id ? ' on' : ''}`}
            style={{ left: `${18 + ((index * 23) % 62)}%`, top: `${22 + ((index * 17) % 48)}%` }}
            onClick={() => onSelect(place)}
          >
            {index + 1}
          </button>
        ))}
        <span>카카오 지도 키를 설정하면 실제 지도를 표시할 수 있어요.</span>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="kakao-map-fallback">
        카카오 지도 설정을 확인해 주세요.
        <small>JavaScript 키의 지도/로컬 서비스와 localhost 도메인 등록이 필요합니다.</small>
      </div>
    );
  }
  if (!ready) {
    return <div className="kakao-map-fallback">카카오 지도를 불러오는 중이에요.</div>;
  }
  return <div ref={containerRef} className="kakao-map-layer" aria-label={`${selectedPlaceId ?? ''} 카카오 지도`} />;
}
