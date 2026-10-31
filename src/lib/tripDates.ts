/**
 * 홈 화면 여행 카드에서 쓰는 날짜 계산 유틸.
 * 백엔드가 내려주는 'YYYY-MM-DD' 문자열을 로컬 자정 기준 Date 로 바꿔 계산한다.
 * (new Date('YYYY-MM-DD') 는 UTC 로 해석되어 하루가 밀릴 수 있어서 직접 파싱한다.)
 */

const DAY_MS = 86400000;
export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function parseDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function diffDays(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

/** 3박 4일 / 당일치기 */
export function formatTripLength(start: string, end: string) {
  const nights = Math.max(0, diffDays(parseDate(start), parseDate(end)));
  return nights === 0 ? '당일치기' : `${nights}박 ${nights + 1}일`;
}

/** 출발일까지 남은 날짜 (오늘 출발이면 0, 이미 출발했으면 음수) */
export function daysUntil(start: string) {
  return diffDays(startOfToday(), parseDate(start));
}

/**
 * 10.02 (금) – 10.05 (월)
 * 올해가 아닌 여행은 2025.10.02 (목) – 10.04 (토) 처럼 연도를 붙이고,
 * 출발·도착 연도가 다르면 도착일에도 연도를 붙인다.
 */
export function formatDateRange(start: string, end: string, { withYear = false } = {}) {
  const s = parseDate(start);
  const e = parseDate(end);
  const thisYear = new Date().getFullYear();
  const showStartYear = withYear || s.getFullYear() !== thisYear;
  const showEndYear = e.getFullYear() !== s.getFullYear();
  const startLabel = `${showStartYear ? `${s.getFullYear()}.` : ''}${pad(s.getMonth() + 1)}.${pad(s.getDate())}\u00a0(${WEEKDAY_LABELS[s.getDay()]})`;
  if (diffDays(s, e) <= 0) return startLabel;
  const endLabel = `${showEndYear ? `${e.getFullYear()}.` : ''}${pad(e.getMonth() + 1)}.${pad(e.getDate())}\u00a0(${WEEKDAY_LABELS[e.getDay()]})`;
  return `${startLabel} – ${endLabel}`;
}

/** 달력형 날짜 블록에 들어갈 값 */
export function getDateBlock(start: string) {
  const s = parseDate(start);
  return {
    yearMonth: `${s.getFullYear()}.${pad(s.getMonth() + 1)}`,
    day: pad(s.getDate()),
    weekday: WEEKDAY_LABELS[s.getDay()],
    isPastYear: s.getFullYear() < new Date().getFullYear(),
  };
}

export type WeekCell = {
  key: string;
  weekday: string;
  date: number;
  inTrip: boolean;
  isTripStart: boolean;
  isTripEnd: boolean;
  isToday: boolean;
};

/** 출발일이 속한 주(일~토) 7칸. 여행 기간에 포함된 날을 표시한다. */
export function getTripWeek(start: string, end: string): WeekCell[] {
  const s = parseDate(start);
  const e = parseDate(end);
  const today = startOfToday().getTime();
  const sunday = new Date(s.getFullYear(), s.getMonth(), s.getDate() - s.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + index);
    const time = day.getTime();
    const inTrip = time >= s.getTime() && time <= e.getTime();
    return {
      key: `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`,
      weekday: WEEKDAY_LABELS[index],
      date: day.getDate(),
      inTrip,
      isTripStart: inTrip && (time === s.getTime() || index === 0),
      isTripEnd: inTrip && (time === e.getTime() || index === 6),
      isToday: time === today,
    };
  });
}
