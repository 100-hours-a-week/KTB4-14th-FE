import { USE_MOCK, travelsApi } from '@/api';
import { Header } from '@/components/Header';
import { KakaoRouteMap } from '@/components/KakaoRouteMap';
import { Modal } from '@/components/Modal';
import { nightsAndDays } from '@/lib/options';
import type { ItineraryItem, ItineraryPlaceItem, ItineraryRouteItem, TravelDetail } from '@/types';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function ItineraryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const planId = Number(id);
  const [detail, setDetail] = useState<TravelDetail | null>(null);
  const [tab, setTab] = useState<'list' | 'map'>('list');
  const [recreate, setRecreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setDetail(await travelsApi.getDetail(planId));
      setError(null);
    } catch {
      setError('여행 일정을 불러오지 못했어요. 생성이 완료된 뒤 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [planId]);

  const places = useMemo(
    () => detail?.itinerary_days.flatMap((day) => day.items.filter(isPlaceItem)) ?? [],
    [detail],
  );

  if (loading && !detail) {
    return (
      <section className="screen">
        <Header title="추천 경로" onBack={() => navigate('/home', { replace: true })} showBell />
        <div className="empty-box">여행 일정을 불러오는 중이에요.</div>
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="screen">
        <Header title="추천 경로" onBack={() => navigate('/home', { replace: true })} showBell />
        <div className="empty-box">{error ?? '여행 일정을 찾을 수 없어요.'}</div>
      </section>
    );
  }

  return (
    <section className="screen">
      <Header title="추천 경로" onBack={() => navigate('/home', { replace: true })} showBell />
      <div className="scroll">
        <div className="row" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <h2 className="page-title" style={{ marginBottom: 6 }}>
              {detail.title}
            </h2>
            <p className="hello">
              {detail.start_date.replaceAll('-', '.')} - {detail.end_date.replaceAll('-', '.')} · {nightsAndDays(detail.start_date, detail.end_date)}
            </p>
          </div>
          <button type="button" className="recreate" onClick={() => setRecreate(true)}>
            일정 다시 만들기
          </button>
        </div>
        {error ? <p className="field-help error" role="alert">{error}</p> : null}
        <div className="tabs">
          <button type="button" className={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>
            장소
          </button>
          <button type="button" className={tab === 'map' ? 'on' : ''} onClick={() => setTab('map')}>
            이동 경로
          </button>
        </div>
        {tab === 'map' ? (
          <>
            <div className="map-box route-map-box" style={{ margin: '0 0 12px', height: 280 }}>
              <KakaoRouteMap points={places} />
            </div>
            <div className="route-index-list">
              {places.map((place, index) => (
                <div className="route-index-row" key={place.itinerary_item_id}>
                  <span className="map-pin on">{index + 1}</span>
                  <span>{place.name}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          detail.itinerary_days.map((day) => (
            <article key={day.itinerary_day_id} className="day-card">
              <strong>DAY {day.day_number}</strong>
              <p className="place-addr" style={{ marginBottom: 10 }}>
                {day.date.replaceAll('-', '.')}
              </p>
              {day.items.map((item) => (
                <ItineraryRow
                  key={item.itinerary_item_id}
                  item={item}
                  updatingItemId={updatingItemId}
                  onToggleCompletion={async (place) => {
                    setUpdatingItemId(place.itinerary_item_id);
                    try {
                      const result = await travelsApi.updateItineraryCompletion(
                        place.itinerary_item_id,
                        !place.is_completed,
                      );
                      setDetail((current) => current ? updatePlaceCompletion(current, result) : current);
                      // 완료 시 대중교통 경로의 실시간 값을 서버가 다시 계산하므로 최신 경로를 재조회한다.
                      if (!USE_MOCK && (place.is_completed === false || place.is_completed === undefined)) await load();
                    } catch {
                      setError('일정 완료 상태를 저장하지 못했어요.');
                    } finally {
                      setUpdatingItemId(null);
                    }
                  }}
                  onChangePlace={() => navigate(`/create-travel/map-search?replaceItemId=${item.itinerary_item_id}`)}
                />
              ))}
            </article>
          ))
        )}
      </div>
      <div className="bottom-actions">
        <button type="button" onClick={() => navigate(`/checklist/${planId}`)}>
          체크리스트
        </button>
        <button type="button" onClick={() => navigate(`/video/${planId}`)}>
          여행 영상
        </button>
      </div>
      <Modal
        open={recreate}
        title="일정을 다시 만들까요?"
        message="일정이 다시 생성되면 현재 저장된 일정이 사라집니다."
        onClose={() => setRecreate(false)}
        onConfirm={async () => {
          setRecreate(false);
          const created = await travelsApi.regenerate(planId);
          const jobQuery = created.generation_job_id ? `?job_id=${created.generation_job_id}` : '';
          navigate(`/generating/${created.travel_plan_id}${jobQuery}`, { replace: true });
        }}
      />
    </section>
  );
}

function ItineraryRow({
  item,
  updatingItemId,
  onToggleCompletion,
  onChangePlace,
}: {
  item: ItineraryItem;
  updatingItemId: number | null;
  onToggleCompletion: (item: ItineraryPlaceItem) => Promise<void>;
  onChangePlace: () => void;
}) {
  if (item.type === 'ROUTE') {
    return <RouteRow route={item} />;
  }
  return (
    <div className={`place-item${item.is_completed ? ' completed' : ''}`}>
      <button
        type="button"
        className={`completion-check${item.is_completed ? ' checked' : ''}`}
        disabled={updatingItemId === item.itinerary_item_id}
        aria-label={`${item.name} 일정 ${item.is_completed ? '완료 취소' : '완료'}`}
        onClick={() => void onToggleCompletion(item)}
      >
        {item.is_completed ? '✓' : ''}
      </button>
      <div style={{ flex: 1 }}>
        <strong>{item.name}</strong>
        <div className="place-addr">
          {item.start_time ?? ''}{item.end_time ? ` - ${item.end_time}` : ''}{item.stay_minutes ? ` · ${item.stay_minutes}분 체류` : ''}
        </div>
        {item.address ? <div className="place-addr">{item.address}</div> : null}
      </div>
      <button type="button" className="ghost-icon" onClick={onChangePlace} aria-label="장소 변경">
        ✎
      </button>
    </div>
  );
}

function RouteRow({ route }: { route: ItineraryRouteItem }) {
  const transport = route.transport_type === 'PUBLIC_TRANSPORT' || route.transport === 'PUBLIC'
    ? '대중교통'
    : route.transport_type === 'WALK' || route.transport === 'WALK'
      ? '도보'
      : '차량';
  const distance = route.distance_meter != null
    ? `${(route.distance_meter / 1000).toFixed(1)}km`
    : route.distance_km != null
      ? `${route.distance_km}km`
      : null;
  return (
    <div className="route-item">
      <div className="route-summary">
        <strong>{transport}</strong>
        {route.duration_minutes != null ? <span>{route.duration_minutes}분</span> : null}
        {distance ? <span>{distance}</span> : null}
        {route.cost != null ? <span>{route.cost.toLocaleString()}원</span> : null}
      </div>
      {route.line_name || route.vehicle_number ? (
        <div className="route-detail">{route.line_name ?? ''}{route.vehicle_number ? ` · ${route.vehicle_number}` : ''}</div>
      ) : null}
      {route.next_arrival_minutes != null ? (
        <div className="route-detail">다음 버스·열차 {route.next_arrival_minutes}분 후 도착</div>
      ) : null}
      {route.estimated_arrival_at ? <div className="route-detail">도착 예정 {formatDateTime(route.estimated_arrival_at)}</div> : null}
      {route.realtime ? <span className="route-realtime">실시간 반영</span> : null}
    </div>
  );
}

function isPlaceItem(item: ItineraryItem): item is ItineraryPlaceItem {
  return item.type === 'PLACE';
}

function updatePlaceCompletion(
  detail: TravelDetail,
  result: { itinerary_item_id: number; is_completed: boolean; completed_at: string | null },
) {
  return {
    ...detail,
    itinerary_days: detail.itinerary_days.map((day) => ({
      ...day,
      items: day.items.map((item) => item.type === 'PLACE' && item.itinerary_item_id === result.itinerary_item_id
        ? { ...item, is_completed: result.is_completed, completed_at: result.completed_at }
        : item),
    })),
  };
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}
