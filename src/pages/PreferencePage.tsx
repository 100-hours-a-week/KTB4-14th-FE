import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Header } from '@/components/Header';
import { Progress } from '@/components/Progress';
import { useTravelDraft } from '@/context/TravelDraftContext';
import { foodOptions, paceOptions, regionOptions, styleOptions } from '@/lib/options';
import type { FoodPreference, RegionPreference, TripPace, TripStyle } from '@/types';
import { useNavigate } from 'react-router-dom';

export function PreferencePage() {
  const navigate = useNavigate();
  const { draft, updatePreference } = useTravelDraft();
  const pref = draft.preference;

  const toggleFood = (value: FoodPreference) => {
    const current = pref.food_preferences;
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    updatePreference({ food_preferences: next });
  };

  return (
    <section className="screen">
      <Header title="여행 생성하기" onBack={() => navigate(-1)} showBell />
      <div className="scroll">
        <Progress step={2} />
        <span className="field-label">여행 스타일 / 여행 성격</span>
        <div className="chips">
          {styleOptions.map((item) => (
            <Chip key={item.value} label={item.label} selected={pref.style === item.value} onClick={() => updatePreference({ style: item.value as TripStyle })} />
          ))}
        </div>
        <span className="field-label">선호 지역 방문 성향</span>
        <div className="chips">
          {regionOptions.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={pref.region_preference === item.value}
              onClick={() => updatePreference({ region_preference: item.value as RegionPreference })}
            />
          ))}
        </div>
        <span className="field-label">식사 취향</span>
        <div className="chips">
          {foodOptions.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={pref.food_preferences.includes(item.value as FoodPreference)}
              onClick={() => toggleFood(item.value as FoodPreference)}
            />
          ))}
        </div>
        <span className="field-label">활동 강도</span>
        <div className="row" style={{ alignItems: 'center', marginBottom: 12 }}>
          <small className="place-addr">여유</small>
          <div className="track">
            {[0, 25, 50, 75, 100].map((n) => (
              <button key={n} type="button" className={`seg${n <= pref.activity_level ? ' on' : ''}`} onClick={() => updatePreference({ activity_level: n })} />
            ))}
          </div>
          <small className="place-addr">활동적</small>
        </div>
        <span className="field-label">일정 밀도</span>
        <div className="chips">
          {paceOptions.map((item) => (
            <Chip key={item.value} label={item.label} selected={pref.pace === item.value} onClick={() => updatePreference({ pace: item.value as TripPace })} />
          ))}
        </div>
        <span className="field-label">추가 요청사항</span>
        <textarea
          className="textarea"
          value={pref.extra_request}
          onChange={(e) => updatePreference({ extra_request: e.target.value })}
          placeholder="원하는 일정 조건을 자유롭게 알려주세요"
        />
      </div>
      <div className="footer-bar">
        <Button
          label="다음: 필수 장소"
          variant="dark"
          onClick={() => {
            // TODO(backend-guard): 여행 스타일/지역/식사 미선택 시 다음 단계 진입을 막는다.
            navigate('/create-travel/places');
          }}
        />
      </div>
    </section>
  );
}
