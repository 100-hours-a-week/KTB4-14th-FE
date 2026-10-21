import { matchingApi } from '@/api';
import { ApiError } from '@/api/client';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { useToast } from '@/context/ToastContext';
import { travelPaceOptions, travelThemeOptions } from '@/lib/options';
import { restoreMatchingSession } from '@/lib/matchingSession';
import { getJson, setJson, storage } from '@/storage';
import type {
  MatchingCompanionGender,
  MatchingConditionDraft,
  MatchingRequestResponse,
  TravelPaceType,
  TravelTheme,
} from '@/types';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const BUDGET_MIN = 300000;
const BUDGET_MAX = 800000;
const BUDGET_STEP = 10000;
const MAX_THEME_COUNT = 3;

const DEFAULT_CONDITION: MatchingConditionDraft = {
  preferred_companion_gender: null,
  themes: [],
  pace: null,
  budget_min: BUDGET_MIN,
  budget_max: BUDGET_MAX,
};

const genderOptions: { value: MatchingCompanionGender; label: string }[] = [
  { value: 'ANY', label: '상관없음' },
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
];

function normalizeCondition(saved: MatchingConditionDraft | null): MatchingConditionDraft {
  if (!saved) return DEFAULT_CONDITION;
  const rawMin = Math.max(BUDGET_MIN, Math.min(saved.budget_min ?? BUDGET_MIN, BUDGET_MAX - BUDGET_STEP));
  const rawMax = Math.min(BUDGET_MAX, Math.max(saved.budget_max ?? BUDGET_MAX, BUDGET_MIN + BUDGET_STEP));
  const budgetMin = Math.min(rawMin, rawMax - BUDGET_STEP);
  const budgetMax = Math.max(rawMax, budgetMin + BUDGET_STEP);
  return {
    preferred_companion_gender: saved.preferred_companion_gender ?? null,
    themes: Array.isArray(saved.themes) ? saved.themes.slice(0, MAX_THEME_COUNT) : [],
    pace: saved.pace ?? null,
    budget_min: budgetMin,
    budget_max: budgetMax,
  };
}

function formatBudget(value: number) {
  return `${Math.round(value / 10000)}만원`;
}

function conditionFromRequest(request: MatchingRequestResponse): MatchingConditionDraft {
  return {
    preferred_companion_gender: request.preferred_companion_gender,
    themes: request.theme,
    pace: request.pace,
    budget_min: request.budget_min,
    budget_max: request.budget_max,
  };
}

export function MatchingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [condition, setCondition] = useState<MatchingConditionDraft>(DEFAULT_CONDITION);
  const [hydrated, setHydrated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [sessionCheckKey, setSessionCheckKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const startNew = Boolean((location.state as { startNew?: boolean } | null)?.startNew);

  useEffect(() => {
    let alive = true;
    setCheckingSession(true);
    setSessionError(false);

    const showConditions = (reset: boolean) => {
      if (reset) storage.clearMatchingState();
      else storage.clearMatchingCandidates();
      setCondition(reset
        ? DEFAULT_CONDITION
        : normalizeCondition(getJson<MatchingConditionDraft>(storage.keys.matchingConditionDraft)));
      setHydrated(true);
      setCheckingSession(false);
    };

    if (startNew) {
      showConditions(true);
      return () => {
        alive = false;
      };
    }

    const restore = async () => {
      let request: MatchingRequestResponse;
      try {
        request = await matchingApi.getCurrentRequest();
      } catch (error) {
        if (alive && error instanceof ApiError && error.status === 404) {
          showConditions(false);
          return;
        }
        throw error;
      }
      if (!alive) return;
      if (request.latest_attempt_status === 'FAILED' && !request.has_result) {
        await matchingApi.cancelRequest();
        if (alive) showConditions(true);
        return;
      }
      const destination = await restoreMatchingSession(request);
      if (!alive) return;
      setJson(storage.keys.matchingConditionDraft, conditionFromRequest(request));
      if (destination.state?.candidatesResponse) {
        setJson(storage.keys.matchingCandidatesResult, destination.state.candidatesResponse);
      }
      navigate(destination.to, { replace: true, state: destination.state });
    };

    void restore().catch(() => {
      if (!alive) return;
      setSessionError(true);
      setCheckingSession(false);
    });

    return () => {
      alive = false;
    };
  }, [navigate, startNew, sessionCheckKey]);

  useEffect(() => {
    if (hydrated) setJson(storage.keys.matchingConditionDraft, condition);
  }, [condition, hydrated]);

  const isValid = useMemo(
    () => Boolean(condition.preferred_companion_gender && condition.themes.length > 0 && condition.pace),
    [condition],
  );

  const updateBudgetMin = (value: number) => {
    setCondition((prev) => ({
      ...prev,
      budget_min: Math.min(value, prev.budget_max - BUDGET_STEP),
    }));
  };

  const updateBudgetMax = (value: number) => {
    setCondition((prev) => ({
      ...prev,
      budget_max: Math.max(value, prev.budget_min + BUDGET_STEP),
    }));
  };

  const toggleTheme = (theme: TravelTheme) => {
    setCondition((prev) => {
      const selected = prev.themes.includes(theme);
      if (!selected && prev.themes.length >= MAX_THEME_COUNT) {
        toast.show('관심 여행은 최대 3개까지 선택할 수 있어요.');
        return prev;
      }
      return {
        ...prev,
        themes: selected ? prev.themes.filter((item) => item !== theme) : [...prev.themes, theme],
      };
    });
  };

  const resetAndGoHome = () => {
    const next = { ...DEFAULT_CONDITION };
    setCondition(next);
    setJson(storage.keys.matchingConditionDraft, next);
    navigate('/home');
  };

  const handleSubmit = async () => {
    if (!isValid) {
      toast.show('매칭 조건을 모두 선택해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      setJson(storage.keys.matchingConditionDraft, condition);
      await matchingApi.createRequest(condition);
      storage.clearMatchingCandidates();
      navigate('/matching/progress');
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        toast.show('마이페이지에서 매칭 설정을 켜주세요.');
      } else if (
        error instanceof ApiError
        && error.status === 409
        && error.message === 'matching_request_already_active'
      ) {
        try {
          const request = await matchingApi.getCurrentRequest();
          const destination = await restoreMatchingSession(request);
          if (destination.state?.candidatesResponse) {
            setJson(storage.keys.matchingCandidatesResult, destination.state.candidatesResponse);
          }
          navigate(destination.to, { replace: true, state: destination.state });
        } catch {
          toast.show('기존 매칭 정보를 불러오지 못했습니다.');
        }
      } else {
        toast.show('매칭 요청을 생성하지 못했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession || sessionError) {
    return (
      <section className="screen matching-progress-screen" aria-busy={checkingSession}>
        <Header title="여행 매칭" onBack={() => navigate('/home')} showBell />
        <div className="scroll matching-progress-scroll">
          <div className="matching-progress-hero" aria-hidden="true">
            <span />
          </div>
          <h2 className="matching-progress-title" role={sessionError ? 'alert' : undefined}>
            {sessionError ? '매칭 정보를 확인하지 못했어요' : '매칭 정보를 확인하고 있어요'}
          </h2>
        </div>
        {sessionError ? (
          <div className="footer-bar matching-footer">
            <Button label="다시 확인" onClick={() => setSessionCheckKey((value) => value + 1)} />
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="screen matching-screen">
      <Header title="여행 매칭" onBack={resetAndGoHome} showBell />
      <div className="scroll matching-scroll">
        <h2 className="matching-title">나에게 맞는 여행을 찾아보세요</h2>
        <p className="matching-subtitle">취향을 선택하고 잘 맞는 여행을 추천해요.</p>

        <fieldset className="matching-condition-section">
          <legend>
            누구와 떠나길 원하시나요?
            {!condition.preferred_companion_gender ? <small>동행 성별을 선택해주세요.</small> : null}
          </legend>
          <div className="matching-choice-grid">
            {genderOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`matching-choice${condition.preferred_companion_gender === option.value ? ' selected' : ''}`}
                onClick={() => setCondition((prev) => ({ ...prev, preferred_companion_gender: option.value }))}>
                <span className="matching-radio" />
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="matching-condition-section">
          <legend>
            관심 있는 여행 · 최대 3개 선택
            {condition.themes.length === 0 ? <small>관심 여행을 선택해주세요.</small> : null}
          </legend>
          <div className="matching-choice-grid">
            {travelThemeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`matching-choice${condition.themes.includes(option.value) ? ' selected' : ''}`}
                onClick={() => toggleTheme(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="matching-condition-section">
          <legend>
            여행 속도
            {!condition.pace ? <small>여행 속도를 선택해주세요.</small> : null}
          </legend>
          <div className="matching-choice-grid">
            {travelPaceOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`matching-choice${condition.pace === option.value ? ' selected' : ''}`}
                onClick={() => setCondition((prev) => ({ ...prev, pace: option.value as TravelPaceType }))}>
                <span className="matching-radio" />
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="matching-condition-section">
          <legend>비용</legend>
          <div className="matching-budget-summary">
            <span>{formatBudget(BUDGET_MIN)}</span>
            <strong>
              {formatBudget(condition.budget_min)} - {formatBudget(condition.budget_max)}
            </strong>
            <span>{formatBudget(BUDGET_MAX)}</span>
          </div>
          <div
            className="matching-budget-range"
            style={
              {
                '--range-start': `${((condition.budget_min - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100}%`,
                '--range-end': `${((condition.budget_max - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100}%`,
              } as CSSProperties
            }>
            <div className="matching-budget-track" />
            <input
              type="range"
              min={BUDGET_MIN}
              max={BUDGET_MAX}
              step={BUDGET_STEP}
              value={condition.budget_min}
              aria-label="최소 예산"
              onChange={(e) => updateBudgetMin(Number(e.target.value))}
            />
            <input
              type="range"
              min={BUDGET_MIN}
              max={BUDGET_MAX}
              step={BUDGET_STEP}
              value={condition.budget_max}
              aria-label="최대 예산"
              onChange={(e) => updateBudgetMax(Number(e.target.value))}
            />
          </div>
        </fieldset>
      </div>
      <div className="footer-bar matching-footer">
        <Button label="매칭 결과 보기" variant="dark" disabled={!isValid} loading={submitting} onClick={handleSubmit} />
      </div>
    </section>
  );
}
