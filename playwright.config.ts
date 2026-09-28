import { defineConfig, devices, type Project } from '@playwright/test';
import {
  API_BASE_URL,
  APP_ORIGIN,
  AUTH_STATE_PATH,
  E2E_PORT,
  IS_LIVE_ENABLED,
  KAKAO_REDIRECT_URI,
  KAKAO_REST_KEY,
  LIVE_API_BASE_URL,
} from './e2e/support/env';

/**
 * AUDIGO 프론트 E2E 설정
 * - Vite 개발 서버를 E2E 전용 환경변수로 띄운다(VITE_USE_MOCK=false → 실제 API 호출 경로 사용).
 * - mock  : 모든 API 요청을 e2e/support/mock-backend.ts 가 가로채서 응답한다(예외 · 경계값 시나리오).
 * - live  : .env.e2e 의 E2E_API_BASE_URL 실제 백엔드로 요청한다. 예외 상황만 api.once() 로 끼워 넣는다.
 *           요청은 Vite 프록시(/__backend)를 거치므로 백엔드 CORS 에 localhost 를 열 필요가 없다.
 *           로그인 세션은 live-setup 이 .env.e2e 의 인증 쿠키를 주입해서 준비한다(e2e/.auth/live-user.json).
 */
const mobile = devices['Pixel 7'];

const mockProject: Project = {
  name: 'mock',
  testIgnore: /live\//,
  use: { ...mobile },
};

const liveProjects: Project[] = [
  {
    name: 'live-setup',
    testMatch: /live\/auth\.setup\.ts/,
  },
  {
    name: 'live',
    testMatch: /live\/.*\.spec\.ts/,
    dependencies: ['live-setup'],
    // 토큰 재발급(회전)이 겹치지 않도록 한 세션을 순서대로 사용한다.
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 60_000,
    expect: { timeout: 10_000 },
    use: { ...mobile, storageState: AUTH_STATE_PATH },
  },
];

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: APP_ORIGIN,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: IS_LIVE_ENABLED ? [mockProject, ...liveProjects] : [mockProject],
  webServer: {
    command: `npx vite --port ${E2E_PORT} --strictPort`,
    url: APP_ORIGIN,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      BROWSER: 'none',
      VITE_USE_MOCK: 'false',
      VITE_API_BASE_URL: API_BASE_URL,
      VITE_KAKAO_REST_KEY: KAKAO_REST_KEY,
      VITE_KAKAO_JS_KEY: 'e2e-js-key',
      VITE_KAKAO_REDIRECT_URI: KAKAO_REDIRECT_URI,
      E2E_PROXY_TARGET: LIVE_API_BASE_URL ?? '',
    },
  },
});
