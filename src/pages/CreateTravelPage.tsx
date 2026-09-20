import { regionsApi } from '@/api';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Progress } from '@/components/Progress';
import { toDateLabel } from '@/components/DateTime';
import { useTravelDraft } from '@/context/TravelDraftContext';
import type { CompanionType, RegionSummary } from '@/types';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

const regionOptions = [
  {
    value: '서울특별시',
    label: '서울',
    districts: ['전체', '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
  },
  {
    value: '경기도',
    label: '경기',
    districts: ['전체', '수원시', '성남시', '고양시', '용인시', '부천시', '안산시', '안양시', '남양주시', '화성시', '평택시', '의정부시', '시흥시', '파주시', '광명시', '김포시', '군포시', '광주시', '이천시', '양주시', '오산시', '하남시', '안성시', '의왕시', '포천시', '여주시', '동두천시', '과천시', '구리시', '가평군', '양평군', '연천군'],
  },
  {
    value: '인천광역시',
    label: '인천',
    districts: ['전체', '중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구', '강화군', '옹진군'],
  },
  {
    value: '부산광역시',
    label: '부산',
    districts: ['전체', '중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구', '해운대구', '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군'],
  },
  {
    value: '대구광역시',
    label: '대구',
    districts: ['전체', '중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군', '군위군'],
  },
  {
    value: '광주광역시',
    label: '광주',
    districts: ['전체', '동구', '서구', '남구', '북구', '광산구'],
  },
  {
    value: '대전광역시',
    label: '대전',
    districts: ['전체', '동구', '중구', '서구', '유성구', '대덕구'],
  },
  {
    value: '울산광역시',
    label: '울산',
    districts: ['전체', '중구', '남구', '동구', '북구', '울주군'],
  },
  { value: '세종특별자치시', label: '세종', districts: ['전체'] },
  {
    value: '강원특별자치도',
    label: '강원',
    districts: ['전체', '춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시', '홍천군', '횡성군', '영월군', '평창군', '정선군', '철원군', '화천군', '양구군', '인제군', '고성군', '양양군'],
  },
  {
    value: '충청북도',
    label: '충북',
    districts: ['전체', '청주시', '충주시', '제천시', '보은군', '옥천군', '영동군', '증평군', '진천군', '괴산군', '음성군', '단양군'],
  },
  {
    value: '충청남도',
    label: '충남',
    districts: ['전체', '천안시', '공주시', '보령시', '아산시', '서산시', '논산시', '계룡시', '당진시', '금산군', '부여군', '서천군', '청양군', '홍성군', '예산군', '태안군'],
  },
  {
    value: '전북특별자치도',
    label: '전북',
    districts: ['전체', '전주시', '군산시', '익산시', '정읍시', '남원시', '김제시', '완주군', '진안군', '무주군', '장수군', '임실군', '순창군', '고창군', '부안군'],
  },
  {
    value: '전라남도',
    label: '전남',
    districts: ['전체', '목포시', '여수시', '순천시', '나주시', '광양시', '담양군', '곡성군', '구례군', '고흥군', '보성군', '화순군', '장흥군', '강진군', '해남군', '영암군', '무안군', '함평군', '영광군', '장성군', '완도군', '진도군', '신안군'],
  },
  {
    value: '경상북도',
    label: '경북',
    districts: ['전체', '포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시', '상주시', '문경시', '경산시', '의성군', '청송군', '영양군', '영덕군', '청도군', '고령군', '성주군', '칠곡군', '예천군', '봉화군', '울진군', '울릉군'],
  },
  {
    value: '경상남도',
    label: '경남',
    districts: ['전체', '창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', '양산시', '의령군', '함안군', '창녕군', '고성군', '남해군', '하동군', '산청군', '함양군', '거창군', '합천군'],
  },
  { value: '제주특별자치도', label: '제주', districts: ['전체', '제주시', '서귀포시'] },
];

const relationshipOptions = [
  { value: 'SOLO', label: '혼자' },
  { value: 'COUPLE', label: '연인' },
  { value: 'FRIEND', label: '친구' },
  { value: 'FAMILY', label: '가족' },
] as const;

type Picker = null | 'region' | 'startDate' | 'endDate' | 'startTime' | 'endTime';

export function CreateTravelPage() {
  const navigate = useNavigate();
  const { draft, hydrated, update } = useTravelDraft();
  const [picker, setPicker] = useState<Picker>(null);
  const [apiRegions, setApiRegions] = useState<RegionSummary[]>([]);
  const headcount = draft.headcount ?? 2;
  const isSolo = draft.companion === 'SOLO';
  const minimumHeadcount = isSolo ? 1 : 2;
  const displayedHeadcount = Math.max(minimumHeadcount, isSolo ? 1 : headcount);
  const [selectedProvince, setSelectedProvince] = useState(() => findProvinceValue(draft));

  useEffect(() => {
    let cancelled = false;
    void regionsApi.list()
      .then((regions) => {
        if (!cancelled && regions.length > 0) setApiRegions(regions);
      })
      .catch(() => {
        // API 연결 전과 일시적인 조회 실패 시에는 목업 목록을 유지한다.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (draft.headcount !== displayedHeadcount) update({ headcount: displayedHeadcount });
  }, [displayedHeadcount, draft.headcount, hydrated, update]);

  const togglePicker = (next: Exclude<Picker, null>) => {
    if (next === 'region') setSelectedProvince(findProvinceValue(draft));
    setPicker((current) => (current === next ? null : next));
  };

  const pickerRegionOptions = useMemo(() => buildPickerRegions(apiRegions), [apiRegions]);
  const activeRegion = pickerRegionOptions.find((option) => option.value === selectedProvince) ?? pickerRegionOptions[0];
  const currentProvince = draft.destination_province ?? findProvinceValue(draft);
  const storedDistrict = draft.destination_district ?? draft.destination?.replace(`${activeRegion.value} `, '');
  const currentDistrict = storedDistrict === activeRegion.value ? '전체' : storedDistrict;

  const updateDate = (field: 'start_date' | 'end_date', value: string) => {
    update({ [field]: value });
    setPicker(null);
  };

  const updateTime = (field: 'start_time' | 'end_time', value: string) => {
    update({ [field]: value });
  };

  const arrival = toComparableDateTime(draft.start_date, draft.start_time);
  const departure = toComparableDateTime(draft.end_date, draft.end_time);
  const now = currentComparableDateTime();
  const scheduleError = arrival && arrival < now
    ? '여행지 도착 시간은 현재 이후로 선택해 주세요.'
    : arrival && departure && arrival >= departure
      ? '여행지 출발 시간은 도착 시간보다 늦어야 해요.'
      : '';
  const canContinue = Boolean(
    draft.region_id
      && draft.start_date
      && draft.start_time
      && draft.end_date
      && draft.end_time
      && draft.companion
      && !scheduleError,
  );

  return (
    <section className="screen create-travel-screen">
      <Header title="여행 생성하기" className="create-travel-header" onBack={() => navigate(-1)} showBell />

      <div className="scroll">
        <Progress step={1} labeled />

        <div>
          <Field label="여행지 지역" className="region-field">
            <button
              type="button"
              className={`select-box travel-select${picker === 'region' ? ' is-active' : ''}`}
              onClick={() => togglePicker('region')}
              aria-haspopup="listbox"
              aria-expanded={picker === 'region'}>
              <span className={draft.destination ? 'has-value' : ''}>{draft.destination ?? '지역을 선택해 주세요.'}</span>
              <span className={`select-chevron${picker === 'region' ? ' up' : ''}`} aria-hidden="true" />
            </button>

            {picker === 'region' ? (
              <div className="region-dropdown" role="listbox" aria-label="여행지 지역">
                <div className="region-dropdown-header" aria-hidden="true">
                  <span>시/도</span>
                  <span>시/군/구</span>
                </div>
                <div className="region-picker-grid">
                  <div className="region-province-list" role="listbox" aria-label="시/도 선택">
                    {pickerRegionOptions.map((option) => {
                      const selected = selectedProvince === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`region-option province-option${selected ? ' selected' : ''}`}
                          role="option"
                          aria-selected={selected}
                          onClick={() => setSelectedProvince(option.value)}>
                          <span>{option.label}</span>
                          {selected ? <span className="region-arrow" aria-hidden="true">›</span> : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="region-district-list" role="listbox" aria-label={`${activeRegion.label} 시/군/구 선택`}>
                    {activeRegion.districts.map((district) => {
                      const selected = currentProvince === activeRegion.value && currentDistrict === district.name;
                      return (
                        <button
                          key={`${activeRegion.value}-${district.name}`}
                          type="button"
                          className={`region-option district-option${selected ? ' selected' : ''}`}
                          role="option"
                          aria-selected={selected}
                          onClick={() => {
                            update({
                              region_id: district.regionId,
                              destination: district.name === '전체' ? activeRegion.value : district.fullName,
                              destination_province: activeRegion.value,
                              destination_district: district.name,
                            });
                            setPicker(null);
                          }}>
                          <span>{district.name}</span>
                          {selected ? <span className="region-check" aria-hidden="true">✓</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </Field>

          <div className="travel-date-section">
            <Field label="여행지 도착">
              <div className="row">
                <button
                  type="button"
                  className={`select-box travel-select date-select${picker === 'startDate' ? ' is-active' : ''}`}
                  onClick={() => togglePicker('startDate')}
                  aria-haspopup="dialog"
                  aria-expanded={picker === 'startDate'}>
                  <span className={draft.start_date ? 'has-value' : ''}>{toDateLabel(draft.start_date)}</span>
                  <CalendarIcon />
                </button>
                <button
                  type="button"
                  className={`select-box travel-select time-select${picker === 'startTime' ? ' is-active' : ''}`}
                  onClick={() => togglePicker('startTime')}
                  aria-haspopup="dialog"
                  aria-expanded={picker === 'startTime'}>
                  <span className={draft.start_time ? 'has-value' : ''}>{draft.start_time ?? '시간 선택'}</span>
                  <span className={`select-chevron${picker === 'startTime' ? ' up' : ''}`} aria-hidden="true" />
                </button>
              </div>
            </Field>

            <Field label="여행지 출발">
              <div className="row">
                <button
                  type="button"
                  className={`select-box travel-select date-select${picker === 'endDate' ? ' is-active' : ''}`}
                  onClick={() => togglePicker('endDate')}
                  aria-haspopup="dialog"
                  aria-expanded={picker === 'endDate'}>
                  <span className={draft.end_date ? 'has-value' : ''}>{toDateLabel(draft.end_date)}</span>
                  <CalendarIcon />
                </button>
                <button
                  type="button"
                  className={`select-box travel-select time-select${picker === 'endTime' ? ' is-active' : ''}`}
                  onClick={() => togglePicker('endTime')}
                  aria-haspopup="dialog"
                  aria-expanded={picker === 'endTime'}>
                  <span className={draft.end_time ? 'has-value' : ''}>{draft.end_time ?? '시간 선택'}</span>
                  <span className={`select-chevron${picker === 'endTime' ? ' up' : ''}`} aria-hidden="true" />
                </button>
              </div>
            </Field>

            {picker === 'startDate' || picker === 'endDate' ? (
              <CalendarPopover
                value={picker === 'startDate' ? draft.start_date : draft.end_date}
                placement={picker === 'startDate' ? 'start' : 'end'}
                minDate={picker === 'startDate' ? todayIso() : (draft.start_date ?? todayIso())}
                onSelect={(value) => updateDate(picker === 'startDate' ? 'start_date' : 'end_date', value)}
              />
            ) : null}

            {picker === 'startTime' || picker === 'endTime' ? (
              <TimePopover
                value={picker === 'startTime' ? draft.start_time : draft.end_time}
                placement={picker === 'startTime' ? 'start' : 'end'}
                onSelect={(value) => updateTime(picker === 'startTime' ? 'start_time' : 'end_time', value)}
                onClose={() => setPicker(null)}
              />
            ) : null}

            {scheduleError ? <p className="field-help error travel-date-error">{scheduleError}</p> : null}
          </div>

          <Field label="함께 여행가는 사람과의 관계">
            <div className="relationship-options" role="radiogroup" aria-label="동행 관계">
              {relationshipOptions.map((option) => {
                const selected = draft.companion === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`relationship-option${selected ? ' selected' : ''}`}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => update({
                      companion: option.value as CompanionType,
                      headcount: option.value === 'SOLO' ? 1 : 2,
                    })}>
                    <span className="radio-mark" aria-hidden="true" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="인원">
            <div className="people-stepper">
              <button
                type="button"
                className="stepper-button"
                onClick={() => update({ headcount: Math.max(minimumHeadcount, displayedHeadcount - 1) })}
                disabled={displayedHeadcount <= minimumHeadcount}
                aria-label="인원 한 명 줄이기">
                −
              </button>
              <strong>{displayedHeadcount}명</strong>
              <button
                type="button"
                className="stepper-button"
                onClick={() => update({ headcount: Math.min(30, displayedHeadcount + 1) })}
                disabled={isSolo || displayedHeadcount >= 30}
                aria-label="인원 한 명 늘리기">
                +
              </button>
            </div>
          </Field>
        </div>
      </div>

      <div className="footer-bar">
        <Button
          label="다음: 여행 취향"
          variant="dark"
          disabled={!canContinue}
          onClick={() => navigate('/create-travel/preference')}
        />
      </div>
    </section>
  );
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`field${className ? ` ${className}` : ''}`}>
      <span className="field-label">{label}</span>
      {children}
    </div>
  );
}

function CalendarIcon() {
  return (
    <span className="calendar-icon" aria-hidden="true">
      <span />
    </span>
  );
}

function CalendarPopover({
  value,
  placement,
  minDate,
  onSelect,
}: {
  value?: string;
  placement: 'start' | 'end';
  minDate: string;
  onSelect: (value: string) => void;
}) {
  const [month, setMonth] = useState(() => monthFromValue(value));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cellCount = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  useEffect(() => {
    setMonth(monthFromValue(value));
  }, [value]);

  return (
    <div className={`travel-popover calendar-popover ${placement}`} role="dialog" aria-label="날짜 선택">
      <div className="popover-heading">
        <strong>{year}년 {monthIndex + 1}월</strong>
        <div className="calendar-nav">
          <button type="button" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} aria-label="이전 달">‹</button>
          <button type="button" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} aria-label="다음 달">›</button>
        </div>
      </div>
      <div className="calendar-weekdays">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-days">
        {Array.from({ length: cellCount }, (_, index) => {
          const day = index < firstDay || index >= firstDay + daysInMonth ? null : index - firstDay + 1;
          const iso = day ? `${year}-${pad(monthIndex + 1)}-${pad(day)}` : '';
          const disabled = !day || iso < minDate;
          return (
            <button
              key={`${iso}-${index}`}
              type="button"
              className={`calendar-day${iso === value ? ' selected' : ''}`}
              disabled={disabled}
              onClick={() => !disabled && onSelect(iso)}>
              {day ?? ''}
            </button>
          );
        })}
      </div>
      <div className="popover-helper">날짜를 선택해 주세요</div>
    </div>
  );
}

function TimePopover({
  value,
  placement,
  onSelect,
  onClose,
}: {
  value?: string;
  placement: 'start' | 'end';
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const [hour, minute] = parseTime(value);
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const minutes = Array.from({ length: 60 }, (_, index) => index);

  return (
    <div className={`travel-popover time-popover ${placement}`} role="dialog" aria-label="시간 선택">
      <div className="popover-heading">
        <strong>시간 선택</strong>
        <div className="time-heading-actions">
          <span className="time-format">24시간제 · 1분 단위</span>
          <button type="button" className="popover-done" onClick={onClose}>완료</button>
        </div>
      </div>
      <div className="time-picker-columns">
        <TimeColumn label="시 (00~23)" value={hour} values={hours} onSelect={(nextHour) => onSelect(`${pad(nextHour)}:${pad(minute)}`)} />
        <TimeColumn label="분 (00~59)" value={minute} values={minutes} onSelect={(nextMinute) => onSelect(`${pad(hour)}:${pad(nextMinute)}`)} />
      </div>
      <div className="time-preview">선택: {pad(hour)}:{pad(minute)}</div>
    </div>
  );
}

function TimeColumn({
  label,
  value,
  values,
  onSelect,
}: {
  label: string;
  value: number;
  values: number[];
  onSelect: (value: number) => void;
}) {
  const optionsRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const options = optionsRef.current;
    const selected = selectedRef.current;
    if (!options || !selected) return;
    options.scrollTop = Math.max(0, selected.offsetTop - options.clientHeight / 2 + selected.offsetHeight / 2);
  }, [value]);

  return (
    <div className="time-column">
      <strong>{label}</strong>
      <div className="time-options" ref={optionsRef}>
        {values.map((item) => (
          <button
            key={item}
            ref={item === value ? selectedRef : undefined}
            type="button"
            className={`time-option${item === value ? ' selected' : ''}`}
            onClick={() => onSelect(item)}>
            {pad(item)}
          </button>
        ))}
      </div>
    </div>
  );
}

function monthFromValue(value?: string) {
  const [year, month] = (value ?? '').split('-').map(Number);
  if (year && month) return new Date(year, month - 1, 1);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function parseTime(value?: string): [number, number] {
  const [hour, minute] = (value ?? '10:00').split(':').map(Number);
  return [Number.isFinite(hour) ? hour : 10, Number.isFinite(minute) ? minute : 0];
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function findProvinceValue(draft: { destination?: string; destination_province?: string }) {
  if (draft.destination_province) return draft.destination_province;
  return regionOptions.find((option) => draft.destination?.startsWith(option.value))?.value ?? regionOptions[0].value;
}

type PickerRegion = {
  value: string;
  label: string;
  districts: Array<{ name: string; fullName: string; regionId: number }>;
};

function buildPickerRegions(apiRegions: RegionSummary[]): PickerRegion[] {
  if (apiRegions.length === 0) {
    let regionId = 1;
    return regionOptions.map((region) => ({
      value: region.value,
      label: region.label,
      districts: region.districts.map((district) => ({
        name: district,
        fullName: district === '전체' ? region.value : `${region.value} ${district}`,
        regionId: regionId++,
      })),
    }));
  }

  const groups = new Map<string, PickerRegion>();
  apiRegions.forEach((region) => {
    const province = region.full_name.split(/\s+/)[0] || region.full_name;
    const provinceLabel = regionOptions.find((option) => option.value === province)?.label ?? province;
    const group = groups.get(province) ?? { value: province, label: provinceLabel, districts: [] };
    group.districts.push({ name: region.name, fullName: region.full_name, regionId: region.region_id });
    groups.set(province, group);
  });

  return Array.from(groups.values());
}

function toComparableDateTime(date?: string, time?: string) {
  if (!date || !time) return '';
  return `${date}T${time}`;
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function currentComparableDateTime() {
  const now = new Date();
  return `${todayIso()}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
