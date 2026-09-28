import { expect, type Locator, type Page } from '@playwright/test';

/* ============================================================ 여행 생성 마법사 */

export type BasicInfo = {
  province?: string;
  district?: string;
  startDay?: number;
  endDay?: number;
  startTime?: [string, string];
  endTime?: [string, string];
  companion?: '혼자' | '연인' | '친구' | '가족';
};

export const DEFAULT_BASIC: Required<BasicInfo> = {
  province: '서울',
  district: '종로구',
  startDay: 10,
  endDay: 12,
  startTime: ['10', '00'],
  endTime: ['18', '00'],
  companion: '친구',
};

export type PreferenceInfo = {
  pace?: '여유롭게' | '균형있게' | '알차게';
  transport?: '도보' | '자동차' | '대중교통';
  themes?: Array<'자연' | '미식' | '문화' | '휴식' | 'SNS' | '액티비티'>;
};

export const DEFAULT_PREFERENCE: Required<PreferenceInfo> = {
  pace: '균형있게',
  transport: '대중교통',
  themes: ['미식'],
};

export const nextToPreference = (page: Page) => page.getByRole('button', { name: '다음: 여행 취향' });
export const nextToPlaces = (page: Page) => page.getByRole('button', { name: '다음: 필수 장소' });
export const generateButton = (page: Page) => page.getByRole('button', { name: /AI 여행 생성하기|처리 중/ });

export async function openWizardFromHome(page: Page) {
  await page.goto('/home');
  await page.getByRole('button', { name: /여행 생성하기/ }).click();
  await expect(page).toHaveURL(/\/create-travel$/);
}

export async function selectRegion(page: Page, province: string, district: string) {
  await page.locator('.region-field .select-box').click();
  await page.getByRole('listbox', { name: '시/도 선택' }).getByRole('option', { name: province, exact: true }).click();
  await page
    .getByRole('listbox', { name: `${province} 시/군/구 선택` })
    .getByRole('option', { name: district, exact: true })
    .click();
}

export async function pickDate(page: Page, which: 'start' | 'end', day: number) {
  await page.locator('.date-select').nth(which === 'start' ? 0 : 1).click();
  await page.getByRole('dialog', { name: '날짜 선택' }).getByRole('button', { name: String(day), exact: true }).click();
}

export function calendarDay(page: Page, day: number): Locator {
  return page.getByRole('dialog', { name: '날짜 선택' }).getByRole('button', { name: String(day), exact: true });
}

export async function pickTime(page: Page, which: 'start' | 'end', [hour, minute]: [string, string]) {
  await page.locator('.time-select').nth(which === 'start' ? 0 : 1).click();
  const dialog = page.getByRole('dialog', { name: '시간 선택' });
  await dialog.locator('.time-column').nth(0).getByRole('button', { name: hour, exact: true }).click();
  await dialog.locator('.time-column').nth(1).getByRole('button', { name: minute, exact: true }).click();
  await dialog.getByRole('button', { name: '완료' }).click();
}

export async function fillBasicInfo(page: Page, info: BasicInfo = {}) {
  const v = { ...DEFAULT_BASIC, ...info };
  await selectRegion(page, v.province, v.district);
  await pickDate(page, 'start', v.startDay);
  await pickTime(page, 'start', v.startTime);
  await pickDate(page, 'end', v.endDay);
  await pickTime(page, 'end', v.endTime);
  await page.getByRole('radio', { name: v.companion }).click();
}

export async function fillPreference(page: Page, info: PreferenceInfo = {}) {
  const v = { ...DEFAULT_PREFERENCE, ...info };
  await page.getByRole('button', { name: v.pace, exact: true }).click();
  await page.getByRole('button', { name: v.transport, exact: true }).click();
  for (const theme of v.themes) {
    const button = page.getByRole('button', { name: theme, exact: true });
    // 이미 선택된(이전 입력이 복원된) 테마를 다시 누르면 해제되므로 건너뛴다
    if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click();
  }
}

/** 홈 → 1/3 → 2/3 → 3/3(필수 장소) 화면까지 이동 */
export async function goToPlacesStep(page: Page, basic: BasicInfo = {}, preference: PreferenceInfo = {}) {
  await openWizardFromHome(page);
  await fillBasicInfo(page, basic);
  await nextToPreference(page).click();
  await expect(page).toHaveURL(/\/create-travel\/preference$/);
  await fillPreference(page, preference);
  await nextToPlaces(page).click();
  await expect(page).toHaveURL(/\/create-travel\/places$/);
}

export async function searchPlace(page: Page, keyword: string) {
  await page.getByPlaceholder('장소를 검색해 주세요').fill(keyword);
  await page.getByRole('button', { name: '🔍' }).click();
}

/** 3/3 화면에서 카카오맵 검색으로 장소를 추가하고 다시 3/3 화면으로 돌아온다 */
export async function addPlaceFromMap(page: Page, keyword: string, placeName = keyword) {
  await page.getByRole('button', { name: '+ 카카오맵에서 장소 추가' }).click();
  await expect(page).toHaveURL(/\/create-travel\/map-search/);
  await searchPlace(page, keyword);
  await page.locator('.place-row').filter({ hasText: placeName }).first().getByRole('button', { name: '추가' }).click();
  await expect(page.locator('.toast')).toHaveText('장소가 추가되었습니다.');
  await page.getByRole('button', { name: '뒤로' }).click();
  await expect(page).toHaveURL(/\/create-travel\/places$/);
}

export const selectedPlaces = (page: Page) => page.locator('.scroll .place-row');

/* ============================================================ 여행 일정 확인 */

export const placeRow = (page: Page, name: string) =>
  page.locator('.output-place-row').filter({ has: page.locator('.output-place-heading strong', { hasText: name }) });

/** 장소의 완료 체크 버튼(이동 정보가 있는 장소는 이동 정보를 펼쳐야 버튼이 보인다) */
export async function completionButton(page: Page, name: string) {
  const row = placeRow(page, name);
  await expect(row).toBeVisible();
  const toggle = row.locator('.route-info-toggle');
  if ((await toggle.count()) > 0 && (await toggle.getAttribute('aria-expanded')) === 'false') {
    await toggle.click();
  }
  return row.getByRole('button', { name: /일정 (완료|완료 취소)$/ });
}

export async function toggleCompletion(page: Page, name: string) {
  await (await completionButton(page, name)).click();
}

export const placeTime = (page: Page, name: string) => placeRow(page, name).locator('.output-place-heading span').first();
