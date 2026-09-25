import { travelsApi } from '@/api';
import { Header } from '@/components/Header';
import { TripHeroCard, TripListCard } from '@/components/TripCards';
import { useAuth } from '@/context/AuthContext';
import type { TravelSummary } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState<TravelSummary | null>(null);
  const [recent, setRecent] = useState<TravelSummary[]>([]);

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

  return (
    <section className="screen">
      <Header title="내 여행" showBell />
      <div className="scroll">
        <div className="kicker">내 여행</div>
        <p className="hello">안녕하세요, {user?.nickname ?? '여행자'}님</p>
        <h2 className="page-title">다음 여행을 이어서 준비해요</h2>
        {upcoming ? (
          <TripHeroCard trip={upcoming} onClick={() => navigate(`/output/${upcoming.travel_plan_id}/places`)} />
        ) : (
          <div className="empty-box">여행을 만들어볼까요?</div>
        )}
        <h3 className="section">추천 메뉴</h3>
        <div className="menus">
          <button type="button" className="menu" onClick={() => navigate('/my-trips')}>
            <div className="menu-icon" style={{ background: 'var(--teal-soft)' }}>
              🗺
            </div>
            <strong>여행 기록 보기</strong>
            <p className="place-addr">다녀온 여행 보러가기</p>
          </button>
          <button type="button" className="menu" onClick={() => navigate('/create-travel')}>
            <div className="menu-icon" style={{ background: 'var(--primary-soft)' }}>
              ✦
            </div>
            <strong>여행 생성하기</strong>
            <p className="place-addr">AI가 만들어주는 여행 코스</p>
          </button>
        </div>
        <h3 className="section">최근 여행</h3>
        {recent.length === 0 ? (
          <div className="empty-box">최근에 다녀온 여행이 없습니다.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {recent.map((trip) => (
              <TripListCard key={trip.travel_plan_id} trip={trip} onClick={() => navigate(`/output/${trip.travel_plan_id}/places`)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
