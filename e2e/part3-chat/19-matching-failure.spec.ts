import type { Page } from '@playwright/test';
import type { MatchingCandidatesResponse, MatchingRequestResponse } from '../../src/types';
import { test, expect } from '../support/fixtures';
import type { MockBackend } from '../support/mock-backend';

const request: MatchingRequestResponse = {
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
  can_retry: false,
};

const candidates: MatchingCandidatesResponse = {
  candidates: [{
    user_id: 201,
    nickname: '기존추천상대',
    profile_image_url: null,
    theme: ['FOOD'],
    pace: 'RELAXED',
    match_rate: 91,
  }],
  count: 1,
  retry_count: 1,
  remaining_retry_count: 2,
  can_rematch: true,
};

const draft = {
  preferred_companion_gender: 'MALE',
  themes: ['FOOD', 'SNS'],
  pace: 'RELAXED',
  budget_min: 300000,
  budget_max: 800000,
};

function mockSession(api: MockBackend, overrides: Partial<MatchingRequestResponse> = {}) {
  const session = {
    current: { ...request, ...overrides } as MatchingRequestResponse | null,
    result: candidates,
  };
  api.on('GET', '/api/v2/matching-requests/me', () => session.current
    ? { body: session.current }
    : { status: 404, body: { message: 'matching_request_not_found' } });
  api.on('GET', '/api/v2/matches/candidates', () => ({ body: session.result }));
  api.on('DELETE', '/api/v2/matching-requests/me', () => {
    session.current = null;
    return { status: 204 };
  });
  return session;
}

async function seedMatchingStorage(page: Page) {
  await page.addInitScript(({ condition, result }) => {
    if (sessionStorage.getItem('e2e.matching.seeded')) return;
    sessionStorage.setItem('e2e.matching.seeded', '1');
    localStorage.setItem('audigo.matching_condition_draft', JSON.stringify(condition));
    localStorage.setItem('audigo.matching_candidates_result', JSON.stringify(result));
  }, { condition: draft, result: candidates });
}

test.describe('19. 매칭 실패 복구', () => {
  test('MATCH-FAIL-01 후보 0명은 서버 오류와 구분하고 조건을 변경할 수 있다', async ({ page, api }, testInfo) => {
    const session = mockSession(api);
    session.result = { ...candidates, candidates: [], count: 0 };
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/matching');

    await expect(page).toHaveURL(/\/matching\/result\?status=empty$/);
    await expect(page.getByRole('heading', { name: '조건에 맞는 상대가 없어요' })).toBeVisible();
    await expect(page.getByRole('button', { name: '다시 시도', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '조건 변경하기' })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('matching-empty-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: '조건 변경하기' }).click();

    await expect(page).toHaveURL(/\/matching$/);
    await expect(page.getByRole('button', { name: '매칭 결과 보기' })).toBeDisabled();
    expect(api.callsTo('DELETE', '/api/v2/matching-requests/me')).toHaveLength(1);
    expect(api.callsTo('POST', '/api/v2/matches/candidates/retry')).toHaveLength(0);
  });

  test('MATCH-FAIL-02 첫 AI 오류는 재시도 API로 복구하고 새 요청을 생성하지 않는다', { tag: '@P0' }, async ({ page, api }, testInfo) => {
    const session = mockSession(api, {
      latest_attempt_status: null, has_result: false, retry_count: 0, remaining_retry_count: 3,
    });
    api.on('GET', '/api/v2/matches/candidates', () => {
      session.current = { ...request, latest_attempt_status: 'FAILED', has_result: false, can_retry: true };
      return { status: 502, body: { message: 'external_api_error' } };
    });
    api.on('POST', '/api/v2/matches/candidates/retry', () => {
      session.current = { ...request, retry_count: 0, remaining_retry_count: 3 };
      return { body: { ...candidates, retry_count: 0, remaining_retry_count: 3 } };
    });
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/matching/progress');

    await expect(page).toHaveURL(/\/matching\/result\?status=error$/);
    await expect(page.getByRole('heading', { name: '매칭을 완료하지 못했어요' })).toBeVisible();
    await expect(page.getByRole('button', { name: '조건 변경하기' })).toBeVisible();
    await expect(page.getByRole('button', { name: '다시 시도', exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: '조건 변경하기' })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('matching-error-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: '다시 시도', exact: true }).click();

    await expect(page).toHaveURL(/\/matching\/result$/);
    await expect(page.getByText('기존추천상대', { exact: true })).toBeVisible();
    await expect(page.getByText('재매칭 3회 남음')).toBeVisible();
    expect(api.callsTo('POST', '/api/v2/matches/candidates/retry')).toHaveLength(1);
    expect(api.callsTo('POST', '/api/v2/matching-requests')).toHaveLength(0);
    expect(api.callsTo('GET', '/api/v2/matches/candidates')).toHaveLength(1);
  });

  test('MATCH-FAIL-03 첫 실패 후 재진입하면 취소 후 빈 조건 입력 화면을 표시한다', { tag: '@P0' }, async ({ page, api }) => {
    mockSession(api, { latest_attempt_status: 'FAILED', has_result: false, can_retry: true });
    await seedMatchingStorage(page);
    await page.goto('/matching');

    await expect(page.getByRole('button', { name: '매칭 결과 보기' })).toBeDisabled();
    await expect(page.locator('.matching-choice.selected')).toHaveCount(0);
    expect(api.callsTo('DELETE', '/api/v2/matching-requests/me')).toHaveLength(1);
    expect(api.callsTo('GET', '/api/v2/matches/candidates')).toHaveLength(0);
    expect(await page.evaluate(() => localStorage.getItem('audigo.matching_candidates_result'))).toBeNull();
  });

  test('MATCH-FAIL-04 실패 세션 취소 오류 시 값을 보존하고 다시 확인을 제공한다', async ({ page, api }) => {
    mockSession(api, { latest_attempt_status: 'FAILED', has_result: false, can_retry: true });
    api.once('DELETE', '/api/v2/matching-requests/me', { status: 500, body: { message: 'internal_server_error' } });
    await seedMatchingStorage(page);
    await page.goto('/matching');

    await expect(page.getByRole('alert')).toHaveText('매칭 정보를 확인하지 못했어요');
    await expect(page.getByRole('button', { name: '매칭 결과 보기' })).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('audigo.matching_candidates_result')!))).toEqual(candidates);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('audigo.matching_condition_draft')!))).toEqual(draft);
    await page.getByRole('button', { name: '다시 확인' }).click();

    await expect(page.getByRole('button', { name: '매칭 결과 보기' })).toBeDisabled();
    expect(api.callsTo('DELETE', '/api/v2/matching-requests/me')).toHaveLength(2);
  });

  test('MATCH-FAIL-05 세션 조회 오류 시 저장 데이터를 지우지 않고 재조회한다', async ({ page, api }) => {
    mockSession(api);
    api.on('GET', '/api/v2/matching-requests/me', { status: 503, body: { message: 'service_unavailable' } });
    await seedMatchingStorage(page);
    await page.goto('/matching');

    await expect(page.getByRole('alert')).toHaveText('매칭 정보를 확인하지 못했어요');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('audigo.matching_condition_draft')!))).toEqual(draft);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('audigo.matching_candidates_result')!))).toEqual(candidates);
    api.on('GET', '/api/v2/matching-requests/me', { body: request });
    await page.getByRole('button', { name: '다시 확인' }).click();

    await expect(page).toHaveURL(/\/matching\/result$/);
    await expect(page.getByText('기존추천상대', { exact: true })).toBeVisible();
    expect(api.callsTo('POST', '/api/v2/matching-requests')).toHaveLength(0);
  });

  test('MATCH-FAIL-06 재매칭 오류 후 재진입해도 기존 후보와 남은 횟수를 유지한다', { tag: '@P0' }, async ({ page, api }) => {
    const session = mockSession(api);
    api.on('POST', '/api/v2/matches/candidates/rematch', () => {
      session.current = { ...request, latest_attempt_status: 'FAILED', can_retry: true };
      return { status: 502, body: { message: 'external_api_error' } };
    });
    await page.goto('/matching');
    await page.getByRole('button', { name: '매칭 다시하기' }).click();

    await expect(page.getByRole('alert')).toContainText('기존 추천 결과');
    await expect(page.getByText('기존추천상대', { exact: true })).toBeVisible();
    await expect(page.getByText('재매칭 2회 남음')).toBeVisible();
    await page.goto('/matching');

    await expect(page).toHaveURL(/\/matching\/result\?status=error$/);
    await expect(page.getByText('기존추천상대', { exact: true })).toBeVisible();
    await expect(page.getByText('재매칭 2회 남음')).toBeVisible();
    expect(api.callsTo('DELETE', '/api/v2/matching-requests/me')).toHaveLength(0);
    expect(api.callsTo('POST', '/api/v2/matches/candidates/rematch')).toHaveLength(1);
    expect(api.callsTo('POST', '/api/v2/matches/candidates/retry')).toHaveLength(0);
  });

  test('MATCH-FAIL-07 실패한 재매칭을 retry API로 다시 시도한다', async ({ page, api }) => {
    mockSession(api, { latest_attempt_status: 'FAILED', can_retry: true });
    api.on('POST', '/api/v2/matches/candidates/retry', {
      body: {
        ...candidates,
        candidates: [{ ...candidates.candidates[0], user_id: 202, nickname: '새추천상대' }],
        retry_count: 2,
        remaining_retry_count: 1,
      },
    });
    await page.goto('/matching');
    await page.getByRole('button', { name: '다시 시도', exact: true }).click();

    await expect(page.getByText('새추천상대', { exact: true })).toBeVisible();
    await expect(page.getByText('재매칭 1회 남음')).toBeVisible();
    expect(api.callsTo('POST', '/api/v2/matches/candidates/retry')).toHaveLength(1);
    expect(api.callsTo('POST', '/api/v2/matches/candidates/rematch')).toHaveLength(0);
    expect(api.callsTo('POST', '/api/v2/matching-requests')).toHaveLength(0);
  });

  test('MATCH-FAIL-08 PROCESSING 재진입 시 후보 작업을 중복 실행하지 않는다', { tag: '@P0' }, async ({ page, api }) => {
    const session = mockSession(api, { latest_attempt_status: 'PROCESSING', has_result: false });
    await page.goto('/matching');

    await expect(page).toHaveURL(/\/matching\/progress$/);
    await expect.poll(() => api.callsTo('GET', '/api/v2/matching-requests/me').length).toBeGreaterThanOrEqual(3);
    expect(api.callsTo('GET', '/api/v2/matches/candidates')).toHaveLength(0);
    expect(api.callsTo('POST', '/api/v2/matches/candidates/retry')).toHaveLength(0);
    session.current = request;

    await expect(page).toHaveURL(/\/matching\/result$/);
    expect(api.callsTo('GET', '/api/v2/matches/candidates')).toHaveLength(1);
  });

  test('MATCH-FAIL-09 조건 변경 취소가 실패하면 기존 결과와 조건을 보존한다', async ({ page, api }) => {
    mockSession(api, { latest_attempt_status: 'FAILED', can_retry: true });
    api.on('DELETE', '/api/v2/matching-requests/me', { status: 500, body: { message: 'internal_server_error' } });
    await seedMatchingStorage(page);
    await page.goto('/matching');
    await page.getByRole('button', { name: '조건 변경하기' }).click();

    await expect(page.locator('.toast')).toContainText('기존 매칭을 종료하지 못했습니다');
    await expect(page).toHaveURL(/\/matching\/result\?status=error$/);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('audigo.matching_condition_draft')!))).toEqual(draft);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('audigo.matching_candidates_result')!))).toEqual(candidates);
  });

  test('MATCH-FAIL-10 응답 오류여도 BE가 처리 중이면 상태 확인만 이어간다', async ({ page, api }) => {
    const session = mockSession(api, { latest_attempt_status: null, has_result: false });
    api.once('GET', '/api/v2/matches/candidates', () => {
      session.current = { ...request, latest_attempt_status: 'PROCESSING', has_result: false };
      return { status: 502, body: { message: 'external_api_error' } };
    });
    await page.goto('/matching/progress');

    await expect.poll(() => api.callsTo('GET', '/api/v2/matches/candidates').length).toBe(1);
    await expect.poll(() => api.callsTo('GET', '/api/v2/matching-requests/me').length).toBeGreaterThanOrEqual(2);
    await expect(page).toHaveURL(/\/matching\/progress$/);
    expect(api.callsTo('POST', '/api/v2/matches/candidates/retry')).toHaveLength(0);
    session.current = request;

    await expect(page).toHaveURL(/\/matching\/result$/);
    expect(api.callsTo('GET', '/api/v2/matches/candidates')).toHaveLength(2);
  });

  test('MATCH-FAIL-11 진행 상태 조회가 실패해도 후보 작업을 다시 시작하지 않는다', async ({ page, api }) => {
    mockSession(api);
    api.on('GET', '/api/v2/matching-requests/me', { status: 503, body: { message: 'service_unavailable' } });
    await seedMatchingStorage(page);
    await page.goto('/matching/progress');

    await expect(page.getByRole('alert')).toHaveText('매칭 상태를 확인하지 못했어요');
    expect(api.callsTo('GET', '/api/v2/matches/candidates')).toHaveLength(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('audigo.matching_candidates_result')!))).toEqual(candidates);
    api.on('GET', '/api/v2/matching-requests/me', { body: request });
    await page.getByRole('button', { name: '다시 확인' }).click();

    await expect(page).toHaveURL(/\/matching\/result$/);
    expect(api.callsTo('POST', '/api/v2/matching-requests')).toHaveLength(0);
  });

  test('MATCH-FAIL-12 실패 재시도가 다시 실패해도 기존 후보와 횟수를 유지한다', async ({ page, api }) => {
    mockSession(api, { latest_attempt_status: 'FAILED', can_retry: true });
    api.on('POST', '/api/v2/matches/candidates/retry', { status: 502, body: { message: 'external_api_error' } });
    await page.goto('/matching');
    await page.getByRole('button', { name: '다시 시도', exact: true }).click();

    await expect(page.getByRole('alert')).toContainText('기존 추천 결과');
    await expect(page.getByText('기존추천상대', { exact: true })).toBeVisible();
    await expect(page.getByText('재매칭 2회 남음')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('audigo.matching_candidates_result')!))).toEqual(candidates);
    expect(api.callsTo('POST', '/api/v2/matches/candidates/retry')).toHaveLength(1);
  });
});
