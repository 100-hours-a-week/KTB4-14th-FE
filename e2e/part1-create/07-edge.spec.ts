import { test, expect } from '../support/fixtures';
import {
  addPlaceFromMap,
  calendarDay,
  fillBasicInfo,
  fillPreference,
  generateButton,
  goToPlacesStep,
  nextToPlaces,
  nextToPreference,
  openWizardFromHome,
  pickDate,
  pickTime,
  searchPlace,
  selectRegion,
  selectedPlaces,
} from '../support/flows';

/** 7. 경계값 · 검증 */
test.describe('7. 경계값 · 검증', () => {
  test('EDGE-01 출발일이 도착일보다 빠르게 설정되지 않고, 시간 역전 시 유효성 오류 표시', { tag: '@P1' }, async ({ page }) => {
    await openWizardFromHome(page);
    await selectRegion(page, '서울', '종로구');
    await pickDate(page, 'start', 10);

    // 출발일 달력: 도착일(10일) 이전 날짜는 선택 불가
    await page.locator('.date-select').nth(1).click();
    await expect(calendarDay(page, 9)).toBeDisabled();
    await expect(calendarDay(page, 10)).toBeEnabled();
    await calendarDay(page, 10).click();

    // 같은 날 출발 시간이 도착 시간보다 이르면 오류
    await pickTime(page, 'start', ['18', '00']);
    await pickTime(page, 'end', ['10', '00']);
    await page.getByRole('radio', { name: '친구' }).click();

    await expect(page.getByText('여행지 출발 시간은 도착 시간보다 늦어야 해요.')).toBeVisible();
    await expect(nextToPreference(page)).toBeDisabled();
  });

  test('EDGE-02 인원은 최솟값 미만·30명 초과로 변경되지 않음', { tag: '@P2' }, async ({ page }) => {
    await openWizardFromHome(page);
    const count = page.locator('.people-stepper strong');
    const minus = page.getByRole('button', { name: '인원 한 명 줄이기' });
    const plus = page.getByRole('button', { name: '인원 한 명 늘리기' });

    await page.getByRole('radio', { name: '혼자' }).click();
    await expect(count).toHaveText('1명');
    await expect(minus).toBeDisabled();

    await page.getByRole('radio', { name: '친구' }).click();
    await expect(count).toHaveText('2명');
    await expect(minus).toBeDisabled();

    for (let i = 0; i < 28; i += 1) await plus.click();
    await expect(count).toHaveText('30명');
    await expect(plus).toBeDisabled();
  });

  for (const distance of [
    { value: '0', label: '가까운 장소 위주', expected: 0 },
    { value: '100', label: '이동 거리와 관계없이 추천', expected: 100 },
  ]) {
    test(`EDGE-03 비용 0원~300만원 이상 · 이동거리 극단값(${distance.expected})에서도 정상 접수`, { tag: '@P2' }, async ({ page, api }) => {
      test.info().annotations.push({ type: 'BE', description: 'AI 결과가 조건을 반영하는지는 AI/백엔드 평가 대상' });
      await openWizardFromHome(page);
      await fillBasicInfo(page);
      await nextToPreference(page).click();
      await fillPreference(page);

      await page.getByLabel('최소 예산').fill('0');
      await page.getByLabel('최대 예산').fill('3000000');
      await page.getByLabel('이동 거리 선호도').fill(distance.value);
      await expect(page.locator('.range-value-row')).toContainText('0원');
      await expect(page.locator('.range-value-row')).toContainText('300만원 이상');
      await expect(page.locator('.distance-copy')).toHaveText(distance.label);

      await nextToPlaces(page).click();
      await generateButton(page).click();
      await expect(page).toHaveURL(/\/generating\/\d+/);

      const [request] = api.callsTo('POST', '/api/travel-plans');
      expect(request.body.preference).toMatchObject({ budget_min: 0, budget_max: 3_000_000, distance_preference: distance.expected });
    });
  }

  test('EDGE-04 추가 요청사항은 300자에서 차단되고 카운터가 동기화', { tag: '@P2' }, async ({ page }) => {
    await page.goto('/create-travel/preference');
    const textarea = page.getByPlaceholder('원하는 일정 조건을 자유롭게 입력해 주세요.');
    const counter = page.locator('fieldset', { hasText: '추가 요청사항' }).locator('legend small');
    await expect(counter).toHaveText('0/300');

    // 타이핑 입력
    await textarea.fill('가'.repeat(350));
    await expect(textarea).toHaveValue('가'.repeat(300));
    await expect(counter).toHaveText('300/300');

    // 붙여넣기 입력
    await textarea.fill('');
    await textarea.focus();
    await page.keyboard.insertText('나'.repeat(400));
    await expect(textarea).toHaveValue('나'.repeat(300));
    await expect(counter).toHaveText('300/300');
  });

  test('EDGE-05 이미 추가한 장소를 다시 추가해도 선택 목록에 중복 항목이 생기지 않음', { tag: '@P2' }, async ({ page }) => {
    await goToPlacesStep(page);
    await addPlaceFromMap(page, '경복궁');

    await page.getByRole('button', { name: '+ 카카오맵에서 장소 추가' }).click();
    await searchPlace(page, '경복궁');
    await page.locator('.place-row').filter({ hasText: '경복궁' }).first().getByRole('button', { name: '추가' }).click();
    await expect(page.locator('.toast')).toHaveText('이미 필수 장소에 추가된 장소예요.');

    await page.getByRole('button', { name: '뒤로' }).click();
    await expect(selectedPlaces(page)).toHaveCount(1);
  });
});
