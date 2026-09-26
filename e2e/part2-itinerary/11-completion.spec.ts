import { test, expect, knownGap } from '../support/fixtures';
import { completionButton, placeRow, placeTime, toggleCompletion } from '../support/flows';

/**
 * 11. 장소별 이동 · 완료 체크
 * PATCH /api/itinerary-items/:id/completion → 백엔드가 이후 일정을 재계산 → 프론트가 일정 재조회.
 * 목 백엔드는 "완료 시각 - 예정 종료 시각" 만큼 같은 날 이후 장소 시간을 이동시킨다.
 * 기본 기준 시각은 2026-10-01 09:00 (fixtures 의 now).
 */
test.describe('11. 장소별 이동 · 완료 체크', () => {
  test.describe('예정 종료(11:30)와 같은 시각에 완료', () => {
    test.use({ now: '2026-10-01T11:30:00+09:00' });

    test('ITIN-10 장소 완료 체크 시 완료 상태 표시 및 이후 일정 갱신', { tag: '@P0' }, async ({ page, api }) => {
      await page.goto('/output/77/places');
      await toggleCompletion(page, '경복궁');

      await expect(placeRow(page, '경복궁')).toHaveClass(/completed/);
      const patches = api.callsTo('PATCH', '/api/itinerary-items/101/completion');
      expect(patches).toHaveLength(1);
      expect(patches[0].body).toEqual({ is_completed: true });
      // 완료 후 최신 일정(재계산 결과)을 다시 불러온다
      await expect.poll(() => api.callsTo('GET', '/api/travel-plans/77/itinerary').length).toBeGreaterThanOrEqual(2);
    });

    test('ITIN-11 순서를 건너뛰고 이후 장소를 먼저 완료해도 정상 처리', { tag: '@P1' }, async ({ page, api }) => {
      await page.goto('/output/77/places');
      await toggleCompletion(page, '남산서울타워');

      await expect(placeRow(page, '남산서울타워')).toHaveClass(/completed/);
      await expect(placeRow(page, '경복궁')).not.toHaveClass(/completed/);
      await expect(placeRow(page, '광장시장')).not.toHaveClass(/completed/);
      expect(api.callsTo('PATCH', '/api/itinerary-items/201/completion')).toHaveLength(1);
    });
  });

  for (const scenario of [
    { label: '30분 일찍', now: '2026-10-01T11:00:00+09:00', next: '11:30 - 12:30' },
    { label: '30분 늦게', now: '2026-10-01T12:00:00+09:00', next: '12:30 - 13:30' },
  ]) {
    test.describe(`예정보다 ${scenario.label} 완료`, () => {
      test.use({ now: scenario.now });

      test(`ITIN-12 완료 시각 기준으로 다음 장소 시간이 재계산(${scenario.label})`, { tag: '@P1' }, async ({ page }) => {
        await page.goto('/output/77/places');
        await expect(placeTime(page, '광장시장')).toContainText('12:00 - 13:00');

        await toggleCompletion(page, '경복궁');

        await expect(placeTime(page, '광장시장')).toContainText(scenario.next);
      });
    });
  }

  test('ITIN-13 대중교통 구간에서 실시간 배차/소요시간 정보 표시', { tag: '@P0' }, async ({ page }) => {
    await page.goto('/output/77/places');
    const row = placeRow(page, '경복궁');
    await row.locator('.route-info-toggle').click();

    const panel = row.locator('.route-info-panel');
    await expect(panel).toContainText('경복궁역');
    await expect(panel).toContainText('7212번');
    await expect(panel).toContainText('5분 후 도착');
    await expect(panel).toContainText('25분');
  });

  test('ITIN-14 실시간 대중교통 조회 실패 시 토스트 안내 및 기본 예상 시간으로 대체', { tag: '@P1' }, async ({ page, api }) => {
    knownGap('실시간 조회 실패 토스트 없음 (OutputPage.tsx)');
    const plan = api.itineraryOf(77);
    Object.assign(plan.itinerary_days[0].routes[0], { realtime: false, next_arrival_minutes: null, estimated_arrival_at: '2026-10-01T12:05:00' });

    await page.goto('/output/77/places');

    await expect(page.locator('.toast')).toContainText(/실시간/);
    const row = placeRow(page, '경복궁');
    await row.locator('.route-info-toggle').click();
    await expect(row.locator('.route-info-panel')).toContainText('12:05 도착 예정');
  });

  test('ITIN-15 완료 체크 중 네트워크가 끊기면 실패를 알리고 재시도 가능', { tag: '@P1' }, async ({ page, api }) => {
    await page.goto('/output/77/places');
    api.once('PATCH', '/api/itinerary-items/:id/completion', { abort: true });

    await toggleCompletion(page, '경복궁');

    await expect(page.getByRole('alert')).toContainText('일정 완료 상태를 저장하지 못했어요.');
    await expect(placeRow(page, '경복궁')).not.toHaveClass(/completed/);

    // 재시도
    await expect(await completionButton(page, '경복궁')).toBeEnabled();
    await toggleCompletion(page, '경복궁');
    await expect(placeRow(page, '경복궁')).toHaveClass(/completed/);
  });

  test('ITIN-16 완료 버튼을 연속 클릭해도 한 번만 반영', { tag: '@P2' }, async ({ page, api }) => {
    await page.goto('/output/77/places');
    api.on('PATCH', '/api/itinerary-items/:id/completion', async (req, backend) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const plan = backend.itineraryOf(77);
      const target = plan.itinerary_days[0].items[0];
      target.is_completed = true;
      return { body: { itinerary_item_id: Number(req.params.id), is_completed: true, completed_at: backend.now.toISOString() } };
    });

    await (await completionButton(page, '경복궁')).dblclick();

    await expect(placeRow(page, '경복궁')).toHaveClass(/completed/);
    expect(api.callsTo('PATCH', '/api/itinerary-items/101/completion')).toHaveLength(1);
  });

  test.describe('완료 후 되돌리기', () => {
    test.use({ now: '2026-10-01T12:00:00+09:00' });

    test('ITIN-17 잘못 체크한 장소를 다시 누르면 체크가 취소되고 조정된 시간은 유지', { tag: '@P2' }, async ({ page, api }) => {
      await page.goto('/output/77/places');
      await toggleCompletion(page, '경복궁');
      await expect(placeRow(page, '경복궁')).toHaveClass(/completed/);
      await expect(placeTime(page, '광장시장')).toContainText('12:30 - 13:30');

      await toggleCompletion(page, '경복궁');

      await expect(placeRow(page, '경복궁')).not.toHaveClass(/completed/);
      const patches = api.callsTo('PATCH', '/api/itinerary-items/101/completion');
      expect(patches.map((p) => p.body)).toEqual([{ is_completed: true }, { is_completed: false }]);
      await expect(placeTime(page, '광장시장')).toContainText('12:30 - 13:30');
    });
  });
});
