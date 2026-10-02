import type { TravelSummary } from '@/types';

const DAY_MS = 86400000;

function toDay(date: string) {
  return new Date(`${date}T00:00:00`).getTime();
}

function today() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

export function isCurrentTrip(trip: TravelSummary) {
  const todayValue = today();
  return toDay(trip.start_date) <= todayValue && todayValue <= toDay(trip.end_date);
}

function formatDday(trip: TravelSummary) {
  const todayValue = today();
  const startValue = toDay(trip.start_date);
  const endValue = toDay(trip.end_date);

  if (todayValue === startValue) return 'D-DAY';
  if (startValue < todayValue && todayValue <= endValue) return '여행중';
  if (todayValue < startValue) return `D-${Math.ceil((startValue - todayValue) / DAY_MS)}`;
  return '여행 종료';
}

function formatRange(start: string, end: string) {
  return `${start.replaceAll('-', '.')} - ${end.replaceAll('-', '.')}`;
}

export function TripHeroCard({ trip, onClick }: { trip: TravelSummary; onClick: () => void }) {
  return (
    <article className="hero-card">
      <div className="hero-glow" />
      <span className="dday">{formatDday(trip)}</span>
      <h2 className="hero-title">{trip.title}</h2>
      <p className="hero-meta">{formatRange(trip.start_date, trip.end_date)} · 추천 완료</p>
      <button type="button" className="hero-cta" onClick={onClick}>
        일정 이어보기
      </button>
    </article>
  );
}

export function TripListCard({ trip, onClick }: { trip: TravelSummary; onClick: () => void }) {
  const dotColor = trip.status === 'FAILED' ? 'var(--danger)' : trip.cover_color ?? '#2A9D8F';

  return (
    <button type="button" className="list-card" onClick={onClick}>
      <span className="dot" style={{ background: dotColor }} />
      <span style={{ flex: 1 }}>
        <strong>{trip.title}</strong>
        <div className="place-addr">
          {formatRange(trip.start_date, trip.end_date)}
          {trip.companion_label ? ` · ${trip.companion_label}` : ''}
        </div>
      </span>
      <span>›</span>
    </button>
  );
}
