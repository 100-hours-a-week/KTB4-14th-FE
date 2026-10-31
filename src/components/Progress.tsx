import { CheckIcon } from '@/components/Icons';

const STEP_LABELS = ['기본 정보', '여행 취향', '필수 장소'];

/**
 * 여행 생성 3단계 트래커.
 * 각 칸에 단계 이름을 붙이고, 끝난 단계는 체크 · 현재 단계는 강조한다.
 * e2e 호환: `.progress span.on` 개수 = 지금까지 진행한 단계 수, `.progress-label` 문구 유지.
 * (`labeled` 는 기존 호출부 호환용으로만 남겨둔다. 이제 모든 단계에서 라벨을 보여준다.)
 */
export function Progress({ step }: { step: number; labeled?: boolean }) {
  return (
    <div className="progress jw-progress">
      <span className="progress-label">{step} / 3 · {STEP_LABELS[step - 1]}</span>
      <ol className="jw-steps" aria-label={`${step}단계 진행 중`}>
        {STEP_LABELS.map((label, index) => {
          const number = index + 1;
          const state = number < step ? 'done' : number === step ? 'current' : 'todo';
          return (
            <li key={label} className={`jw-step ${state}`} aria-current={number === step ? 'step' : undefined}>
              <span className={`jw-step-bar${number <= step ? ' on' : ''}`} aria-hidden="true" />
              <span className="jw-step-name">
                <b aria-hidden="true">{number < step ? <CheckIcon size={10} /> : number}</b>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
