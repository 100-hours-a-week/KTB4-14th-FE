export const companionOptions = [
  { value: 'SOLO', label: '혼자' },
  { value: 'FRIEND', label: '친구' },
  { value: 'COUPLE', label: '연인' },
  { value: 'FAMILY', label: '가족' },
] as const;

export const transportOptions = [
  { value: 'PUBLIC', label: '대중교통' },
  { value: 'CAR', label: '자차' },
  { value: 'WALK', label: '도보' },
  { value: 'ETC', label: '기타' },
] as const;

export const styleOptions = [
  { value: 'RELAXED', label: '여유로운' },
  { value: 'BALANCED', label: '균형잡힌' },
  { value: 'PACKED', label: '알찬' },
] as const;

export const regionOptions = [
  { value: 'HOTPLACE', label: '핫플레이스' },
  { value: 'NATURE', label: '자연' },
  { value: 'LOCAL', label: '새로운 곳' },
] as const;

export const foodOptions = [
  { value: 'KOREAN', label: '한식' },
  { value: 'JAPANESE', label: '일식' },
  { value: 'CHINESE', label: '중식' },
  { value: 'WESTERN', label: '양식' },
  { value: 'ANY', label: '상관없음' },
] as const;

export const paceOptions = [
  { value: 'QUIET', label: '한적' },
  { value: 'NORMAL', label: '보통' },
  { value: 'FUN', label: '흥미' },
  { value: 'FULL', label: '알차' },
] as const;

export function toDatetime(date?: string, time?: string) {
  if (!date) return '';
  return `${date}T${time || '10:00'}:00`;
}

export function nightsAndDays(start?: string, end?: string) {
  if (!start || !end) return '';
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  const nights = Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
  return `${nights}박 ${nights + 1}일`;
}
