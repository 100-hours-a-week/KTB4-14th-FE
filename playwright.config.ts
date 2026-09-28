import { defineConfig, devices } from '@playwright/test';
import { API_BASE_URL, APP_ORIGIN, E2E_PORT } from './e2e/support/env';

/**
 * AUDIGO 프론트 E2E 설정
 * - Vite 개발 서버를 E2E 전용 환경변수로 띄운다(VITE_USE_MOCK=false → 실제 API 호출 경로 사용).
 * - API 요청은 e2e/support/mock-backend.ts 가 가로채서 응답한다.
 */
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
  projects: [
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `npx vite --port ${E2E_PORT} --strictPort`,
    url: APP_ORIGIN,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      BROWSER: 'none',
      VITE_USE_MOCK: 'false',
      VITE_API_BASE_URL: API_BASE_URL,
      VITE_KAKAO_REST_KEY: 'e2e-rest-key',
      VITE_KAKAO_JS_KEY: 'e2e-js-key',
      VITE_KAKAO_REDIRECT_URI: `${APP_ORIGIN}/auth/kakao`,
    },
  },
});
