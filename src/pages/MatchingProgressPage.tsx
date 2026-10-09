import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { useToast } from '@/context/ToastContext';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ProgressState = 'DONE' | 'RUNNING' | 'PENDING';

const progressSteps: { label: string; state: ProgressState }[] = [
  { label: '여행 지역 확인', state: 'DONE' },
  { label: '일정 · 여행 속도 비교', state: 'DONE' },
  { label: '관심사와 이동수단 분석', state: 'RUNNING' },
  { label: '최종 후보 연결', state: 'PENDING' },
];

function getStepStatusLabel(state: ProgressState) {
  if (state === 'DONE') return '완료';
  if (state === 'RUNNING') return '진행 중';
  return '대기';
}

export function MatchingProgressPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [canceling, setCanceling] = useState(false);

  const cancelMatching = () => {
    setCanceling(true);
    window.setTimeout(() => {
      toast.show('매칭이 취소되었습니다.');
      navigate('/matching');
    }, 250);
  };

  return (
    <section className="screen matching-progress-screen">
      <Header title="매칭 중" onBack={() => navigate('/matching')} showBell />
      <div className="scroll matching-progress-scroll">
        <div className="matching-progress-hero" aria-hidden="true">
          <span />
        </div>
        <h2 className="matching-progress-title">함께 여행할 메이트를 찾고 있어요</h2>
        <p className="matching-progress-subtitle">취향이 잘 맞는 사용자를 비교 중입니다.</p>

        <section className="matching-progress-card" aria-label="매칭 진행 상황">
          <h3>매칭 진행 상황</h3>
          <ol className="matching-progress-steps">
            {progressSteps.map((step) => (
              <li key={step.label} className={`matching-progress-step ${step.state.toLowerCase()}`}>
                <span className="matching-step-marker">
                  {step.state === 'DONE' ? '✓' : step.state === 'RUNNING' ? '•' : ''}
                </span>
                <strong>{step.label}</strong>
                <em>{getStepStatusLabel(step.state)}</em>
              </li>
            ))}
          </ol>
        </section>

        <div className="matching-progress-notice">
          <strong>완료되면 알림으로 알려드릴게요</strong>
          <p>다른 화면을 둘러봐도 매칭은 계속됩니다.</p>
        </div>
      </div>
      <div className="footer-bar matching-footer">
        <Button label="매칭 취소" variant="ghost" loading={canceling} onClick={cancelMatching} />
      </div>
    </section>
  );
}
