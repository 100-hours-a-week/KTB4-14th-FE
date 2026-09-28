/**
 * E2E 실행 환경 상수.
 * 테스트는 실제 백엔드 대신 Playwright 네트워크 가로채기(page.route)로 API를 흉내 낸다.
 * API_BASE_URL 은 실제로 존재하지 않는 호스트여도 된다(모든 요청이 브라우저 밖으로 나가기 전에 가로채진다).
 */
export const E2E_PORT = Number(process.env.E2E_PORT ?? 5174);
export const APP_ORIGIN = `http://localhost:${E2E_PORT}`;
export const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://api.e2e.test';

/** 테스트 기준 시각(Asia/Seoul). 달력·D-day·일정 계산이 매번 같은 결과가 나오도록 고정한다. */
export const FIXED_NOW = '2026-10-01T09:00:00+09:00';
