import type { TravelSummary } from '@/types';

function dday(startDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((start.getTime() - today.getTime()) / 86400000);
}

function formatRange(start: string, end: string) {
  return `${start.replaceAll('-', '.')} - ${end.replaceAll('-', '.')}`;
}

export function TripHeroCard({ trip, onClick }: { trip: TravelSummary; onClick: () => void }) {
  const day = dday(trip.start_date);
  return (
    <article className="hero-card">
      <div className="hero-glow" />
      <span className="dday">{day >= 0 ? `D-${day}` : `D+${Math.abs(day)}`}</span>
      <h2 className="hero-title">{trip.title}</h2>
      <p className="hero-meta">{formatRange(trip.start_date, trip.end_date)} · 추천 완료</p>
      <button type="button" className="hero-cta" onClick={onClick}>
        일정 이어보기
      </button>
    </article>
  );
}

export function TripListCard({ trip, onClick }: { trip: TravelSummary; onClick: () => void }) {
  return (
    <button type="button" className="list-card" onClick={onClick}>
      <span className="dot" style={{ background: trip.cover_color ?? '#2A9D8F' }} />
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
