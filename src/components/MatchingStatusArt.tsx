import { Digo } from '@/components/Digo';
import { CheckIcon } from '@/components/Icons';

type Tone = 'loading' | 'progress' | 'ok' | 'fail';

/**
 * 매칭 상태 화면(확인 중 · 매칭 중 · 완료 · 상대 없음/오류) 상단 그림. 장식용이라 스크린리더에서는 숨긴다.
 * - loading : 디고 + 도는 링
 * - progress: 디고 + 진행 링 + "2 / 4" 배지
 * - ok      : 디고 + 민트 체크 배지
 * - fail    : 돋보기 + 코랄 느낌표 배지
 */
export function MatchingStatusArt({
  tone,
  progress = 0,
  progressLabel,
}: {
  tone: Tone;
  progress?: number;
  progressLabel?: string;
}) {
  const showRing = tone === 'loading' || tone === 'progress';
  return (
    <div className={`jm-art ${tone}`} aria-hidden="true">
      {showRing ? (
        <svg className="jm-art-ring" viewBox="0 0 176 176">
          <circle className="track" cx="88" cy="88" r="80" />
          <circle
            className="bar"
            cx="88"
            cy="88"
            r="80"
            pathLength={100}
            strokeDasharray={`${tone === 'loading' ? 26 : Math.max(6, Math.min(100, progress * 100))} 100`}
          />
        </svg>
      ) : null}
      {tone === 'fail' ? (
        <svg className="jm-art-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4 4M8.8 8.8l4.4 4.4M13.2 8.8l-4.4 4.4" />
        </svg>
      ) : (
        <Digo className="jm-art-digo" />
      )}
      {tone === 'ok' ? <span className="jm-art-badge ok"><CheckIcon size={15} /></span> : null}
      {tone === 'fail' ? <span className="jm-art-badge fail">!</span> : null}
      {tone === 'progress' && progressLabel ? <span className="jm-art-badge count">{progressLabel}</span> : null}
    </div>
  );
}
