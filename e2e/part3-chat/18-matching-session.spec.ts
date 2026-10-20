import { test, expect } from '../support/fixtures';

const activeRequest = {
  matching_request_id: 101,
  user_id: 1,
  preferred_companion_gender: 'MALE',
  theme: ['FOOD', 'SNS'],
  pace: 'RELAXED',
  budget_min: 300000,
  budget_max: 800000,
  status: 'ACTIVE',
  latest_attempt_status: 'SUCCEEDED',
  retry_count: 1,
  remaining_retry_count: 2,
  can_rematch: true,
  has_result: true,
};

const candidatesResponse = {
  candidates: [
    {
      user_id: 201,
      nickname: '매칭상대01',
      profile_image_url: null,
      theme: ['FOOD', 'SNS'],
      pace: 'RELAXED',
      match_rate: 91,
    },
  ],
  count: 1,
  retry_count: 1,
  remaining_retry_count: 2,
  can_rematch: true,
};

test.describe('18. 매칭 세션 복원', () => {
  test('MATCH-SESSION-01 ACTIVE 세션이 있으면 새 요청 없이 기존 결과를 복원한다', { tag: '@P0' }, async ({ page, api }) => {
    api.on('GET', '/api/v2/matching-requests/me', { body: activeRequest });
    api.on('GET', '/api/v2/matches/candidates', { body: candidatesResponse });

    await page.goto('/matching');

    await expect(page).toHaveURL(/\/matching\/result$/);
    await expect(page.getByText('매칭상대01')).toBeVisible();
    expect(api.callsTo('POST', '/api/v2/matching-requests')).toHaveLength(0);
  });

  test('MATCH-SESSION-02 새 조건으로 시작할 때 기존 요청과 로컬 결과를 정리한다', { tag: '@P0' }, async ({ page, api }) => {
    api.on('GET', '/api/v2/matching-requests/me', { body: activeRequest });
    api.on('GET', '/api/v2/matches/candidates', { body: candidatesResponse });
    api.on('DELETE', '/api/v2/matching-requests/me', { status: 204 });

    await page.goto('/matching');
    await page.getByRole('button', { name: '새 조건으로 다시 찾기' }).click();

    await expect(page).toHaveURL(/\/matching$/);
    await expect(page.getByRole('button', { name: '매칭 결과 보기' })).toBeDisabled();
    await expect(page.locator('.matching-choice.selected')).toHaveCount(0);
    expect(api.callsTo('DELETE', '/api/v2/matching-requests/me')).toHaveLength(1);
  });

  test('MATCH-SESSION-03 생성 요청이 409이면 기존 ACTIVE 세션 결과로 이동한다', { tag: '@P0' }, async ({ page, api }) => {
    api.on('GET', '/api/v2/matching-requests/me', {
      status: 404,
      body: { message: 'matching_request_not_found' },
    });
    await page.goto('/matching');
    await expect(page.getByRole('button', { name: '매칭 결과 보기' })).toBeVisible();

    api.on('GET', '/api/v2/matching-requests/me', { body: activeRequest });
    api.on('GET', '/api/v2/matches/candidates', { body: candidatesResponse });
    api.on('POST', '/api/v2/matching-requests', {
      status: 409,
      body: { message: 'matching_request_already_active' },
    });

    await page.getByRole('button', { name: '남성' }).click();
    await page.getByRole('button', { name: '미식' }).click();
    await page.getByRole('button', { name: '여유롭게' }).click();
    await page.getByRole('button', { name: '매칭 결과 보기' }).click();

    await expect(page).toHaveURL(/\/matching\/result$/);
    await expect(page.getByText('매칭상대01')).toBeVisible();
    expect(api.callsTo('POST', '/api/v2/matching-requests')).toHaveLength(1);
  });
});
