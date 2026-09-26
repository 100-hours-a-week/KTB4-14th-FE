import { USE_MOCK, travelsApi } from '@/api';
import { Header } from '@/components/Header';
import { KakaoRouteMap } from '@/components/KakaoRouteMap';
import { Modal } from '@/components/Modal';
import { nightsAndDays } from '@/lib/options';
import type {
  ItineraryDay,
  ItineraryItem,
  ItineraryPlaceItem,
  ItineraryRouteLeg,
  ItineraryRouteItem,
  ItineraryRouteStop,
  TravelDetail,
} from '@/types';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

type OutputTab = 'places' | 'routes';

type RouteEntry = {
  route: ItineraryRouteItem;
  from?: ItineraryPlaceItem;
  to?: ItineraryPlaceItem;
};

export function OutputPlacesPage() {
  return <OutputPage tab="places" />;
}

export function OutputRoutesPage() {
  return <OutputPage tab="routes" />;
}

/**
 * Backwards-compatible entry point for links created before the output tabs
 * were split into their own routes.
 */
export function ItineraryPage() {
  const { id } = useParams();
  return <Navigate to={`/output/${id}/places`} replace />;
}

function OutputPage({ tab }: { tab: OutputTab }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const planId = Number(id);
  const [detail, setDetail] = useState<TravelDetail | null>(null);
  const [recreate, setRecreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [routeDetailId, setRouteDetailId] = useState<number | null>(null);
  const entryRequestRef = useRef<{ planId: number; cancelled: boolean } | null>(null);
  const routeDetailEntry = useMemo(
    () => detail?.itinerary_days
      .flatMap((day) => getRouteEntries(day))
      .find((entry) => getRouteId(entry.route) === routeDetailId) ?? null,
    [detail, routeDetailId],
  );

  const load = async (isActive: () => boolean = () => true): Promise<TravelDetail | null> => {
    setLoading(true);
    try {
      const nextDetail = await travelsApi.getDetail(planId);
      if (isActive()) {
        setDetail(nextDetail);
        setError(null);
      }
      return nextDetail;
    } catch {
      if (isActive()) {
        setError('여행 일정을 불러오지 못했어요. 생성이 완료된 뒤 다시 시도해 주세요.');
      }
      return null;
    } finally {
      if (isActive()) setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(planId)) {
      setLoading(false);
      setError('여행 일정 번호가 올바르지 않아요.');
      return;
    }

    const existingRequest = entryRequestRef.current;
    if (existingRequest?.planId === planId) {
      // React StrictMode의 effect 재실행에서는 기존 요청을 이어서 사용한다.
      existingRequest.cancelled = false;
      return () => {
        existingRequest.cancelled = true;
      };
    }

    const request = { planId, cancelled: false };
    entryRequestRef.current = request;

    const loadAndRecalculate = async () => {
      const initialDetail = await load(() => !request.cancelled);
      if (!initialDetail || request.cancelled) return;

      try {
        const recalculated = await travelsApi.recalculateRoutes(planId);
        if (request.cancelled || !recalculated) return;

        if (recalculated.routes.length === 0) return;

        setDetail((current) => current ? mergeRecalculatedRoutes(current, recalculated.routes) : current);
      } catch {
        // 재계산 실패 시 이미 표시한 AI 계산값을 그대로 유지한다.
      }
    };

    void loadAndRecalculate();
    return () => {
      request.cancelled = true;
    };
  }, [planId]);

  const places = useMemo(
    () => detail?.itinerary_days.flatMap((day) => day.items.filter(isPlaceItem)) ?? [],
    [detail],
  );

  const changeTab = (nextTab: OutputTab) => {
    if (nextTab === tab) return;
    navigate(`/output/${planId}/${nextTab}`);
  };

  const updateCompletion = async (place: ItineraryPlaceItem) => {
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
  };

  if (loading && !detail) {
    return <OutputFrame onBack={() => navigate('/home', { replace: true })}>여행 일정을 불러오는 중이에요.</OutputFrame>;
  }

  if (!detail) {
    return (
      <OutputFrame onBack={() => navigate('/home', { replace: true })}>
        <div className="empty-box">{error ?? '여행 일정을 찾을 수 없어요.'}</div>
      </OutputFrame>
    );
  }

  return (
    <section className="screen output-screen">
      <Header title="추천 경로" onBack={() => navigate('/home', { replace: true })} showBell />
      <div className="scroll output-scroll">
        <OutputTripSummary detail={detail} placeCount={places.length} onRecreate={() => setRecreate(true)} />
        {error ? <p className="field-help error" role="alert">{error}</p> : null}
        <OutputTabs active={tab} onChange={changeTab} />
        {tab === 'places' ? <p className="output-helper">다음 장소로 이동할 때 체크표시를 눌러주세요.</p> : null}

        {tab === 'places' ? (
          <PlacesOutput
            detail={detail}
            updatingItemId={updatingItemId}
            onToggleCompletion={updateCompletion}
            onChangePlace={(itemId) => navigate(`/create-travel/map-search?replaceItemId=${itemId}`)}
            onOpenRouteDetail={(entry) => setRouteDetailId(getRouteId(entry.route))}
          />
        ) : (
          <RoutesOutput
            detail={detail}
            places={places}
            onOpenRouteDetail={(entry) => setRouteDetailId(getRouteId(entry.route))}
          />
        )}

        <RecommendedMusic detail={detail} />
      </div>
      <RouteDetailSheet entry={routeDetailEntry} onClose={() => setRouteDetailId(null)} />
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

function OutputFrame({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  return (
    <section className="screen output-screen">
      <Header title="추천 경로" onBack={onBack} showBell />
      <div className="empty-box output-empty">{children}</div>
    </section>
  );
}

function OutputTripSummary({
  detail,
  placeCount,
  onRecreate,
}: {
  detail: TravelDetail;
  placeCount: number;
  onRecreate: () => void;
}) {
  const accommodationCount = detail.itinerary_days
    .flatMap((day) => day.items)
    .filter((item): item is ItineraryPlaceItem => item.type === 'PLACE' && item.place_type === 'ACCOMMODATION')
    .length;
  const meta = [`장소 ${placeCount}곳`, accommodationCount > 0 ? `숙소 ${accommodationCount}곳` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="output-trip-summary">
      <div className="output-trip-copy">
        <h2>{detail.title}</h2>
        <p>{meta || detail.destination}</p>
        <small>
          {detail.start_date.replaceAll('-', '.')} - {detail.end_date.replaceAll('-', '.')} · {nightsAndDays(detail.start_date, detail.end_date)}
        </small>
      </div>
      <button type="button" className="recreate output-recreate" onClick={onRecreate}>
        일정 다시 만들기
      </button>
    </div>
  );
}

function OutputTabs({ active, onChange }: { active: OutputTab; onChange: (tab: OutputTab) => void }) {
  return (
    <div className="tabs output-tabs" role="tablist" aria-label="여행 결과 보기">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'places'}
        className={active === 'places' ? 'on' : ''}
        onClick={() => onChange('places')}>
        장소
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'routes'}
        className={active === 'routes' ? 'on' : ''}
        onClick={() => onChange('routes')}>
        이동 경로
      </button>
    </div>
  );
}

function PlacesOutput({
  detail,
  updatingItemId,
  onToggleCompletion,
  onChangePlace,
  onOpenRouteDetail,
}: {
  detail: TravelDetail;
  updatingItemId: number | null;
  onToggleCompletion: (place: ItineraryPlaceItem) => Promise<void>;
  onChangePlace: (itemId: number) => void;
  onOpenRouteDetail: (entry: RouteEntry) => void;
}) {
  let placeNumber = 0;
  const [expandedRouteId, setExpandedRouteId] = useState<number | null>(null);
  return (
    <div className="output-place-days">
      {detail.itinerary_days.map((day) => {
        const dayPlaces = day.items.filter(isPlaceItem);
        const dayRoutes = getRouteEntries(day);
        const firstPlaceNumber = placeNumber + 1;
        placeNumber += dayPlaces.length;
        return (
          <article key={day.itinerary_day_id} className="output-day-card">
            <div className="output-day-heading">
              <strong>DAY {day.day_number}</strong>
              <span>{day.date.replaceAll('-', '.')}</span>
              <small>{day.day_number} / {detail.itinerary_days.length}일</small>
            </div>
            <div className="output-place-timeline">
              {day.items.map((item) => {
                if (item.type === 'ROUTE') return null;
                const currentNumber = firstPlaceNumber + dayPlaces.indexOf(item);
                const isLastPlace = dayPlaces[dayPlaces.length - 1]?.itinerary_item_id === item.itinerary_item_id;
                const routeEntry = dayRoutes.find((entry) => entry.from?.itinerary_item_id === item.itinerary_item_id);
                return (
                  <OutputPlaceRow
                    key={item.itinerary_item_id}
                    place={item}
                    number={currentNumber}
                    route={routeEntry?.route}
                    boardingPlace={routeEntry?.from ?? item}
                    showCompletion={!isLastPlace}
                    routeExpanded={routeEntry?.route.itinerary_item_id === expandedRouteId}
                    updating={updatingItemId === item.itinerary_item_id}
                    onToggle={() => void onToggleCompletion(item)}
                    onToggleRoute={() => {
                      const routeId = routeEntry?.route.itinerary_item_id;
                      if (routeId == null) return;
                      setExpandedRouteId((current) => current === routeId ? null : routeId);
                    }}
                    onOpenRouteDetail={() => {
                      if (routeEntry) onOpenRouteDetail(routeEntry);
                    }}
                    onChange={() => onChangePlace(item.itinerary_item_id)}
                  />
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function OutputPlaceRow({
  place,
  number,
  route,
  boardingPlace,
  showCompletion,
  routeExpanded,
  updating,
  onToggle,
  onToggleRoute,
  onOpenRouteDetail,
  onChange,
}: {
  place: ItineraryPlaceItem;
  number: number;
  route?: ItineraryRouteItem;
  boardingPlace?: ItineraryPlaceItem;
  showCompletion: boolean;
  routeExpanded: boolean;
  updating: boolean;
  onToggle: () => void;
  onToggleRoute: () => void;
  onOpenRouteDetail: () => void;
  onChange: () => void;
}) {
  return (
    <div className={`output-place-row${place.is_completed ? ' completed' : ''}`}>
      <span className="output-place-number" aria-hidden="true">{number}</span>
      <div className="output-place-content">
        <div className="output-place-heading">
          <div>
            <strong>{place.name}</strong>
            <span>{placeMeta(place)}</span>
          </div>
          <button type="button" className="ghost-icon output-edit" onClick={onChange} aria-label={`${place.name} 장소 변경`}>
            ✎
          </button>
        </div>
        {place.address ? <p className="output-place-address">{place.address}</p> : null}
        {route ? (
          <RouteInfoDisclosure
            route={route}
            boardingPlace={boardingPlace}
            expanded={routeExpanded}
            completed={Boolean(place.is_completed)}
            updating={updating}
            onToggle={onToggleRoute}
            onOpenDetail={onOpenRouteDetail}
            onToggleCompletion={onToggle}
          />
        ) : showCompletion ? (
          <button
            type="button"
            className={`completion-check output-completion${place.is_completed ? ' checked' : ''}`}
            disabled={updating}
            aria-label={`${place.name} 일정 ${place.is_completed ? '완료 취소' : '완료'}`}
            onClick={onToggle}>
            {place.is_completed ? '✓' : ''}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function RouteInfoDisclosure({
  route,
  boardingPlace,
  expanded,
  completed,
  updating,
  onToggle,
  onOpenDetail,
  onToggleCompletion,
}: {
  route: ItineraryRouteItem;
  boardingPlace?: ItineraryPlaceItem;
  expanded: boolean;
  completed: boolean;
  updating: boolean;
  onToggle: () => void;
  onOpenDetail: () => void;
  onToggleCompletion: () => void;
}) {
  return (
    <div className={`route-info${expanded ? ' expanded' : ''}`}>
      <button
        type="button"
        className="route-info-toggle"
        aria-expanded={expanded}
        aria-label={`${routeSummary(route)} ${expanded ? '상세 닫기' : '상세 보기'}`}
        onClick={onToggle}>
        <span>{routeSummary(route)}</span>
        <span className="route-info-chevron" aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>
      </button>
      {expanded ? (
        <RouteInfoPanel
          route={route}
          boardingPlace={boardingPlace}
          completed={completed}
          updating={updating}
          onOpenDetail={onOpenDetail}
          onToggleCompletion={onToggleCompletion}
        />
      ) : null}
    </div>
  );
}

function RouteInfoPanel({
  route,
  boardingPlace,
  completed,
  updating,
  onOpenDetail,
  onToggleCompletion,
}: {
  route: ItineraryRouteItem;
  boardingPlace?: ItineraryPlaceItem;
  completed: boolean;
  updating: boolean;
  onOpenDetail: () => void;
  onToggleCompletion: () => void;
}) {
  const publicTransport = isPublicTransport(route);
  const primaryInfo = publicTransport
    ? boardingLocationLabel(route, boardingPlace)
    : route.line_name ?? transportLabel(route);
  const secondaryInfo = [
    route.estimated_arrival_at ? `예상 도착 ${formatDateTime(route.estimated_arrival_at)}` : null,
    route.duration_minutes != null ? `${route.duration_minutes}분` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="route-info-panel">
      <div className="route-info-row">
        <span>탑승 위치</span>
        <strong>{primaryInfo}</strong>
      </div>
      <div className="route-info-row">
        <span>도착 · 소요</span>
        <strong>{secondaryInfo || '상세 이동 정보를 준비 중이에요.'}</strong>
      </div>
      {publicTransport ? (
        <>
          <div className="route-info-row">
            <span>노선</span>
            <strong>{transitLineLabel(route)}</strong>
          </div>
          <div className="route-info-row">
            <span>다음 버스·열차</span>
            <strong>{nextTransitArrivalLabel(route)}</strong>
          </div>
        </>
      ) : null}
      <RouteLegList route={route} />
      <button type="button" className="route-detail-open" onClick={onOpenDetail}>
        상세 경로 보기
      </button>
      <button
        type="button"
        className={`completion-check route-info-completion${completed ? ' checked' : ''}`}
        disabled={updating}
        aria-label={`일정 ${completed ? '완료 취소' : '완료'}`}
        onClick={onToggleCompletion}>
        {completed ? '✓' : ''}
      </button>
    </div>
  );
}

function RoutesOutput({
  detail,
  places,
  onOpenRouteDetail,
}: {
  detail: TravelDetail;
  places: ItineraryPlaceItem[];
  onOpenRouteDetail: (entry: RouteEntry) => void;
}) {
  const routeEntries = useMemo(
    () => detail.itinerary_days.flatMap((day) => getRouteEntries(day)),
    [detail],
  );
  const [expandedRouteId, setExpandedRouteId] = useState<number | null>(routeEntries[0]?.route.itinerary_item_id ?? null);

  useEffect(() => {
    if (expandedRouteId == null && routeEntries[0]) setExpandedRouteId(routeEntries[0].route.itinerary_item_id);
  }, [expandedRouteId, routeEntries]);

  return (
    <div className="output-routes">
      <div className="map-box route-map-box output-map-box">
        <KakaoRouteMap points={places} />
      </div>
      <div className="route-index-list output-route-index-list">
        {places.map((place, index) => (
          <div className="route-index-row" key={place.itinerary_item_id}>
            <span className="map-pin on">{index + 1}</span>
            <span>{place.name}</span>
          </div>
        ))}
      </div>
      <div className="output-route-days">
        {detail.itinerary_days.map((day) => {
          const dayRoutes = getRouteEntries(day);
          if (dayRoutes.length === 0) return null;
          return (
            <article className="output-route-day" key={day.itinerary_day_id}>
              <div className="output-route-day-heading">DAY {day.day_number} 이동</div>
              {dayRoutes.map((entry) => (
                <RouteDetailCard
                  key={entry.route.itinerary_item_id}
                  entry={entry}
                  expanded={expandedRouteId === entry.route.itinerary_item_id}
                  onOpenDetail={() => onOpenRouteDetail(entry)}
                  onToggle={() => setExpandedRouteId((current) => current === entry.route.itinerary_item_id ? null : entry.route.itinerary_item_id)}
                />
              ))}
            </article>
          );
        })}
      </div>
      {routeEntries.length === 0 ? <div className="empty-box">아직 이동 경로가 없어요.</div> : null}
    </div>
  );
}

function RouteDetailCard({
  entry,
  expanded,
  onOpenDetail,
  onToggle,
}: {
  entry: RouteEntry;
  expanded: boolean;
  onOpenDetail: () => void;
  onToggle: () => void;
}) {
  const { route, from, to } = entry;
  return (
    <div className={`output-route-card${expanded ? ' expanded' : ''}`}>
      <button type="button" className="output-route-toggle" aria-expanded={expanded} onClick={onToggle}>
        <span className="output-route-name">{from?.name ?? '이전 장소'} → {to?.name ?? '다음 장소'}</span>
        <span className="output-route-summary">{routeSummary(route)}</span>
        <span className="output-route-chevron" aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>
      </button>
      {expanded ? (
        <div className="output-route-detail">
          <div><span>탑승 위치</span><strong>{boardingLocationLabel(route, from)}</strong></div>
          <div><span>하차 위치</span><strong>{alightingLocationLabel(route, to)}</strong></div>
          <RouteLegList route={route} compact />
          <button type="button" className="route-detail-open" onClick={onOpenDetail}>
            상세 경로 보기
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RouteDetailSheet({ entry, onClose }: { entry: RouteEntry | null; onClose: () => void }) {
  if (!entry) return null;

  const { route } = entry;
  const duration = route.duration_minutes != null ? `${route.duration_minutes}분` : '이동 경로';
  const meta = [routeTimeRangeLabel(route), route.total_fare_amount != null ? `${route.total_fare_amount.toLocaleString()}원` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="route-detail-backdrop" role="presentation" onClick={onClose}>
      <section
        className="route-detail-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-detail-title"
        onClick={(event) => event.stopPropagation()}>
        <div className="route-detail-handle" aria-hidden="true" />
        <header className="route-detail-header">
          <div>
            <strong id="route-detail-title">{duration}</strong>
            <p>{meta || '상세 이동 정보를 준비 중이에요.'}</p>
          </div>
          <button type="button" className="route-detail-close" aria-label="상세 경로 닫기" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="route-detail-body">
          <RouteDetailTimeline entry={entry} />
          {isPublicTransport(route) && route.next_arrival_minutes != null ? (
            <p className="route-detail-live">다음 버스·열차 · {nextTransitArrivalLabel(route)}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function RouteDetailTimeline({ entry }: { entry: RouteEntry }) {
  const { route, from, to } = entry;
  const legs = [...(route.legs ?? [])].sort((a, b) => a.sequence - b.sequence);

  if (legs.length === 0) {
    return (
      <div className="route-detail-fallback">
        <strong>{from?.name ?? '출발 장소'}</strong>
        <span aria-hidden="true">→</span>
        <strong>{to?.name ?? '도착 장소'}</strong>
        <p>{routeSummary(route)}</p>
      </div>
    );
  }

  const start = routeStopLabel(legs[0].boarding_stop) || from?.address || from?.name || '출발 장소';

  return (
    <div className="route-detail-timeline">
      <div className="route-timeline-point">
        <span className="route-timeline-marker route-timeline-marker-start" aria-hidden="true">●</span>
        <strong>{start}</strong>
      </div>
      {legs.map((leg) => {
        const transit = routeLegTransitLabel(leg, true);
        const duration = leg.duration_minute != null ? `${leg.duration_minute}분` : '';
        const distance = leg.distance_meter != null ? `${(leg.distance_meter / 1000).toFixed(1)}km` : '';
        const boarding = routeStopLabel(leg.boarding_stop) || '승차 위치 확인 중';
        const alighting = routeStopLabel(leg.alighting_stop) || '하차 위치 확인 중';
        const meta = [duration, distance].filter(Boolean).join(' · ');
        const modeClass = routeLegModeClass(leg);

        return (
          <div className={`route-timeline-group mode-${modeClass}`} key={`${leg.sequence}-${leg.mode}`}>
            <div className="route-timeline-leg">
              <span className="route-timeline-marker route-timeline-mode-marker" aria-hidden="true">
                {routeLegIcon(leg)}
              </span>
              <div className="route-timeline-leg-copy">
                <div className="route-timeline-leg-title">
                  <strong>{routeLegModeLabel(leg)}</strong>
                  {transit ? <span>{transit}</span> : null}
                </div>
                <div className="route-timeline-leg-stops">
                  <span>{boarding}</span>
                  <span aria-hidden="true">→</span>
                  <span>{alighting}</span>
                </div>
                {meta ? <small>{meta}</small> : null}
              </div>
            </div>
            <div className="route-timeline-point">
              <span className="route-timeline-marker route-timeline-marker-end" aria-hidden="true">○</span>
              <strong>{alighting}</strong>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RouteLegList({ route, compact = false }: { route: ItineraryRouteItem; compact?: boolean }) {
  const legs = [...(route.legs ?? [])].sort((a, b) => a.sequence - b.sequence);
  if (legs.length === 0) return null;

  return (
    <div className={`route-leg-list${compact ? ' compact' : ''}`}>
      {!compact ? <span className="route-leg-title">세부 이동</span> : null}
      {legs.map((leg) => {
        const duration = leg.duration_minute != null ? `${leg.duration_minute}분` : '';
        const distance = leg.distance_meter != null ? `${(leg.distance_meter / 1000).toFixed(1)}km` : '';
        const meta = [duration, distance].filter(Boolean).join(' · ');
        const transit = routeLegTransitLabel(leg);

        return (
          <div className="route-leg" key={`${leg.sequence}-${leg.mode}`}>
            <div className="route-leg-head">
              <span>{leg.sequence}. {routeLegModeLabel(leg)}</span>
              {transit ? <strong>{transit}</strong> : null}
            </div>
            <div className="route-leg-stops">
              <span>{routeStopLabel(leg.boarding_stop) || '승차 위치 확인 중'}</span>
              <span aria-hidden="true">→</span>
              <span>{routeStopLabel(leg.alighting_stop) || '하차 위치 확인 중'}</span>
            </div>
            {meta ? <small className="route-leg-meta">{meta}</small> : null}
          </div>
        );
      })}
    </div>
  );
}

function RecommendedMusic({ detail }: { detail: TravelDetail }) {
  const track = detail.recommended_music?.[0];
  if (!track) return null;
  return (
    <div className="output-music">
      <div>
        <small>추천 음악</small>
        <strong>{track.title}</strong>
        <span>{track.artist}</span>
      </div>
      <button type="button" aria-label={`${track.title} 재생`}>▶</button>
    </div>
  );
}

function getRouteEntries(day: ItineraryDay): RouteEntry[] {
  const entries: RouteEntry[] = [];
  const places = day.items.filter(isPlaceItem);
  day.items.forEach((item, index) => {
    if (item.type !== 'ROUTE') return;
    const from = places.find((place) => place.itinerary_item_id === item.from_itinerary_item_id)
      ?? findPreviousPlace(day.items, index);
    const to = places.find((place) => place.itinerary_item_id === item.to_itinerary_item_id)
      ?? findNextPlace(day.items, index);
    entries.push({ route: item, from, to });
  });
  return entries;
}

function getRouteId(route: ItineraryRouteItem) {
  return route.route_segment_id ?? route.itinerary_item_id;
}

function findPreviousPlace(items: ItineraryItem[], index: number) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = items[cursor];
    if (isPlaceItem(candidate)) return candidate;
  }
  return undefined;
}

function findNextPlace(items: ItineraryItem[], index: number) {
  for (let cursor = index + 1; cursor < items.length; cursor += 1) {
    const candidate = items[cursor];
    if (isPlaceItem(candidate)) return candidate;
  }
  return undefined;
}

function placeMeta(place: ItineraryPlaceItem) {
  const time = place.start_time
    ? `${formatTimeToMinute(place.start_time)}${place.end_time ? ` - ${formatTimeToMinute(place.end_time)}` : ''}`
    : '';
  const stay = place.stay_minutes ? `${place.stay_minutes}분 체류` : '';
  const type = place.place_type === 'RESTAURANT'
    ? '식당'
    : place.place_type === 'ACCOMMODATION'
      ? '숙소'
      : '관광';
  return [time, type, stay].filter(Boolean).join(' · ');
}

function formatTimeToMinute(value: string) {
  const match = value.match(/(?:^|T)(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : value;
}

function routeSummary(route: ItineraryRouteItem) {
  const transport = transportLabel(route);
  const duration = route.duration_minutes != null ? `${route.duration_minutes}분` : '';
  const distance = route.distance_meter != null
    ? `${(route.distance_meter / 1000).toFixed(1)}km`
    : route.distance_km != null
      ? `${route.distance_km}km`
      : '';
  const fare = route.total_fare_amount != null ? `${route.total_fare_amount.toLocaleString()}원` : transport === '도보' ? '무료' : '';
  return [transport, duration, distance, fare].filter(Boolean).join(' · ');
}

function transportLabel(route: ItineraryRouteItem) {
  return isPublicTransport(route)
    ? '대중교통'
    : route.transport_type === 'WALK' || route.transport === 'WALK'
      ? '도보'
      : '차량';
}

function boardingLocationLabel(route: ItineraryRouteItem, place?: ItineraryPlaceItem) {
  if (isPublicTransport(route)) {
    return routeStopLabel(route.legs?.[0]?.boarding_stop) || place?.address || '승차 정류장 정보 확인 중';
  }
  return place?.address ?? '출발 장소';
}

function alightingLocationLabel(route: ItineraryRouteItem, place?: ItineraryPlaceItem) {
  if (isPublicTransport(route)) {
    return routeStopLabel(route.legs?.at(-1)?.alighting_stop) || place?.address || '하차 정류장 정보 확인 중';
  }
  return place?.address ?? '도착 장소';
}

function isPublicTransport(route: ItineraryRouteItem) {
  return route.transport_type === 'PUBLIC_TRANSPORT' || route.transport === 'PUBLIC';
}

function transitLineLabel(route: ItineraryRouteItem) {
  const legLabels = (route.legs ?? [])
    .map((leg) => {
      const transit = routeLegTransitLabel(leg);
      return transit ? `${routeLegModeLabel(leg)} ${transit}` : '';
    })
    .filter(Boolean);
  if (legLabels.length > 0) return legLabels.join(' · ');

  const lineName = route.line_name?.trim();
  const vehicleNumber = route.vehicle_number?.trim();
  const formattedLineName = lineName && /^\d+$/.test(lineName) ? `${lineName}번` : lineName;
  const sameLine = formattedLineName?.replace(/번$/, '') === vehicleNumber?.replace(/번$/, '');
  return (sameLine ? [formattedLineName] : [formattedLineName, vehicleNumber])
    .filter(Boolean)
    .join(' · ') || '노선 정보 확인 중';
}

function routeStopLabel(stop?: ItineraryRouteStop | null) {
  if (!stop) return '';
  const name = stop.name?.trim();
  const stationNumber = stop.station_number?.trim();
  return [name, stationNumber ? `(${stationNumber})` : null].filter(Boolean).join(' ');
}

function routeLegModeLabel(leg: ItineraryRouteLeg) {
  const labels: Record<string, string> = {
    BUS: '버스',
    SUBWAY: '지하철',
    WALK: '도보',
    CAR: '차량',
    PUBLIC_TRANSPORT: '대중교통',
  };
  return labels[leg.mode.toUpperCase()] ?? leg.mode;
}

function routeLegModeClass(leg: ItineraryRouteLeg) {
  const mode = leg.mode.toUpperCase();
  if (mode === 'BUS') return 'bus';
  if (mode === 'SUBWAY') return 'subway';
  if (mode === 'WALK') return 'walk';
  if (mode === 'CAR') return 'car';
  return 'public';
}

function routeLegIcon(leg: ItineraryRouteLeg) {
  const icons: Record<string, string> = {
    BUS: '🚌',
    SUBWAY: '🚇',
    WALK: '🚶',
    CAR: '🚗',
  };
  return icons[leg.mode.toUpperCase()] ?? '•';
}

function routeLegTransitLabel(leg: ItineraryRouteLeg, showAllBusNumbers = false) {
  const busNumbers = (leg.bus_number ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => /^\d+$/.test(value) ? `${value}번` : value);
  const subwayLines = (leg.subway_line ?? []).map((value) => value.trim()).filter(Boolean);
  const busLabel = !showAllBusNumbers && busNumbers.length > 2
    ? `${busNumbers.slice(0, 2).join(', ')} 외`
    : busNumbers.join(', ');
  return [busLabel, ...subwayLines].filter(Boolean).join(' · ');
}

function nextTransitArrivalLabel(route: ItineraryRouteItem) {
  const currentBasis = route.realtime ? '현재 기준 ' : '';
  if (route.next_arrival_minutes != null) return `${currentBasis}${route.next_arrival_minutes}분 후 도착`;
  if (route.estimated_arrival_at) return `${currentBasis}예상 도착 ${formatDateTime(route.estimated_arrival_at)}`;
  return '도착 정보 확인 중';
}

function routeTimeRangeLabel(route: ItineraryRouteItem) {
  const departure = route.estimated_departure_at ? formatDateTime(route.estimated_departure_at) : null;
  const arrival = route.estimated_arrival_at ? formatDateTime(route.estimated_arrival_at) : null;
  if (departure && arrival) return `${departure} - 예상 도착 ${arrival}`;
  if (departure) return `${departure} 출발`;
  if (arrival) return `예상 도착 ${arrival}`;
  return '';
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
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

function mergeRecalculatedRoutes(detail: TravelDetail, refreshedRoutes: ItineraryRouteItem[]): TravelDetail {
  const routeById = new Map(
    refreshedRoutes.map((route) => [getRouteId(route), route]),
  );

  const mergeRoute = (route: ItineraryRouteItem): ItineraryRouteItem => {
    const refreshed = routeById.get(getRouteId(route));
    if (!refreshed) return route;

    const hasFreshRealtime = refreshed.realtime === true;
    return {
      ...route,
      ...refreshed,
      // legs와 경로 기본 정보는 realtime 여부와 관계없이 갱신한다.
      legs: refreshed.legs?.length ? refreshed.legs : route.legs,
      duration_minutes: refreshed.duration_minutes ?? route.duration_minutes,
      distance_meter: refreshed.distance_meter ?? route.distance_meter,
      distance_km: refreshed.distance_km ?? route.distance_km,
      total_fare_amount: refreshed.total_fare_amount ?? route.total_fare_amount,
      line_name: refreshed.line_name ?? route.line_name,
      vehicle_number: refreshed.vehicle_number ?? route.vehicle_number,
      // realtime=false는 BE fallback일 수 있으므로 기존 예상시간을 유지한다.
      next_arrival_minutes: hasFreshRealtime
        ? refreshed.next_arrival_minutes
        : route.next_arrival_minutes,
      estimated_departure_at: hasFreshRealtime
        ? refreshed.estimated_departure_at
        : route.estimated_departure_at,
      estimated_arrival_at: hasFreshRealtime
        ? refreshed.estimated_arrival_at
        : route.estimated_arrival_at,
      realtime: hasFreshRealtime ? refreshed.realtime : route.realtime,
      last_refreshed_at: hasFreshRealtime ? refreshed.last_refreshed_at : route.last_refreshed_at,
    };
  };

  return {
    ...detail,
    itinerary_days: detail.itinerary_days.map((day) => ({
      ...day,
      items: day.items.map((item) => item.type === 'ROUTE' ? mergeRoute(item) : item),
      routes: day.routes?.map(mergeRoute),
    })),
  };
}
