import { travelsApi } from '@/api';
import { Digo } from '@/components/Digo';
import { BellIcon, CheckIcon, XIcon } from '@/components/Icons';
import { PlannerHeader } from '@/components/PlannerHeader';
import { Modal } from '@/components/Modal';
import { getTravelGenerationRequest } from '@/storage';
import type { GenerationStep, TravelGenerationStatus } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

export function GeneratingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = Number(id);
  const jobIdParam = searchParams.get('job_id');
  const generationJobId = jobIdParam ? Number(jobIdParam) : NaN;
  const [status, setStatus] = useState<TravelGenerationStatus | null>(null);
  const [failOpen, setFailOpen] = useState(false);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let requestInFlight = false;
    const tick = async () => {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const next = Number.isFinite(generationJobId) && generationJobId > 0
          ? await travelsApi.getGenerationStatus(generationJobId)
          : await travelsApi.getStatus(planId);
        if (cancelled) return;
        setStatus(next);
        if (next.status === 'COMPLETED') {
          window.clearInterval(timer);
          navigate(`/output/${planId}/places`, { replace: true });
        }
        if (next.status === 'FAILED') {
          window.clearInterval(timer);
          setFailOpen(true);
        }
      } catch {
        if (cancelled) return;
        window.clearInterval(timer);
        setStatus((current) => current ?? {
          travel_plan_id: planId,
          generation_job_id: Number.isFinite(generationJobId) ? generationJobId : planId,
          status: 'FAILED',
          steps: [],
          error_message: '여행 생성 상태를 확인하지 못했습니다.',
        });
        setFailOpen(true);
      } finally {
        requestInFlight = false;
      }
    };
    void tick();
    timer = window.setInterval(tick, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [generationJobId, navigate, planId, runKey]);

  const failed = status?.status === 'FAILED';

  const steps = status?.steps ?? [];
  const doneCount = steps.filter((step) => step.state === 'DONE').length;
  const progress = steps.length > 0 ? doneCount / steps.length : 0;
  // 진행 중 표시는 RUNNING 이 우선, 없으면 아직 안 끝난 첫 단계를 진행 중으로 본다.
  const activeKey = failed
    ? null
    : (steps.find((step) => step.state === 'RUNNING') ?? steps.find((step) => step.state === 'PENDING'))?.key;

  return (
    <section className="screen generating-screen jw-screen">
      <PlannerHeader title="여행 추천 중" onBack={() => navigate('/home', { replace: true })} />
      <div className="scroll jw-gen">
        <h2 className="page-title">{failed ? '최적의 여행을 만드는 데 실패하였습니다.' : '최적의 여행을 만드는 중입니다'}</h2>
        <div className={`orb-status jw-orb${failed ? ' fail' : ''}`}>
          <svg className="jw-orb-ring" viewBox="0 0 176 176" aria-hidden="true">
            <circle className="track" cx="88" cy="88" r="80" />
            <circle
              className="bar"
              cx="88"
              cy="88"
              r="80"
              pathLength={100}
              strokeDasharray={`${Math.max(progress * 100, failed ? 0 : 6)} 100`}
            />
          </svg>
          <Digo className="jw-orb-digo" />
          {failed ? (
            <span className="jw-orb-badge fail" aria-hidden="true"><XIcon size={14} /></span>
          ) : steps.length > 0 ? (
            <span className="jw-orb-badge">{doneCount} / {steps.length}</span>
          ) : null}
        </div>
        <div className="jw-gen-steps">
          {steps.map((step) => (
            <div key={step.key} className={`step ${stepTone(step, activeKey)}`}>
              <span className={`check${step.state === 'DONE' ? ' done' : ''}${step.state === 'FAILED' ? ' fail' : ''}`}>
                {step.state === 'DONE' ? <CheckIcon size={13} /> : step.state === 'FAILED' ? <XIcon size={12} /> : null}
              </span>
              <span className="jw-step-text">
                <strong>{step.label}</strong>
                {STEP_HINTS[step.key] ? <small>{STEP_HINTS[step.key]}</small> : null}
              </span>
              <span className="jw-step-state">{STEP_STATE_LABEL[stepTone(step, activeKey)]}</span>
            </div>
          ))}
        </div>
        <p className="notice">
          <span className="jw-notice-icon" aria-hidden="true"><BellIcon size={17} /></span>
          <span>
            {failed
              ? '잠시 후 다시 시도해 주세요. 입력값을 바꾸면 더 안정적으로 생성될 수 있어요.'
              : '완성되면 알림을 보내드릴게요. 다른 화면으로 이동해도 생성이 이어집니다.'}
          </span>
        </p>
        {failed ? (
          <button
            type="button"
            className="logout"
            style={{ color: 'var(--primary)' }}
            onClick={async () => {
              setFailOpen(false);
              try {
                const created = await travelsApi.regenerate(
                  planId,
                  getTravelGenerationRequest(planId),
                );
                const jobQuery = created.generation_job_id ? `?job_id=${created.generation_job_id}` : '';
                setStatus(null);
                navigate(`/generating/${created.travel_plan_id}${jobQuery}`, { replace: true });
                setRunKey((value) => value + 1);
              } catch {
                setFailOpen(true);
              }
            }}>
            다시 생성하기
          </button>
        ) : null}
      </div>
      <Modal open={failOpen} title="일정 생성에 실패했습니다." confirmLabel="확인" cancelLabel="닫기" onClose={() => setFailOpen(false)} onConfirm={() => setFailOpen(false)} />
    </section>
  );
}

type StepTone = 'done' | 'active' | 'failed' | 'waiting';

const STEP_STATE_LABEL: Record<StepTone, string> = {
  done: '완료',
  active: '진행 중',
  failed: '실패',
  waiting: '대기',
};

/** 단계별 보조 설명 (화면 표시용 고정 문구) */
const STEP_HINTS: Partial<Record<GenerationStep['key'], string>> = {
  PLACE_RECOMMEND: '취향에 맞는 장소와 식당을 고르고 있어요',
  STAY_RECOMMEND: '동선 가운데에서 숙소 위치를 찾고 있어요',
  ROUTE_OPTIMIZE: '장소 사이 이동 수단과 시간을 계산해요',
};

function stepTone(step: GenerationStep, activeKey: GenerationStep['key'] | null | undefined): StepTone {
  if (step.state === 'DONE') return 'done';
  if (step.state === 'FAILED') return 'failed';
  return step.key === activeKey ? 'active' : 'waiting';
}
