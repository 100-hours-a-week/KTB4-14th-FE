import { test, expect } from '../support/live-fixtures';
import { GENERATION_TIMEOUT_MS, LIVE_GENERATE } from '../support/env';
import { addPlaceFromMap, generateButton, goToPlacesStep, searchPlace } from '../support/flows';
import { LIVE_BASIC, waitForApi } from '../support/live-flows';

/**
 * [live] 3. 여행 생성
 * 실제 현재 시각 기준으로 미래 날짜를 고르기 위해 다음 달 10~11일(1박 2일)로 입력한다.
 * 지역 목록 · 장소 검색(카카오 중계)은 실제 백엔드를 호출한다.
 */
test.describe('[live] 3. 여행 생성', () => {
  test('LIVE-WIZ-01 지역 목록 · 카카오 장소 검색을 실제 백엔드에서 받아 필수 장소 추가', { tag: '@P0' }, async ({ page }) => {
    const regions = waitForApi(page, 'GET', '/api/regions');
    await goToPlacesStep(page, LIVE_BASIC);
    expect((await regions).status()).toBe(200);

    const search = waitForApi(page, 'GET', '/api/places/search');
    await addPlaceFromMap(page, '경복궁');
    const response = await search;
    expect(response.status(), '장소 검색 실패 — 백엔드 카카오 REST 키 설정 확인').toBe(200);

    await expect(page.locator('.scroll .place-row').first()).toContainText('경복궁');
  });

  test('LIVE-EXT-01 장소 검색 API 장애(5xx) 시 기존에 추가한 장소는 유지', { tag: '@P1' }, async ({ page, api }) => {
    await goToPlacesStep(page, LIVE_BASIC);
    await addPlaceFromMap(page, '경복궁');

    // 예외 주입: 이후 검색은 502
    api.on('GET', '/api/places/search', { status: 502, body: { message: 'external_api_error' } });
    await page.getByRole('button', { name: '+ 카카오맵에서 장소 추가' }).click();
    await searchPlace(page, '광장시장');
    await expect(page.getByRole('alert')).toBeVisible();

    await page.getByRole('button', { name: '뒤로' }).click();
    await expect(page.locator('.scroll .place-row')).toHaveCount(1);
  });

  test('LIVE-ASY-01 여행 생성 요청 → 실제 AI 생성 완료 → 일정 상세 이동', { tag: '@P0' }, async ({ page }) => {
    test.skip(!LIVE_GENERATE, '실제 여행이 생성되고 LLM 이 호출됨 — .env.e2e 에 E2E_LIVE_GENERATE=true 일 때만 실행');
    test.setTimeout(GENERATION_TIMEOUT_MS + 60_000);

    await goToPlacesStep(page, LIVE_BASIC);
    await addPlaceFromMap(page, '경복궁');

    const created = waitForApi(page, 'POST', '/api/travel-plans');
    await generateButton(page).click();
    const response = await created;
    expect(response.status(), await response.text()).toBeLessThan(300);

    await expect(page).toHaveURL(/\/generating\/\d+/);
    await expect(page).toHaveURL(/\/output\/\d+\/places$/, { timeout: GENERATION_TIMEOUT_MS });
    await expect(page.locator('.output-place-row').first()).toBeVisible();
    await expect(page.locator('.output-place-heading strong', { hasText: '경복궁' })).toBeVisible();
  });
});
