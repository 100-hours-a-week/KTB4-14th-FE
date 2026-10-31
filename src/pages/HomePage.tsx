import { travelsApi } from '@/api';
import { Digo } from '@/components/Digo';
import { HomeRecentTripCard, HomeUpcomingCard } from '@/components/HomeTripCards';
import { BellIcon, CalendarSparkIcon, ChevronRightIcon, MapFoldIcon, PlusIcon } from '@/components/Icons';
import { isCurrentTrip } from '@/components/TripCards';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useTravelDraft } from '@/context/TravelDraftContext';
import { daysUntil } from '@/lib/tripDates';
import type { TravelSummary } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CREATE_STEPS = ['기본 정보', '여행 취향', '필수 장소'];

function HomeTitle({ upcoming }: { upcoming: TravelSummary | null }) {
  if (!upcoming) {
    return (
      <h2 className="hv-title">
        다음 여행을
        <br />
        <em>계획</em>해볼까요?
      </h2>
    );
  }
  if (isCurrentTrip(upcoming)) {
    return (
      <h2 className="hv-title">
        지금 여행 일정을
        <br />
        <em>확인</em>해 보세요
      </h2>
    );
  }
  const days = daysUntil(upcoming.start_date);
  const place = upcoming.destination || upcoming.title;
  if (days === 0) {
    return (
      <h2 className="hv-title">
        오늘 <em>{place}</em>
        <br />
        여행을 떠나요
      </h2>
    );
  }
  return (
    <h2 className="hv-title">
      {place} 여행까지
      <br />
      <em>{days}일</em> 남았어요
    </h2>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unread } = useNotifications();
  const { reset } = useTravelDraft();
  const [upcoming, setUpcoming] = useState<TravelSummary | null>(null);
  const [recent, setRecent] = useState<TravelSummary[]>([]);
  const nickname = user?.nickname ?? '여행자';

  useEffect(() => {
    let alive = true;
    travelsApi.getUpcoming().then((next) => {
      if (alive) setUpcoming(next);
    }).catch(() => {
      if (alive) setUpcoming(null);
    });
    travelsApi.getRecent().then((rec) => {
      if (alive) setRecent(rec);
    }).catch(() => {
      if (alive) setRecent([]);
    });
    return () => {
      alive = false;
    };
  }, []);

  const startCreate = () => {
    reset();
    navigate('/create-travel');
  };

  return (
    <section className="screen hv-screen">
      <header className="hv-header">
        <h1 className="hv-header-title">내 여행</h1>
        <button type="button" className="hv-bell" onClick={() => navigate('/notifications')} aria-label="알림">
          <BellIcon size={20} />
          {unread > 0 ? <span className="hv-bell-badge" aria-hidden="true" /> : null}
        </button>
      </header>

      <div className="scroll hv-scroll">
        <p className="hv-hello">
          <span className="hv-avatar" aria-hidden="true">{nickname.slice(0, 1)}</span>
          안녕하세요, {nickname}님
        </p>
        <HomeTitle upcoming={upcoming} />

        {upcoming ? (
          <HomeUpcomingCard trip={upcoming} onClick={() => navigate(`/output/${upcoming.travel_plan_id}/places`)} />
        ) : (
          <section className="hv-empty" aria-labelledby="hv-empty-title">
            <div className="hv-empty-grid" aria-hidden="true" />
            <Digo className="hv-empty-digo" />
            <p className="hv-eyebrow">NEW PLAN</p>
            <h3 id="hv-empty-title" className="hv-empty-title">여행을 만들어볼까요?</h3>
            <p className="hv-empty-desc">
              아직 예정된 여행이 없어요.
              <br />
              지역·날짜·취향만 고르면 AI가 장소와 이동 경로까지 짜드려요.
            </p>
            <ol className="hv-steps">
              {CREATE_STEPS.map((step, index) => (
                <li key={step}>
                  <span className="hv-step-num">{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
            <button type="button" className="hv-primary-btn" onClick={startCreate}>
              <PlusIcon size={18} />
              새 여행 계획 세우기
            </button>
          </section>
        )}

        <div className="hv-section-head">
          <h3 className="hv-section-title">바로가기</h3>
        </div>
        <div className="hv-quick-grid">
          <button type="button" className="hv-quick" onClick={startCreate}>
            <span className="hv-quick-icon create" aria-hidden="true">
              <CalendarSparkIcon size={26} />
            </span>
            <ChevronRightIcon className="hv-quick-arrow" size={12} />
            <strong>여행 생성하기</strong>
            <span className="hv-quick-desc">AI가 만들어주는 여행 코스</span>
          </button>
          <button type="button" className="hv-quick" onClick={() => navigate('/my-trips')}>
            <span className="hv-quick-icon record" aria-hidden="true">
              <MapFoldIcon size={26} />
            </span>
            <ChevronRightIcon className="hv-quick-arrow" size={12} />
            <strong>여행 기록 보기</strong>
            <span className="hv-quick-desc">다녀온 여행 보러가기</span>
          </button>
        </div>

        <div className="hv-section-head">
          <h3 className="hv-section-title">최근 여행</h3>
          {recent.length > 0 ? (
            <button type="button" className="hv-more" onClick={() => navigate('/my-trips')}>
              전체보기
              <ChevronRightIcon size={12} />
            </button>
          ) : null}
        </div>
        {recent.length === 0 ? (
          <div className="hv-empty-list">최근에 다녀온 여행이 없습니다.</div>
        ) : (
          <div className="hv-trip-list">
            {recent.map((trip) => (
              <HomeRecentTripCard
                key={trip.travel_plan_id}
                trip={trip}
                onClick={() => navigate(`/output/${trip.travel_plan_id}/places`)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
