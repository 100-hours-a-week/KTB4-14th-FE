import { useAuth } from '@/context/AuthContext';
import { USE_MOCK } from '@/api/client';
import { Digo } from '@/components/Digo';
import { CheckIcon, KakaoSymbol, PinIcon } from '@/components/Icons';
import { WEEKDAY_LABELS } from '@/lib/tripDates';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** 로그인 일러스트용 이번 달 달력 (장식) */
function useMonthCells() {
  return useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const cells: { key: string; label: string; highlight: boolean }[] = [];
    for (let i = 0; i < firstDay; i += 1) cells.push({ key: `blank-${i}`, label: '', highlight: false });
    for (let d = 1; d <= days; d += 1) {
      cells.push({ key: `d-${d}`, label: String(d), highlight: d >= 11 && d <= 14 });
    }
    return { title: `${year} ${MONTH_LABELS[month]}`, cells: cells.slice(0, 28) };
  }, []);
}

export function LoginPage() {
  const navigate = useNavigate();
  const { loginWithKakaoCode } = useAuth();
  const calendar = useMonthCells();

  const onKakao = async () => {
    const restKey = import.meta.env.VITE_KAKAO_REST_KEY;
    const redirectUri = import.meta.env.VITE_KAKAO_REDIRECT_URI ?? `${window.location.origin}/auth/kakao`;

    if (!restKey) {
      if (!USE_MOCK) {
        alert('VITE_KAKAO_REST_KEY가 비어 있습니다. AUDIGO-FE/.env에 카카오 REST API 키를 넣고 프론트 서버를 재시작해주세요.');
        return;
      }

      await loginWithKakaoCode('mock-authorization-code');
      navigate('/home', { replace: true });
      return;
    }

    window.location.href = `https://kauth.kakao.com/oauth/authorize?client_id=${restKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  };

  return (
    <section className="screen lv-screen">
      <div className="lv-scroll">
        <div className="lv-hero">
          <div className="lv-hero-grid" aria-hidden="true" />
          <div className="lv-top">
            <span className="lv-wordmark">
              <span className="lv-wordmark-mark" aria-hidden="true">
                <PinIcon size={16} />
              </span>
              AUDIGO
            </span>
            <span className="lv-top-chip">PLAN · ROUTE · MATE</span>
          </div>

          <div className="lv-art" aria-hidden="true">
            <div className="lv-card-calendar">
              <p className="lv-card-calendar-title">{calendar.title}</p>
              <div className="lv-calendar-grid">
                {WEEKDAY_LABELS.map((day) => (
                  <span key={day} className="lv-calendar-weekday">{day}</span>
                ))}
                {calendar.cells.map((cell) => (
                  <span key={cell.key} className={cell.highlight ? 'lv-calendar-day on' : 'lv-calendar-day'}>
                    {cell.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="lv-card-plan">
              <div className="lv-card-plan-head">
                <strong>Day 1</strong>
                <span>오늘의 동선</span>
              </div>
              <div className="lv-plan-row">
                <span className="lv-plan-time">10:00</span>
                <span className="lv-plan-check done"><CheckIcon size={10} /></span>
                <span className="lv-plan-name">역에서 출발</span>
              </div>
              <span className="lv-plan-route">지하철 · 18분</span>
              <div className="lv-plan-row">
                <span className="lv-plan-time">11:00</span>
                <span className="lv-plan-check done"><CheckIcon size={10} /></span>
                <span className="lv-plan-name">전시관 둘러보기</span>
              </div>
              <span className="lv-plan-route">도보 · 9분</span>
              <div className="lv-plan-row">
                <span className="lv-plan-time">12:30</span>
                <span className="lv-plan-check" />
                <span className="lv-plan-name">근처 맛집 점심</span>
              </div>
            </div>
            <Digo className="lv-digo" />
          </div>
        </div>

        <div className="lv-body">
          <h1 className="lv-headline">
            나에게 맞는 여행을
            <br />
            <em>더 쉽게</em> 시작하세요
          </h1>
          <p className="lv-sub">장소부터 이동 경로까지 한 번에 추천해드려요.</p>
          <ul className="lv-features" aria-label="AUDIGO 주요 기능">
            <li><i className="indigo" aria-hidden="true" />AI 일정 생성</li>
            <li><i className="mint" aria-hidden="true" />메이트 매칭</li>
            <li><i className="coral" aria-hidden="true" />채팅</li>
          </ul>
        </div>

        <div className="lv-actions">
          <button type="button" className="lv-kakao" onClick={onKakao}>
            <KakaoSymbol size={20} />
            카카오로 계속하기
          </button>
          <button type="button" className="lv-terms" onClick={() => navigate('/policies')}>
            계속하면 <span className="lv-terms-link">이용약관</span> 및 <span className="lv-terms-link">개인정보처리방침</span>에 동의합니다.
          </button>
        </div>
      </div>
    </section>
  );
}
