import { CheckIcon, ChevronRightIcon } from '@/components/Icons';
import { isCurrentTrip } from '@/components/TripCards';
import { daysUntil, formatDateRange, formatTripLength, getDateBlock, getTripWeek } from '@/lib/tripDates';
import type { TravelSummary } from '@/types';

function ddayLabel(trip: TravelSummary) {
  if (isCurrentTrip(trip)) return { value: '여행중', caption: '즐거운 여행 되세요' };
  const days = daysUntil(trip.start_date);
  if (days === 0) return { value: 'D-DAY', caption: '오늘 출발해요' };
  if (days > 0) return { value: `D-${days}`, caption: '출발까지' };
  return { value: '여행 종료', caption: '' };
}

/**
 * 홈 상단 예정 여행 카드.
 * e2e 호환을 위해 루트에 기존 클래스(hero-card)를 함께 둔다.
 */
export function HomeUpcomingCard({ trip, onClick }: { trip: TravelSummary; onClick: () => void }) {
  const dday = ddayLabel(trip);
  const week = getTripWeek(trip.start_date, trip.end_date);
  const statusLabel = trip.confirmed_at ? '일정 확정' : '추천 완료';

  return (
    <article className="hero-card hv-hero">
      <div className="hv-hero-grid" aria-hidden="true" />
      <div className="hv-hero-top">
        <p className="hv-dday">
          <strong>{dday.value}</strong>
          {dday.caption ? <span>{dday.caption}</span> : null}
        </p>
        <span className="hv-status">
          <CheckIcon size={12} />
          {statusLabel}
        </span>
      </div>
      <h3 className="hv-hero-title">{trip.title}</h3>
      <p className="hv-hero-meta">
        {formatDateRange(trip.start_date, trip.end_date, { withYear: true })} · {formatTripLength(trip.start_date, trip.end_date)}
      </p>
      <ol className="hv-week" aria-label="출발 주간 일정">
        {week.map((cell) => (
          <li
            key={cell.key}
            className={[
              'hv-week-day',
              cell.inTrip ? 'in-trip' : '',
              cell.isTripStart ? 'trip-start' : '',
              cell.isTripEnd ? 'trip-end' : '',
              cell.isToday ? 'today' : '',
            ].filter(Boolean).join(' ')}
            aria-current={cell.isToday ? 'date' : undefined}>
            <span className="hv-week-label">{cell.weekday}</span>
            <span className="hv-week-date">{cell.date}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="hv-hero-cta" onClick={onClick}>
        일정 이어보기
        <ChevronRightIcon size={16} />
      </button>
    </article>
  );
}

/**
 * 홈 "최근 여행" 카드.
 * 날짜 블록은 연.월 띠 + 출발일 + 요일로 구성해 연도가 달라도 구분되게 한다.
 * e2e 호환을 위해 루트 클래스(list-card)와 제목 <strong> 을 유지한다.
 */
export function HomeRecentTripCard({ trip, onClick }: { trip: TravelSummary; onClick: () => void }) {
  const block = getDateBlock(trip.start_date);

  return (
    <button type="button" className="list-card hv-trip" onClick={onClick}>
      <span className={`hv-cal${block.isPastYear ? ' past-year' : ''}`} aria-hidden="true">
        <span className="hv-cal-band">{block.yearMonth}</span>
        <span className="hv-cal-day">{block.day}</span>
        <span className="hv-cal-weekday">{block.weekday}</span>
      </span>
      <span className="hv-trip-body">
        <strong>{trip.title}</strong>
        <span className="hv-trip-range">{formatDateRange(trip.start_date, trip.end_date)}</span>
        <span className="hv-trip-length">{formatTripLength(trip.start_date, trip.end_date)}</span>
      </span>
      {trip.companion_label ? <span className="hv-trip-tag">{trip.companion_label}</span> : null}
      <ChevronRightIcon className="hv-trip-chevron" size={14} />
    </button>
  );
}
