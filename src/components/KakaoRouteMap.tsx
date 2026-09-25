import type { ItineraryPlaceItem } from '@/types';
import { useEffect, useRef, useState } from 'react';

type RoutePoint = Pick<ItineraryPlaceItem, 'itinerary_item_id' | 'name' | 'latitude' | 'longitude'>;

type KakaoLatLng = { getLat: () => number; getLng: () => number };
type KakaoMapInstance = { setCenter: (position: KakaoLatLng) => void; setBounds: (bounds: unknown) => void };
type KakaoMarker = { setMap: (map: KakaoMapInstance | null) => void };
type KakaoPolyline = { setMap: (map: KakaoMapInstance | null) => void };
type KakaoOverlay = { setMap: (map: KakaoMapInstance | null) => void };

const SCRIPT_SELECTOR = 'script[data-audigo-kakao-map]';
const SCRIPT_URL = 'https://dapi.kakao.com/v2/maps/sdk.js';

function loadKakaoMap(appKey: string, onReady: () => void, onError: () => void) {
  let timeout: number | undefined;
  let settled = false;
  const fail = () => {
    if (settled) return;
    settled = true;
    if (timeout !== undefined) window.clearTimeout(timeout);
    onError();
  };
  const ready = () => {
    if (settled) return;
    settled = true;
    if (timeout !== undefined) window.clearTimeout(timeout);
    onReady();
  };
  const onLoad = () => {
    if (!window.kakao?.maps?.load) return fail();
    window.kakao.maps.load(ready);
  };

  timeout = window.setTimeout(fail, 8000);
  const existing = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);
  if (existing) {
    if (window.kakao) onLoad();
    else {
      existing.addEventListener('load', onLoad, { once: true });
      existing.addEventListener('error', fail, { once: true });
    }
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
      existing.removeEventListener('load', onLoad);
      existing.removeEventListener('error', fail);
    };
  }

  const script = document.createElement('script');
  script.dataset.audigoKakaoMap = 'true';
  script.src = `${SCRIPT_URL}?appkey=${encodeURIComponent(appKey)}&autoload=false`;
  script.async = true;
  script.addEventListener('load', onLoad, { once: true });
  script.addEventListener('error', fail, { once: true });
  document.head.appendChild(script);
  return () => {
    if (timeout !== undefined) window.clearTimeout(timeout);
    script.removeEventListener('load', onLoad);
    script.removeEventListener('error', fail);
  };
}

export function KakaoRouteMap({ points }: { points: RoutePoint[] }) {
  const appKey = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef<KakaoMarker[]>([]);
  const overlaysRef = useRef<KakaoOverlay[]>([]);
  const polylineRef = useRef<KakaoPolyline | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!appKey) return undefined;
    setReady(false);
    setLoadError(false);
    return loadKakaoMap(appKey, () => setReady(true), () => setLoadError(true));
  }, [appKey]);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.kakao) return;
    const valid = points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
    const center = valid[0]
      ? new window.kakao.maps.LatLng(valid[0].latitude as number, valid[0].longitude as number)
      : new window.kakao.maps.LatLng(33.4507, 126.5707);
    mapRef.current = new window.kakao.maps.Map(containerRef.current, { center, level: 8 });
    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      polylineRef.current?.setMap(null);
      markersRef.current = [];
      overlaysRef.current = [];
      polylineRef.current = null;
      mapRef.current = null;
    };
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.kakao) return;
    markersRef.current.forEach((marker) => marker.setMap(null));
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    polylineRef.current?.setMap(null);
    markersRef.current = [];
    overlaysRef.current = [];
    polylineRef.current = null;
    const valid = points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
    if (valid.length === 0) return;
    const positions = valid.map((point) => new window.kakao!.maps.LatLng(point.latitude as number, point.longitude as number));
    const bounds = new window.kakao.maps.LatLngBounds();
    positions.forEach((position, index) => {
      bounds.extend(position);
      const marker = new window.kakao!.maps.Marker({ map, position, title: `${index + 1}. ${valid[index].name}` });
      markersRef.current.push(marker);
      const overlay = new window.kakao!.maps.CustomOverlay({
        map,
        position,
        content: `<span class="route-map-number">${index + 1}</span>`,
        yAnchor: 1,
      });
      overlaysRef.current.push(overlay);
    });
    polylineRef.current = new window.kakao.maps.Polyline({
      map,
      path: positions,
      strokeWeight: 4,
      strokeColor: '#1d2b3f',
      strokeOpacity: 0.85,
      strokeStyle: 'solid',
    });
    map.setBounds(bounds);
  }, [points, ready]);

  if (!appKey) {
    return <FallbackRouteMap points={points} message="카카오 지도 키가 없어 경로 미리보기를 표시해요." />;
  }
  if (loadError) {
    return <FallbackRouteMap points={points} message="카카오 지도를 불러오지 못해 경로 미리보기로 표시해요." />;
  }
  if (!ready) {
    return <div className="kakao-map-fallback">카카오 지도를 불러오는 중이에요.</div>;
  }
  if (!points.some((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))) {
    return <div className="kakao-map-fallback">장소 좌표가 없어 지도 경로를 표시할 수 없어요.</div>;
  }
  return <div ref={containerRef} className="kakao-map-layer" aria-label="카카오 이동 경로 지도" />;
}

function FallbackRouteMap({
  points,
  message,
}: {
  points: RoutePoint[];
  message: string;
}) {
  const validPoints = points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
  const positions = validPoints.map((_, index) => fallbackPosition(index, validPoints.length));
  const polyline = positions.map(([x, y]) => `${x},${y}`).join(' ');

  return (
    <div className="kakao-fallback-route" aria-label="이동 경로 미리보기">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={polyline} />
      </svg>
      {validPoints.map((point, index) => {
        const [left, top] = positions[index];
        return (
          <span
            key={point.itinerary_item_id}
            className="kakao-fallback-pin"
            style={{ left: `${left}%`, top: `${top}%` }}
            title={`${index + 1}. ${point.name}`}>
            {index + 1}
          </span>
        );
      })}
      <span className="kakao-fallback-caption">{message}</span>
    </div>
  );
}

function fallbackPosition(index: number, total: number): [number, number] {
  if (total <= 1) return [50, 48];
  const progress = index / (total - 1);
  const wave = Math.sin(progress * Math.PI * 2) * 20;
  return [16 + progress * 68, Math.max(20, Math.min(76, 54 - wave))];
}
