import { test, expect, knownGap } from '../support/fixtures';
import { summary } from '../support/data';

/** 10. 일정 이어보기 / 추천 경로 보기 */
test.describe('10. 일정 이어보기 / 추천 경로', () => {
  test('ITIN-05(10절) 진행 중 여행 카드 → 일정 이어보기 진입 시 기본 정보 표시', { tag: '@P0' }, async ({ page, api }) => {
    api.upcoming = summary();

    await page.goto('/home');
    await page.getByRole('button', { name: '일정 이어보기' }).click();

    await expect(page).toHaveURL(/\/output\/77\/places$/);
    const info = page.locator('.output-trip-summary');
    await expect(info.getByRole('heading', { name: '서울 1박 2일 여행' })).toBeVisible();
    await expect(info).toContainText('2026.10.01 - 2026.10.02 · 1박 2일');
    await expect(info).toContainText('장소 5곳');
  });

  test('ITIN-06 장소 목록에 이름 · 방문 시간이 정확히 표시', { tag: '@P0' }, async ({ page }) => {
    test.info().annotations.push({ type: 'NOTE', description: '장소별 예상 비용 필드는 현재 API 명세에 없음 — 이동 요금만 표시(ITIN-07 참고)' });
    await page.goto('/output/77/places');

    const expected: Array<[string, string]> = [
      ['경복궁', '10:00 - 11:30'],
      ['광장시장', '12:00 - 13:00'],
      ['북촌한옥마을', '13:30 - 15:00'],
      ['남산서울타워', '10:00 - 12:00'],
      ['명동교자', '12:30 - 13:30'],
    ];
    const rows = page.locator('.output-place-row');
    await expect(rows).toHaveCount(expected.length);
    for (const [index, [name, time]] of expected.entries()) {
      await expect(rows.nth(index).locator('.output-place-heading strong')).toHaveText(name);
      await expect(rows.nth(index).locator('.output-place-heading span').first()).toContainText(time);
    }
    await expect(page.locator('.output-day-heading strong')).toHaveText(['DAY 1', 'DAY 2']);
  });

  test('ITIN-07 이동 경로가 지도에 렌더링되고 구간별 이동 수단이 반영', { tag: '@P0' }, async ({ page }) => {
    await page.goto('/output/77/places');
    await page.getByRole('tab', { name: '이동 경로' }).click();
    await expect(page).toHaveURL(/\/output\/77\/routes$/);

    // 지도(카카오 SDK 대역): 장소 5곳 마커 + 경로선 1개
    await expect(page.getByLabel('카카오 이동 경로 지도')).toHaveAttribute('data-e2e-kakao-map', 'ready');
    await expect.poll(() => page.evaluate(() => (window as any).__kakaoCalls)).toMatchObject({ markers: 5, polylines: 1, polylinePoints: 5 });

    const cards = page.locator('.output-route-card');
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toContainText('경복궁 → 광장시장');
    await expect(cards.nth(0)).toContainText('대중교통');
    await expect(cards.nth(1)).toContainText('도보');
    await expect(cards.nth(2)).toContainText('차량');
  });

  test('ITIN-08 추천 음악이 정상 표시', { tag: '@P1' }, async ({ page }) => {
    knownGap('normalizeItinerary가 recommended_music을 누락 (api/travels.ts)');
    test.info().annotations.push({ type: 'BE', description: '재진입 시 캐시로 로딩이 빨라지는지는 백엔드/스테이징에서 측정' });
    await page.goto('/output/77/places');

    const music = page.locator('.output-music');
    await expect(music).toContainText('추천 음악');
    await expect(music).toContainText('여행의 시작');
    await expect(music).toContainText('AUDIGO');
  });

  test.skip('ITIN-09 좌표/시간이 없는 장소는 저장되지 않아 조회되지 않음', { tag: ['@P2', '@BE'] }, async () => {
    // 누락 데이터 미저장은 백엔드 저장 로직 책임 → 백엔드 통합 테스트에서 검증.
  });
});
