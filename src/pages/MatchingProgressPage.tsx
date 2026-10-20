import { matchingApi } from '@/api';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { useToast } from '@/context/ToastContext';
import { matchingResultDestination, restoreMatchingSession } from '@/lib/matchingSession';
import { setJson, storage } from '@/storage';
import type { MatchingRequestResponse } from '@/types';
import { useEffect, useRef, useState } from 'react';
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
  const cancelingRef = useRef(false);
  const [statusError, setStatusError] = useState(false);
  const [checkKey, setCheckKey] = useState(0);

  useEffect(() => {
    if (canceling) return;
    let alive = true;
    let timer: number;
    setStatusError(false);
    const isCurrent = () => alive && !cancelingRef.current;

    const showSession = async (request: MatchingRequestResponse, allowInitial = true): Promise<void> => {
      if (!isCurrent()) return;
      if (request.latest_attempt_status === 'PROCESSING') {
        timer = window.setTimeout(() => void checkSession(), 1000);
        return;
      }
      if (request.latest_attempt_status === null && !request.has_result) {
        if (!allowInitial) {
          storage.clearMatchingCandidates();
          navigate('/matching/result?status=error', { replace: true, state: { candidatesResponse: null } });
          return;
        }
        try {
          const response = await matchingApi.getCandidates();
          if (!isCurrent()) return;
          const destination = matchingResultDestination(response);
          setJson(storage.keys.matchingCandidatesResult, response);
          navigate(destination.to, { replace: true, state: destination.state });
        } catch {
          if (!isCurrent()) return;
          // The response can fail while the server is still processing the request.
          await showSession(await matchingApi.getCurrentRequest(), false);
        }
        return;
      }
      const destination = await restoreMatchingSession(request);
      if (!isCurrent()) return;
      if (destination.state?.candidatesResponse) {
        setJson(storage.keys.matchingCandidatesResult, destination.state.candidatesResponse);
      } else {
        storage.clearMatchingCandidates();
      }
      navigate(destination.to, { replace: true, state: destination.state });
    };

    const checkSession = async (): Promise<void> => {
      try {
        await showSession(await matchingApi.getCurrentRequest());
      } catch {
        if (isCurrent()) setStatusError(true);
      }
    };
    timer = window.setTimeout(() => void checkSession(), 600);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [navigate, canceling, checkKey]);

  const cancelMatching = async () => {
    if (cancelingRef.current) return;
    cancelingRef.current = true;
    setCanceling(true);
    try {
      await matchingApi.cancelRequest();
      storage.clearMatchingState();
      toast.show('매칭이 취소되었습니다.');
      navigate('/matching', { replace: true, state: { startNew: true } });
    } catch {
      toast.show('매칭을 취소하지 못했습니다.');
    } finally {
      cancelingRef.current = false;
      setCanceling(false);
    }
  };

  return (
    <section className="screen matching-progress-screen">
      <Header title="매칭 중" onBack={() => navigate('/home')} showBell />
      <div className="scroll matching-progress-scroll">
        <div className="matching-progress-hero" aria-hidden="true">
          <span />
        </div>
        <h2 className="matching-progress-title" role={statusError ? 'alert' : undefined}>
          {statusError ? '매칭 상태를 확인하지 못했어요' : '함께 여행할 메이트를 찾고 있어요'}
        </h2>
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
      <div className={`footer-bar matching-footer${statusError ? ' matching-rematch-footer' : ''}`}>
        {statusError ? <Button label="다시 확인" onClick={() => setCheckKey((value) => value + 1)} /> : null}
        <Button label="매칭 취소" variant="ghost" loading={canceling} onClick={cancelMatching} />
      </div>
    </section>
  );
}
