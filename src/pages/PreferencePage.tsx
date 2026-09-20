import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Progress } from '@/components/Progress';
import { useTravelDraft } from '@/context/TravelDraftContext';
import {
  travelFoodOptions,
  travelPaceOptions,
  travelThemeOptions,
  travelTransportOptions,
} from '@/lib/options';
import type {
  FoodPreference,
  TravelPaceType,
  TravelTheme,
  TravelTransportType,
} from '@/types';
import { type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

const MIN_BUDGET = 0;
const MAX_BUDGET = 3_000_000;
const BUDGET_STEP = 100_000;
const MAX_THEME_COUNT = 3;
const MAX_REQUEST_LENGTH = 300;

export function PreferencePage() {
  const navigate = useNavigate();
  const { draft, updatePreference } = useTravelDraft();
  const pref = draft.preference;

  const toggleTheme = (value: TravelTheme) => {
    const selected = pref.themes.includes(value);
    if (!selected && pref.themes.length >= MAX_THEME_COUNT) return;
    updatePreference({
      themes: selected ? pref.themes.filter((item) => item !== value) : [...pref.themes, value],
    });
  };

  const toggleFood = (value: FoodPreference) => {
    const selected = pref.foods.includes(value);
    updatePreference({
      foods: selected ? pref.foods.filter((item) => item !== value) : [...pref.foods, value],
    });
  };

  const canContinue = Boolean(
    pref.pace_type
      && pref.transport_type
      && pref.themes.length > 0
      && pref.budget_min >= MIN_BUDGET
      && pref.budget_max <= MAX_BUDGET
      && pref.budget_min < pref.budget_max,
  );

  return (
    <section className="screen preference-screen">
      <Header
        title="여행 생성하기"
        className="create-travel-header"
        onBack={() => navigate('/create-travel')}
        showBell
      />

      <div className="scroll preference-scroll">
        <Progress step={2} labeled />

        <PreferenceSection label="여행 속도 · 하나만 선택">
          <ChoiceGrid columns={3}>
            {travelPaceOptions.map((option) => (
              <ChoiceButton
                key={option.value}
                label={option.label}
                selected={pref.pace_type === option.value}
                onClick={() => updatePreference({ pace_type: option.value as TravelPaceType })}
              />
            ))}
          </ChoiceGrid>
        </PreferenceSection>

        <PreferenceSection label="이동 수단 · 하나만 선택">
          <ChoiceGrid columns={3}>
            {travelTransportOptions.map((option) => (
              <ChoiceButton
                key={option.value}
                label={option.label}
                selected={pref.transport_type === option.value}
                onClick={() => updatePreference({ transport_type: option.value as TravelTransportType })}
              />
            ))}
          </ChoiceGrid>
        </PreferenceSection>

        <PreferenceSection label="여행 테마 · 여러 개 선택" hint={`${pref.themes.length} / ${MAX_THEME_COUNT}`}>
          <ChoiceGrid columns={3}>
            {travelThemeOptions.map((option) => {
              const selected = pref.themes.includes(option.value as TravelTheme);
              const unavailable = !selected && pref.themes.length >= MAX_THEME_COUNT;
              return (
                <ChoiceButton
                  key={option.value}
                  label={option.label}
                  selected={selected}
                  disabled={unavailable}
                  onClick={() => toggleTheme(option.value as TravelTheme)}
                />
              );
            })}
          </ChoiceGrid>
          <p className="preference-help">최대 3개까지 선택할 수 있어요.</p>
        </PreferenceSection>

        <PreferenceSection label="비용">
          <div className="range-value-row" aria-live="polite">
            <strong>{formatBudget(pref.budget_min)}</strong>
            <span>~</span>
            <strong>{formatBudget(pref.budget_max)}</strong>
          </div>
          <BudgetRange
            minValue={pref.budget_min}
            maxValue={pref.budget_max}
            onMinChange={(value) => updatePreference({ budget_min: value })}
            onMaxChange={(value) => updatePreference({ budget_max: value })}
          />
          <div className="range-labels" aria-hidden="true">
            <span>0원</span>
            <span>300만원 이상</span>
          </div>
        </PreferenceSection>

        <PreferenceSection label="이동 거리">
          <div className="distance-copy" aria-live="polite">{distanceLabel(pref.distance_preference)}</div>
          <input
            className="single-range"
            type="range"
            min="0"
            max="100"
            step="25"
            value={pref.distance_preference}
            aria-label="이동 거리 선호도"
            onChange={(event) => updatePreference({ distance_preference: Number(event.target.value) })}
          />
          <div className="range-labels" aria-hidden="true">
            <span>가까운 선호</span>
            <span>거리 무관</span>
          </div>
        </PreferenceSection>

        <PreferenceSection label="선호 음식 · 여러 개 선택">
          <ChoiceGrid columns={4}>
            {travelFoodOptions.map((option) => (
              <ChoiceButton
                key={option.value}
                label={option.label}
                selected={pref.foods.includes(option.value as FoodPreference)}
                onClick={() => toggleFood(option.value as FoodPreference)}
              />
            ))}
          </ChoiceGrid>
        </PreferenceSection>

        <PreferenceSection label="추가 요청사항" hint={`${pref.extra_request.length}/${MAX_REQUEST_LENGTH}`}>
          <textarea
            className="textarea preference-textarea"
            value={pref.extra_request}
            maxLength={MAX_REQUEST_LENGTH}
            onChange={(event) => updatePreference({ extra_request: event.target.value })}
            placeholder="원하는 일정 조건을 자유롭게 입력해 주세요."
          />
        </PreferenceSection>
      </div>

      <div className="footer-bar preference-footer">
        <Button
          label="다음: 필수 장소"
          variant="dark"
          disabled={!canContinue}
          onClick={() => navigate('/create-travel/places')}
        />
      </div>
    </section>
  );
}

function PreferenceSection({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="preference-section">
      <legend>
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </legend>
      {children}
    </fieldset>
  );
}

function ChoiceGrid({ columns, children }: { columns: number; children: ReactNode }) {
  return (
    <div className="preference-choice-grid" style={{ '--choice-columns': columns } as CSSProperties}>
      {children}
    </div>
  );
}

function ChoiceButton({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`preference-choice${selected ? ' selected' : ''}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}>
      <span className="choice-radio" aria-hidden="true" />
      {label}
    </button>
  );
}

function BudgetRange({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  minValue: number;
  maxValue: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}) {
  const minPercent = (minValue / MAX_BUDGET) * 100;
  const maxPercent = (maxValue / MAX_BUDGET) * 100;
  const style = {
    '--range-start': `${minPercent}%`,
    '--range-end': `${maxPercent}%`,
  } as CSSProperties;

  return (
    <div className="budget-range" style={style}>
      <div className="budget-range-track" aria-hidden="true" />
      <input
        type="range"
        min={MIN_BUDGET}
        max={MAX_BUDGET}
        step={BUDGET_STEP}
        value={minValue}
        aria-label="최소 예산"
        onChange={(event) => onMinChange(Math.min(Number(event.target.value), maxValue - BUDGET_STEP))}
      />
      <input
        type="range"
        min={MIN_BUDGET}
        max={MAX_BUDGET}
        step={BUDGET_STEP}
        value={maxValue}
        aria-label="최대 예산"
        onChange={(event) => onMaxChange(Math.max(Number(event.target.value), minValue + BUDGET_STEP))}
      />
    </div>
  );
}

function formatBudget(value: number) {
  if (value >= MAX_BUDGET) return '300만원 이상';
  if (value === 0) return '0원';
  return `${value / 10_000}만원`;
}

function distanceLabel(value: number) {
  if (value <= 0) return '가까운 장소 위주';
  if (value <= 25) return '가까운 장소를 우선 추천';
  if (value <= 50) return '이동 거리 중간 수준';
  if (value <= 75) return '이동 거리를 일부 허용';
  return '이동 거리와 관계없이 추천';
}
