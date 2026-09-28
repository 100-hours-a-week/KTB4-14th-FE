import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * E2E 실행 환경 상수.
 * - mock 스위트: 실제 백엔드 대신 Playwright 네트워크 가로채기(page.route)로 API를 흉내 낸다.
 * - live 스위트: E2E_API_BASE_URL 로 지정한 실제 백엔드에 요청한다(.env.e2e 참고).
 *   브라우저 · 테스트 모두 Vite 프록시(APP_ORIGIN/__backend)를 거쳐서 요청하므로 백엔드 CORS 설정과 무관하다.
 */
const ENV_FILE = resolve(process.cwd(), '.env.e2e');
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

export const E2E_PORT = Number(process.env.E2E_PORT ?? 5174);
export const APP_ORIGIN = `http://localhost:${E2E_PORT}`;

/** 실제 백엔드 주소(Vite 프록시 대상). 비어 있으면 live 스위트는 실행 목록에서 빠진다. */
export const LIVE_API_BASE_URL = process.env.E2E_API_BASE_URL?.replace(/\/$/, '') || undefined;
export const IS_LIVE_ENABLED = Boolean(LIVE_API_BASE_URL);

/**
 * 앱이 요청을 보내는 API 주소.
 * - live 가 켜져 있으면 Vite 프록시 경로(vite.config.ts 의 /__backend → LIVE_API_BASE_URL).
 *   앱 페이지와 경로가 겹치지 않아 mock 스위트가 API 요청만 가로챌 수 있다.
 * - live 가 꺼져 있으면 존재하지 않는 호스트를 쓴다(mock 스위트는 모든 요청이 브라우저 밖으로 나가기 전에 가로채진다).
 */
export const API_BASE_URL = IS_LIVE_ENABLED ? `${APP_ORIGIN}/__backend` : 'http://api.e2e.test';

/** 요청 URL 에서 API 경로(/api/..., /users/...)만 꺼낸다(프록시 접두사 제거). */
export function apiPathOf(url: URL) {
  const prefix = new URL(API_BASE_URL).pathname.replace(/\/$/, '');
  return url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname;
}

/** 로그인 버튼이 이동할 카카오 인가 주소 설정(live 스위트는 세션을 주입하므로 로그인 화면을 거치지 않는다). */
export const KAKAO_REST_KEY = process.env.E2E_KAKAO_REST_KEY || 'e2e-rest-key';
export const KAKAO_REDIRECT_URI = process.env.E2E_KAKAO_REDIRECT_URI || `${APP_ORIGIN}/auth/kakao`;

/**
 * 주입할 백엔드 인증 쿠키(live). 브라우저에서 직접 로그인한 뒤 API 요청의 Cookie 헤더 값을 그대로 붙여 넣는다.
 * 예: "audigo_access_token=eyJ...; audigo_refresh_token=AUDIGO_REFRESH_..." (쿠키 이름은 백엔드 AuthCookieProperties 기본값)
 * 카카오 2단계 인증 때문에 로그인 과정은 자동화하지 않는다.
 */
export const AUTH_COOKIES = process.env.E2E_AUTH_COOKIES || undefined;
/**
 * (선택) E2E_AUTH_COOKIES 보다 먼저 로그인한 기기의 쿠키 — LIVE-SESS-05(단일 기기 정책) 용.
 * 이후 로그인으로 이미 무효가 된 세션이어야 하므로 세션 준비(live-setup)에서는 쓰지 않는다.
 */
export const AUTH_COOKIES_PREV = process.env.E2E_AUTH_COOKIES_PREV || undefined;

/** 검증된 세션(쿠키 + localStorage) 저장 위치. 재발급으로 바뀐 토큰을 이어 쓰기 위해 사용하며 git 에 올리지 않는다. */
export const AUTH_STATE_PATH = resolve(process.cwd(), 'e2e/.auth/live-user.json');

/** 실제 AI 생성 대기 시간 */
export const GENERATION_TIMEOUT_MS = Number(process.env.E2E_GENERATION_TIMEOUT_MS ?? 180_000);
/** 실제 여행을 생성하는 테스트(LLM 호출 · DB 저장 발생) 실행 여부 */
export const LIVE_GENERATE = process.env.E2E_LIVE_GENERATE === 'true';

/** 테스트 기준 시각(Asia/Seoul). 달력·D-day·일정 계산이 매번 같은 결과가 나오도록 고정한다(mock 전용). */
export const FIXED_NOW = '2026-10-01T09:00:00+09:00';
