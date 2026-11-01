import { travelsApi } from '@/api';
import { ChevronRightIcon } from '@/components/Icons';
import { PlannerHeader } from '@/components/PlannerHeader';
import { daysUntil, formatDateRange, formatTripLength, getDateBlock, parseDate, startOfToday } from '@/lib/tripDates';
import type { TravelSummary } from '@/types';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type TripFilter = 'all' | 'confirmed' | 'draft';

const FILTERS: { key: TripFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'confirmed', label: '확정' },
  { key: 'draft', label: '확정 전' },
];

export function MyTripsPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TravelSummary[]>([]);
  const [filter, setFilter] = useState<TripFilter>('all');

  useEffect(() => {
    travelsApi.getMyTrips().then((nextTrips) => {
      setTrips(nextTrips.filter((trip) => trip.status !== 'FAILED'));
    });
  }, []);

  const groups = useMemo(() => groupTrips(trips, filter), [trips, filter]);
  const isEmpty = groups.upcoming.length === 0 && groups.past.length === 0;

  return (
    <section className="screen jr-screen">
      <PlannerHeader title="여행 기록" onBack={() => navigate(-1)} />
      <div className="scroll my-trips-scroll jr-scroll">
        <div className="jr-filters" role="group" aria-label="여행 확정 상태 필터">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`jr-filter${filter === item.key ? ' on' : ''}`}
              aria-pressed={filter === item.key}
              onClick={() => setFilter(item.key)}>
              {item.label}
            </button>
          ))}
        </div>

        {isEmpty ? (
          <div className="jr-empty">{trips.length === 0 ? '생성된 여행이 없습니다.' : '해당하는 여행이 없어요.'}</div>
        ) : (
          <>
            <TripGroup title="진행 중 · 다가오는 여행" trips={groups.upcoming} onOpen={(id) => navigate(`/output/${id}/places`)} />
            <TripGroup title="지난 여행" trips={groups.past} onOpen={(id) => navigate(`/output/${id}/places`)} />
          </>
        )}
      </div>
    </section>
  );
}

function TripGroup({ title, trips, onOpen }: { title: string; trips: TravelSummary[]; onOpen: (id: number) => void }) {
  if (trips.length === 0) return null;
  return (
    <section className="jr-group">
      <h2 className="jr-group-title">{title}</h2>
      <div className="my-trips-list jr-list">
        {trips.map((trip) => (
          <TripRecordCard key={trip.travel_plan_id} trip={trip} onClick={() => onOpen(trip.travel_plan_id)} />
        ))}
      </div>
    </section>
  );
}

/**
 * 여행 기록 카드. 홈 "최근 여행" 카드와 같은 날짜 블록(hv-cal)을 쓰고,
 * 오른쪽에 상태 배지(D-day / 여행 중 / 확정 / 확정 전)를 둔다.
 * e2e 호환을 위해 루트 클래스(list-card)와 제목 <strong> 을 유지한다.
 */
function TripRecordCard({ trip, onClick }: { trip: TravelSummary; onClick: () => void }) {
  const block = getDateBlock(trip.start_date);
  const badge = tripBadge(trip);
  const sub = [formatTripLength(trip.start_date, trip.end_date), trip.companion_label].filter(Boolean).join(' · ');

  return (
    <button type="button" className="list-card hv-trip jr-trip" onClick={onClick}>
      <span className={`hv-cal${block.isPastYear ? ' past-year' : ''}`} aria-hidden="true">
        <span className="hv-cal-band">{block.yearMonth}</span>
        <span className="hv-cal-day">{block.day}</span>
        <span className="hv-cal-weekday">{block.weekday}</span>
      </span>
      <span className="hv-trip-body">
        <strong>{trip.title}</strong>
        <span className="hv-trip-range">{formatDateRange(trip.start_date, trip.end_date)}</span>
        <span className="hv-trip-length">{sub}</span>
      </span>
      <span className={`jr-badge ${badge.tone}`}>{badge.label}</span>
      <ChevronRightIcon className="hv-trip-chevron" size={14} />
    </button>
  );
}

function tripBadge(trip: TravelSummary): { label: string; tone: 'dday' | 'ongoing' | 'confirmed' | 'draft' } {
  const today = startOfToday().getTime();
  const start = parseDate(trip.start_date).getTime();
  const end = parseDate(trip.end_date).getTime();
  if (start <= today && today <= end) return { label: '여행 중', tone: 'ongoing' };
  if (start > today) {
    const days = daysUntil(trip.start_date);
    return { label: `D-${days}`, tone: 'dday' };
  }
  return trip.confirmed_at ? { label: '확정', tone: 'confirmed' } : { label: '확정 전', tone: 'draft' };
}

/** 상태 필터를 적용한 뒤, 끝나지 않은 여행(가까운 순)과 지난 여행(최근 순)으로 나눈다. */
function groupTrips(trips: TravelSummary[], filter: TripFilter) {
  const today = startOfToday().getTime();
  const filtered = trips.filter((trip) => {
    if (filter === 'confirmed') return Boolean(trip.confirmed_at);
    if (filter === 'draft') return !trip.confirmed_at;
    return true;
  });
  const startOf = (trip: TravelSummary) => parseDate(trip.start_date).getTime();
  const upcoming = filtered
    .filter((trip) => parseDate(trip.end_date).getTime() >= today)
    .sort((a, b) => startOf(a) - startOf(b));
  const past = filtered
    .filter((trip) => parseDate(trip.end_date).getTime() < today)
    .sort((a, b) => startOf(b) - startOf(a));
  return { upcoming, past };
}
