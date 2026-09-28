import { test as base, expect } from '@playwright/test';
import { MockBackend } from './mock-backend';
import { writeAuthState } from './live-session';

type Fixtures = {
  /**
   * 실제 백엔드 연동용 네트워크 제어.
   * - 기본: 모든 API 요청이 실제 백엔드로 간다(호출 이력은 api.callsTo() 로 확인).
   * - 예외 상황만 api.on() / api.once() 로 가짜 응답을 끼워 넣는다(401, 5xx, 지연, 네트워크 끊김 등).
   */
  api: MockBackend;
};

/**
 * live 스위트 전용 test.
 * 로그인 세션은 playwright.config.ts 의 storageState(e2e/.auth/live-user.json)로 주입된다.
 */
export const test = base.extend<Fixtures>({
  api: [
    async ({ page, context }, use) => {
      const api = new MockBackend(new Date(), { passthrough: true });
      await api.attach(page);
      await use(api);
      // 테스트 중 토큰이 재발급(회전)됐을 수 있으므로 최신 세션을 저장해 다음 테스트가 이어서 쓴다.
      // localStorage 는 로그인 정보만 남긴다(여행 작성 임시값 등이 다음 테스트로 새지 않게).
      const state = await context.storageState();
      writeAuthState({
        cookies: state.cookies,
        origins: state.origins.map((origin) => ({
          ...origin,
          localStorage: origin.localStorage.filter((entry) => entry.name === 'audigo.user'),
        })),
      });
    },
    { auto: true },
  ],
});

export { expect };
