import { test, expect } from '../support/fixtures';
import { addPlaceFromMap, goToPlacesStep, searchPlace, selectedPlaces } from '../support/flows';

/**
 * 4. 카카오맵 연동
 * 장소 검색은 백엔드(GET /api/places/search)가 카카오 API를 중계한다.
 * 외부 API 장애·지연은 목 백엔드 응답으로 재현한다.
 */

/** 검색 응답 지연 시 타임아웃 안내가 나와야 하는 시간(팀 합의값으로 조정) */
const SEARCH_TIMEOUT_MS = 10_000;

test.describe('4. 카카오맵 연동', () => {
  test('EXT-01 결과가 없는 검색어는 "검색 결과가 없습니다" 안내', { tag: '@P1' }, async ({ page }) => {
    await page.goto('/create-travel/map-search');
    await searchPlace(page, 'zxqv없는장소qq');

    await expect(page.getByText(/검색 결과가 없습니다/)).toBeVisible();
  });

  test('EXT-02 검색어 공백/1글자 입력 시 최소 글자 수 안내', { tag: '@P2' }, async ({ page, api }) => {
    await page.goto('/create-travel/map-search');

    await searchPlace(page, '   ');
    await expect(page.getByRole('alert')).toBeVisible();

    await searchPlace(page, '경');
    await expect(page.getByRole('alert')).toContainText(/2자|최소/);
    expect(api.callsTo('GET', '/api/places/search').filter((c) => c.query.get('keyword') === '경')).toHaveLength(0);
  });

  test('EXT-03 카카오 API 응답 지연 시 타임아웃 처리 및 재시도 안내', { tag: '@P1' }, async ({ page, api }) => {
    test.setTimeout(45_000);
    await page.goto('/create-travel/map-search');
    api.on('GET', '/api/places/search', { delayMs: 30_000, body: { places: [], page: 1, size: 15, is_end: true, pageable_count: 0 } });

    await searchPlace(page, '경복궁');

    await expect(page.getByRole('alert')).toContainText(/다시 시도/, { timeout: SEARCH_TIMEOUT_MS + 2_000 });
  });

  test('EXT-04 카카오 API 장애(5xx) 시 명확한 안내, 기존에 추가한 장소는 유지', { tag: '@P1' }, async ({ page, api }) => {
    await goToPlacesStep(page);
    await addPlaceFromMap(page, '경복궁');

    api.on('GET', '/api/places/search', { status: 502, body: { message: 'external_api_error' } });
    await page.getByRole('button', { name: '+ 카카오맵에서 장소 추가' }).click();
    await searchPlace(page, '광장시장');

    // 사용자용 문구여야 함(내부 설정 안내 X)
    await expect(page.getByRole('alert')).toContainText(/일시적으로|잠시 후 다시/);
    await expect(page.getByRole('alert')).not.toContainText(/REST 키|백엔드/);

    await page.getByRole('button', { name: '뒤로' }).click();
    await expect(selectedPlaces(page)).toHaveCount(1);
    await expect(selectedPlaces(page).first()).toContainText('경복궁');
  });

  test.skip('EXT-05 동일 검색어 반복 조회 시 응답 속도 개선(캐시)', { tag: ['@P2', '@BE'] }, async () => {
    // 캐시 적중 여부는 백엔드(Redis 등) 책임이라 목 백엔드로는 의미 있는 검증이 불가.
    // → 백엔드 통합 테스트 또는 스테이징 부하 테스트에서 검증.
  });
});
