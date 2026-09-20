const STEP_LABELS = ['기본 정보', '여행 취향', '필수 장소'];

export function Progress({ step, labeled = false }: { step: number; labeled?: boolean }) {
  if (labeled) {
    return (
      <div className="progress progress-labeled">
        <span className="progress-label">{step} / 3 · {STEP_LABELS[step - 1]}</span>
        <div className="progress-bar" aria-label={`${step}단계 진행 중`}>
          <span style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="progress">
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= step ? 'on' : ''} />
      ))}
    </div>
  );
}
