import { test, expect } from '../support/fixtures';
import { generateButton, goToPlacesStep } from '../support/flows';

/** 8. 동시성 · 멱등성 */
test.describe('8. 동시성 · 멱등성', () => {
  test.skip('CONC-01 동일 요청 재전송 시 서버가 단일 요청으로만 처리', { tag: ['@P0', '@BE'] }, async () => {
    // 서버측 중복 감지(멱등성 키/락)는 백엔드 통합 테스트에서 동일 요청 2회 전송으로 검증.
    // 클라이언트측 연속 클릭 방지는 ASY-06 에서 검증.
  });

  test('CONC-02 생성 요청 직후 앱 종료 → 재진입 시 진행 상태를 이어서 확인, 중복 생성 버튼 미노출', { tag: '@P0' }, async ({ page, context, api }) => {
    await goToPlacesStep(page);
    await generateButton(page).click();
    await expect(page).toHaveURL(/\/generating\/\d+\?job_id=\d+/);
    const generatingUrl = page.url();

    // 앱(탭) 강제 종료 후 재실행
    await page.close();
    const reopened = await context.newPage();
    await api.attach(reopened);
    await reopened.goto(generatingUrl);

    await expect(reopened.locator('.step')).toHaveCount(4);
    await expect(reopened.getByRole('heading', { name: '최적의 여행을 만드는 중입니다' })).toBeVisible();
    await expect(reopened.getByRole('button', { name: 'AI 여행 생성하기' })).toHaveCount(0);
    expect(api.callsTo('POST', '/api/travel-plans')).toHaveLength(1);
  });

  test.skip('CONC-03 LLM 성공 직후 DB 저장 실패 시 LLM 재호출 없이 저장만 재시도', { tag: ['@P1', '@BE'] }, async () => {
    // 저장 단계 장애 주입은 백엔드 통합 테스트(Testcontainers + 장애 주입)에서만 가능.
  });

  test('CONC-04 같은 계정으로 두 탭에서 동시에 생성하면 두 번째 요청은 거절', { tag: '@P2' }, async ({ page, context, api }) => {
    api.blockConcurrentGeneration = true;

    // 탭 A: 3/3 단계까지 입력
    await goToPlacesStep(page);

    // 탭 B: 다른 조건으로 3/3 단계까지 입력
    const tabB = await context.newPage();
    await api.attach(tabB);
    await goToPlacesStep(tabB, { district: '강남구', companion: '가족' });

    await generateButton(page).click();
    await expect(page).toHaveURL(/\/generating\/\d+/);

    await generateButton(tabB).click();
    await expect(tabB.locator('.toast')).toBeVisible();
    await expect(tabB).toHaveURL(/\/create-travel\/places$/);

    expect(api.callsTo('POST', '/api/travel-plans')).toHaveLength(2);
    expect([...api.jobs.values()]).toHaveLength(1);
  });
});
