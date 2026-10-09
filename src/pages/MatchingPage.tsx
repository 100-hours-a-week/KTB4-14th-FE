import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { useToast } from '@/context/ToastContext';
import { travelPaceOptions, travelThemeOptions } from '@/lib/options';
import { getJson, setJson, storage } from '@/storage';
import type { MatchingCompanionGender, MatchingConditionDraft, TravelPaceType, TravelTheme } from '@/types';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

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

export function MatchingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [condition, setCondition] = useState<MatchingConditionDraft>(DEFAULT_CONDITION);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCondition(normalizeCondition(getJson<MatchingConditionDraft>(storage.keys.matchingConditionDraft)));
    setHydrated(true);
  }, []);

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

  const handleSubmit = () => {
    if (!isValid) {
      toast.show('매칭 조건을 모두 선택해주세요.');
      return;
    }
    setJson(storage.keys.matchingConditionDraft, condition);
    toast.show('매칭 조건이 저장되었습니다.');
  };

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
        <Button label="매칭 결과 보기" variant="dark" disabled={!isValid} onClick={handleSubmit} />
      </div>
    </section>
  );
}
