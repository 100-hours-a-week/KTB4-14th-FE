import { test, expect } from '../support/fixtures';
import { user } from '../support/data';

/**
 * 1. 인증 (회원가입 · 로그인 · 로그아웃)
 * 카카오 인가 화면(kauth.kakao.com)은 목 백엔드가 가로채서 곧바로 콜백 URL로 리다이렉트한다.
 */
test.describe('1. 인증', () => {
  test.describe('비로그인 상태에서 시작', () => {
    test.use({ loggedIn: false });

    test('AUTH-01 카카오 신규 회원가입 시 추가 입력 없이 닉네임이 반영된 홈으로 진입', { tag: '@P0' }, async ({ page, api }) => {
      api.user = user({ nickname: '새여행자', is_new_user: true });

      await page.goto('/login');
      await page.getByRole('button', { name: '카카오로 계속하기' }).click();

      await expect(page).toHaveURL(/\/home$/);
      await expect(page.getByText('안녕하세요, 새여행자님')).toBeVisible();
      const logins = api.callsTo('POST', '/users/login');
      expect(logins).toHaveLength(1);
      expect(logins[0].body).toMatchObject({ provider: 'KAKAO', authorization_code: api.kakaoCode });
    });

    test('AUTH-02 기존 카카오 계정으로 재로그인 시 가입 화면 없이 홈으로 진입', { tag: '@P0' }, async ({ page, api }) => {
      api.user = user({ nickname: '송월', is_new_user: false });

      await page.goto('/login');
      await page.getByRole('button', { name: '카카오로 계속하기' }).click();

      await expect(page).toHaveURL(/\/home$/);
      await expect(page.getByText('안녕하세요, 송월님')).toBeVisible();
      expect(api.callsTo('POST', '/users/login')).toHaveLength(1);
    });

    test('AUTH-03 카카오 인증 취소 시 /login 으로 복귀하고 재시도 가능', { tag: '@P1' }, async ({ page, api }) => {
      api.kakaoAuth = 'cancel';

      await page.goto('/login');
      await page.getByRole('button', { name: '카카오로 계속하기' }).click();
      await page.getByRole('button', { name: '로그인으로 돌아가기' }).click();

      await expect(page).toHaveURL(/\/login$/);
      expect(api.callsTo('POST', '/users/login')).toHaveLength(0);

      // 재시도
      api.kakaoAuth = 'success';
      await page.getByRole('button', { name: '카카오로 계속하기' }).click();
      await expect(page).toHaveURL(/\/home$/);
    });

    test('AUTH-06 미로그인 상태에서 보호 경로 직접 접근 시 /login 으로 리다이렉트', { tag: '@P1' }, async ({ page }) => {
      await page.goto('/home');
      await expect(page).toHaveURL(/\/login$/);

      await page.goto('/create-travel');
      await expect(page).toHaveURL(/\/login$/);
    });
  });

  test.describe('로그인 상태에서 시작', () => {
    test('AUTH-04 로그아웃 시 토큰 폐기 후 /login 이동, 이후 보호 페이지 접근 차단', { tag: '@P0' }, async ({ page, api }) => {
      await page.goto('/my');
      await page.getByRole('button', { name: '로그아웃' }).click();

      await expect(page).toHaveURL(/\/login$/);
      expect(api.callsTo('POST', '/users/logout')).toHaveLength(1);
      expect(await page.evaluate(() => localStorage.getItem('audigo.user'))).toBeNull();

      await page.goto('/home');
      await expect(page).toHaveURL(/\/login$/);
    });

    test('AUTH-05 로그아웃 후 재로그인 시 새 로그인 요청으로 토큰을 다시 발급받음', { tag: '@P0' }, async ({ page, api }) => {
      test.info().annotations.push({
        type: 'BE',
        description: '로그아웃 전 토큰으로 호출 시 401 반환은 백엔드 통합 테스트에서 검증',
      });

      await page.goto('/my');
      await page.getByRole('button', { name: '로그아웃' }).click();
      await expect(page).toHaveURL(/\/login$/);

      await page.getByRole('button', { name: '카카오로 계속하기' }).click();
      await expect(page).toHaveURL(/\/home$/);
      expect(api.callsTo('POST', '/users/login')).toHaveLength(1);
      expect(api.callsTo('POST', '/users/logout')).toHaveLength(1);
    });
  });
});
