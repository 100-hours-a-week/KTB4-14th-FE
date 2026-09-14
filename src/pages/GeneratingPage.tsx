import { travelsApi } from '@/api';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import type { TravelGenerationStatus } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function GeneratingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const planId = Number(id);
  const [status, setStatus] = useState<TravelGenerationStatus | null>(null);
  const [failOpen, setFailOpen] = useState(false);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const tick = async () => {
      const next = await travelsApi.getStatus(planId);
      if (cancelled) return;
      setStatus(next);
      if (next.status === 'COMPLETED') {
        window.clearInterval(timer);
        navigate(`/itinerary/${planId}`, { replace: true });
      }
      if (next.status === 'FAILED') {
        window.clearInterval(timer);
        setFailOpen(true);
      }
    };
    void tick();
    timer = window.setInterval(tick, 800);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [navigate, planId, runKey]);

  const failed = status?.status === 'FAILED';

  return (
    <section className="screen">
      <Header title="여행 추천 중" onBack={() => navigate('/home', { replace: true })} showBell />
      <div className="scroll" style={{ textAlign: 'center' }}>
        <h2 className="page-title">{failed ? '최적의 여행을 만드는 데 실패하였습니다.' : '최적의 여행을 만드는 중입니다'}</h2>
        <div className={`orb-status${failed ? ' fail' : ''}`}>{failed ? '✕' : '…'}</div>
        {(status?.steps ?? []).map((step) => (
          <div key={step.key} className="step">
            <span className={`check${step.state === 'DONE' ? ' done' : ''}${step.state === 'FAILED' ? ' fail' : ''}`}>
              {step.state === 'DONE' ? '✓' : step.state === 'FAILED' ? '✕' : ''}
            </span>
            <strong>{step.label}</strong>
          </div>
        ))}
        <p className="notice">
          {failed
            ? '잠시 후 다시 시도해 주세요. 입력값을 바꾸면 더 안정적으로 생성될 수 있어요.'
            : '완성되면 알림을 보내드릴게요. 다른 화면으로 이동해도 생성이 이어집니다.'}
        </p>
        {failed ? (
          <button
            type="button"
            className="logout"
            style={{ color: 'var(--primary)' }}
            onClick={async () => {
              setFailOpen(false);
              await travelsApi.regenerate(planId);
              setRunKey((value) => value + 1);
            }}>
            다시 생성하기
          </button>
        ) : null}
      </div>
      <Modal open={failOpen} title="일정 생성에 실패했습니다." confirmLabel="확인" cancelLabel="닫기" onClose={() => setFailOpen(false)} onConfirm={() => setFailOpen(false)} />
    </section>
  );
}
