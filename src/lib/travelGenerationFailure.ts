import type { AppNotification } from '../types';

export function travelGenerationFailureMessage(reason?: string | null): string {
  const message = reason?.trim();
  // AI는 생성 제한 시간 초과와 일시적 서비스 장애에 같은 재시도 문구를 보낸다.
  if (message === '잠시 후 다시 시도해주세요.' || message === 'AI 서버 응답이 지연되어 여행 일정 생성에 실패했습니다.') {
    return '요청한 시간 안에 여행 일정을 완성하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
  return message || '여행 일정을 생성하지 못했어요. 다시 시도해 주세요.';
}

export function notificationBody(item: AppNotification): string {
  if (item.type === 'TRAVEL_FAILED') return travelGenerationFailureMessage(item.body?.trim() || item.content);
  return item.body;
}
