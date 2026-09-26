import { test as base, expect, type Page } from '@playwright/test';
import { FIXED_NOW } from './env';
import { MockBackend } from './mock-backend';
import type { AuthUser } from './data';

type Fixtures = {
  /** 테스트 기준 시각 (test.use({ now: '...' }) 로 변경) */
  now: string;
  /** 로그인된 상태로 시작할지 여부 (test.use({ loggedIn: false }) 로 변경) */
  loggedIn: boolean;
  /** 가짜 백엔드 */
  api: MockBackend;
};

/**
 * 로그인 상태 주입.
 * 실제 카카오 로그인은 자동화할 수 없으므로(2단계 인증·봇 차단),
 * 앱이 로그인 후 저장하는 localStorage 값(audigo.user)을 직접 넣는다.
 * 토큰은 HttpOnly 쿠키라 목 백엔드에서는 신경 쓰지 않는다.
 * 탭당 한 번만 주입해서, 테스트 중 로그아웃하면 다시 로그인되지 않게 한다.
 */
export async function seedSession(page: Page, user: AuthUser) {
  await page.addInitScript((value) => {
    if (sessionStorage.getItem('e2e.seeded')) return;
    sessionStorage.setItem('e2e.seeded', '1');
    localStorage.setItem('audigo.user', JSON.stringify(value));
  }, user);
}

export const test = base.extend<Fixtures>({
  now: [FIXED_NOW, { option: true }],
  loggedIn: [true, { option: true }],
  api: [
    async ({ page, now, loggedIn }, use) => {
      const api = new MockBackend(now);
      await api.attach(page);
      if (loggedIn) await seedSession(page, api.user);
      await use(api);
    },
    { auto: true },
  ],
});

export { expect };
