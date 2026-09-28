import { test, expect } from '../support/fixtures';
import {
  addPlaceFromMap,
  fillBasicInfo,
  fillPreference,
  generateButton,
  goToPlacesStep,
  nextToPlaces,
  nextToPreference,
  openWizardFromHome,
  pickDate,
  pickTime,
  selectRegion,
  selectedPlaces,
} from '../support/flows';

/** 2. 여행 생성 마법사 (1/3 기본정보 → 2/3 여행 취향 → 3/3 필수 장소) */
test.describe('2. 여행 생성', () => {
  test('WIZ-01 필수 장소 포함 생성 — 단계 진행률 갱신 후 생성 요청 접수', { tag: '@P0' }, async ({ page, api }) => {
    await openWizardFromHome(page);
    await expect(page.getByText('1 / 3 · 기본 정보')).toBeVisible();

    await fillBasicInfo(page);
    await nextToPreference(page).click();
    await expect(page.getByText('2 / 3 · 여행 취향')).toBeVisible();

    await fillPreference(page);
    await nextToPlaces(page).click();
    await expect(page.locator('.progress span.on')).toHaveCount(3);

    await addPlaceFromMap(page, '경복궁');
    await generateButton(page).click();

    await expect(page).toHaveURL(/\/generating\/\d+\?job_id=\d+/);
    await expect(page.getByRole('heading', { name: '최적의 여행을 만드는 중입니다' })).toBeVisible();

    const [request] = api.callsTo('POST', '/api/travel-plans');
    expect(request.body).toMatchObject({
      region_id: 11,
      headcount: 2,
      companion_type: 'FRIEND',
      arrival_datetime: '2026-10-10T10:00:00',
      departure_datetime: '2026-10-12T18:00:00',
      preference: { pace_type: 'BALANCED', transport_type: 'PUBLIC_TRANSPORT', themes: ['FOOD'] },
      required_places: [{ provider: 'KAKAO', provider_place_id: '1001', place_name: '경복궁', order: 1 }],
    });
  });

  test('WIZ-02 필수 장소 없이도 버튼이 활성화되고 정상 제출', { tag: '@P0' }, async ({ page, api }) => {
    await goToPlacesStep(page);
    await expect(page.getByText('아직 선택한 장소가 없어요.')).toBeVisible();
    await expect(generateButton(page)).toBeEnabled();

    await generateButton(page).click();

    await expect(page).toHaveURL(/\/generating\/\d+/);
    const [request] = api.callsTo('POST', '/api/travel-plans');
    expect(request.body.required_places).toEqual([]);
  });

  test('WIZ-03 카카오맵 장소 검색 · 추가 · 삭제가 선택 목록에 즉시 반영', { tag: '@P0' }, async ({ page }) => {
    await goToPlacesStep(page);

    await addPlaceFromMap(page, '경복궁');
    await addPlaceFromMap(page, '광장시장');
    await expect(selectedPlaces(page)).toHaveCount(2);
    await expect(selectedPlaces(page).nth(0)).toContainText('경복궁');
    await expect(selectedPlaces(page).nth(1)).toContainText('광장시장');

    await selectedPlaces(page).filter({ hasText: '경복궁' }).getByRole('button', { name: '삭제' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '확인' }).click();

    await expect(selectedPlaces(page)).toHaveCount(1);
    await expect(selectedPlaces(page).first()).toContainText('광장시장');
  });

  test('WIZ-04 1단계 필수값이 모두 입력되기 전에는 "다음" 버튼 비활성화', { tag: '@P1' }, async ({ page }) => {
    await openWizardFromHome(page);
    const next = nextToPreference(page);
    await expect(next).toBeDisabled();

    await selectRegion(page, '서울', '종로구');
    await expect(next).toBeDisabled();

    await pickDate(page, 'start', 10);
    await pickTime(page, 'start', ['10', '00']);
    await expect(next).toBeDisabled();

    await pickDate(page, 'end', 12);
    await pickTime(page, 'end', ['18', '00']);
    await expect(next, '동행 관계 미선택').toBeDisabled();

    await page.getByRole('radio', { name: '친구' }).click();
    await expect(next).toBeEnabled();
  });

  test('WIZ-05 "혼자" 선택 시 인원 1명 고정, 그 외 관계는 2~30명 증감', { tag: '@P2' }, async ({ page }) => {
    await openWizardFromHome(page);
    const count = page.locator('.people-stepper strong');
    const minus = page.getByRole('button', { name: '인원 한 명 줄이기' });
    const plus = page.getByRole('button', { name: '인원 한 명 늘리기' });

    await page.getByRole('radio', { name: '혼자' }).click();
    await expect(count).toHaveText('1명');
    await expect(minus).toBeDisabled();
    await expect(plus).toBeDisabled();

    await page.getByRole('radio', { name: '가족' }).click();
    await expect(count).toHaveText('2명');
    await expect(minus).toBeDisabled();
    await plus.click();
    await plus.click();
    await expect(count).toHaveText('4명');
    await minus.click();
    await expect(count).toHaveText('3명');
  });

  test('WIZ-06 여행 테마는 최대 3개까지 선택되고 카운터가 정확히 갱신', { tag: '@P1' }, async ({ page }) => {
    await page.goto('/create-travel/preference');
    const counter = page.locator('fieldset', { hasText: '여행 테마' }).locator('legend small');
    await expect(counter).toHaveText(/0\s*\/\s*3/);

    for (const theme of ['자연', '미식', '문화']) {
      await page.getByRole('button', { name: theme, exact: true }).click();
    }
    await expect(counter).toHaveText(/3\s*\/\s*3/);
    await expect(page.getByRole('button', { name: '휴식', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: '휴식', exact: true })).toHaveAttribute('aria-pressed', 'false');

    await page.getByRole('button', { name: '미식', exact: true }).click();
    await expect(counter).toHaveText(/2\s*\/\s*3/);
    await expect(page.getByRole('button', { name: '휴식', exact: true })).toBeEnabled();
  });

  test('WIZ-07 작성 도중 홈으로 이탈 후 재진입해도 입력값 유지', { tag: '@P1' }, async ({ page }) => {
    await openWizardFromHome(page);
    await fillBasicInfo(page);
    await nextToPreference(page).click();
    await fillPreference(page, { pace: '알차게', transport: '도보', themes: ['자연', '문화'] });

    // 홈으로 이동 후 다시 "여행 생성하기"
    await page.goto('/home');
    await page.getByRole('button', { name: /여행 생성하기/ }).click();

    await expect(page.locator('.region-field .select-box')).toContainText('서울특별시 종로구');
    await expect(page.locator('.date-select').nth(0)).toContainText('2026.10.10');
    await expect(page.locator('.time-select').nth(0)).toContainText('10:00');
    await expect(page.locator('.date-select').nth(1)).toContainText('2026.10.12');
    await expect(page.locator('.time-select').nth(1)).toContainText('18:00');
    await expect(page.getByRole('radio', { name: '친구' })).toHaveAttribute('aria-checked', 'true');

    await nextToPreference(page).click();
    for (const selected of ['알차게', '도보', '자연', '문화']) {
      await expect(page.getByRole('button', { name: selected, exact: true })).toHaveAttribute('aria-pressed', 'true');
    }
  });
});
