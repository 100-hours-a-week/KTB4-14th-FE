import { test as setup } from '@playwright/test';
import { AUTH_COOKIES, AUTH_STATE_PATH } from '../support/env';
import { prepareSession } from '../support/live-session';

/**
 * live 스위트 세션 주입.
 * 카카오 2단계 인증 때문에 로그인 과정은 자동화하지 않고,
 * 직접 로그인한 브라우저의 백엔드 인증 쿠키(.env.e2e 의 E2E_AUTH_COOKIES)를 주입한다.
 * 한 번 검증된 세션은 e2e/.auth/ 에 저장되고, 토큰이 재발급되면 최신 쿠키로 갱신된다.
 */
setup('백엔드 세션 주입', async ({ playwright }) => {
  const main = await prepareSession(playwright.request, { statePath: AUTH_STATE_PATH, cookieHeader: AUTH_COOKIES });
  if (!main.ok) {
    throw new Error(
      `[live] 세션 주입 실패: ${main.reason}\n` +
        '브라우저에서 로그인 → 개발자 도구 Network 탭 → 백엔드 API 요청 → Request Headers 의 cookie 값을\n' +
        '.env.e2e 의 E2E_AUTH_COOKIES 에 넣은 뒤 다시 실행해 주세요. (자세한 방법: e2e/README.md)',
    );
  }
  console.log(`[live] 세션 준비 완료(${main.source === 'saved' ? '저장된 세션' : '.env.e2e 쿠키'}) — ${main.nickname}`);
});

