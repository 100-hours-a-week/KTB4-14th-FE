import { test, expect, knownGap } from '../support/fixtures';
import { generationScript } from '../support/mock-backend';
import { addPlaceFromMap, generateButton, goToPlacesStep } from '../support/flows';

/**
 * 3. AI 비동기 생성 (요청 · 재시도 · 실패 · 재생성)
 * 생성 상태는 GET /api/ai-generation-jobs/:id 폴링(1초 간격)으로 확인한다.
 * LLM 재시도 "로직 자체"는 백엔드 통합 테스트 대상이고, 여기서는 사용자에게 보이는 결과를 검증한다.
 */
test.describe('3. AI 비동기 생성', () => {
  test('ASY-01 생성 요청 → 진행 상태 확인 → 완료 시 알림과 함께 일정 상세로 이동', { tag: '@P0' }, async ({ page, api }) => {
    await goToPlacesStep(page);
    await addPlaceFromMap(page, '경복궁');
    await generateButton(page).click();

    await expect(page).toHaveURL(/\/generating\/\d+/);
    await expect(page).toHaveURL(/\/output\/\d+\/places$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: '서울 1박 2일 여행' })).toBeVisible();
    // 완료 알림(SSE) 수신 → 알림 뱃지
    await expect(page.getByRole('button', { name: '알림' }).locator('.badge-dot')).toBeVisible();
  });

  test('ASY-02 서버 내부 재시도 후 성공 시 사용자에게는 최종 성공만 노출', { tag: '@P0' }, async ({ page, api }) => {
    test.info().annotations.push({ type: 'BE', description: 'LLM 1회 실패 후 재호출 여부는 백엔드 통합 테스트(WireMock)에서 검증' });
    // 2단계에서 서버가 재시도하느라 상태가 한동안 멈춰 있다가 성공하는 상황
    const { url } = api.createGeneration(
      generationScript(
        { status: 'GENERATING', done: 1 },
        { status: 'GENERATING', done: 1 },
        { status: 'GENERATING', done: 1 },
        { status: 'GENERATING', done: 2 },
        { status: 'COMPLETED', done: 4 },
      ),
    );
    await page.goto(url);

    const failure = page.getByText(/실패/);
    const deadline = Date.now() + 15_000;
    while (!/\/output\//.test(page.url())) {
      expect(await failure.count(), '재시도 과정에서 실패 문구가 노출되면 안 된다').toBe(0);
      if (Date.now() > deadline) throw new Error('생성 완료 화면으로 이동하지 않았습니다.');
      await page.waitForTimeout(200);
    }
    await expect(page).toHaveURL(/\/output\/\d+\/places$/);
    expect(api.callsTo('POST', '/api/travel-plans/:id/regeneration')).toHaveLength(0);
  });

  test('ASY-03 최대 재시도 초과로 최종 실패 시 실패 안내와 재시도 버튼 제공', { tag: '@P0' }, async ({ page, api }) => {
    const { planId, url } = api.createGeneration(
      generationScript({ status: 'GENERATING', done: 0 }, { status: 'FAILED', done: 1 }),
    );
    await page.goto(url);

    await expect(page.getByRole('heading', { name: '최적의 여행을 만드는 데 실패하였습니다.' })).toBeVisible({ timeout: 10_000 });
    const modal = page.getByRole('dialog').filter({ hasText: '일정 생성에 실패했습니다.' });
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: '닫기' }).click();

    await page.getByRole('button', { name: '다시 생성하기' }).click();
    await expect(page).toHaveURL(new RegExp(`/generating/${planId}\\?job_id=\\d+`));
    expect(api.callsTo('POST', `/api/travel-plans/${planId}/regeneration`)).toHaveLength(1);
  });

  test('ASY-04 생성 대기 중 4단계 항목이 순서대로 체크됨', { tag: '@P1' }, async ({ page, api }) => {
    const { url } = api.createGeneration();
    await page.goto(url);

    const steps = page.locator('.step');
    await expect(steps).toHaveCount(4);
    await expect(steps.locator('strong')).toHaveText(['장소·식당 추천', '숙소 위치 계산', '이동 경로 연결', '추천 음악 선정']);

    const snapshots: boolean[][] = [];
    while (!/\/output\//.test(page.url())) {
      const done = await steps.locator('.check').evaluateAll((els) => els.map((el) => el.classList.contains('done'))).catch(() => []);
      if (done.length) snapshots.push(done);
      await page.waitForTimeout(150);
    }

    const doneCounts = snapshots.map((s) => s.filter(Boolean).length);
    for (const snapshot of snapshots) {
      const firstPending = snapshot.indexOf(false);
      const ordered = firstPending === -1 || snapshot.slice(firstPending).every((v) => !v);
      expect(ordered, `앞 단계부터 순서대로 체크되어야 함: ${JSON.stringify(snapshot)}`).toBe(true);
    }
    expect(doneCounts).toEqual([...doneCounts].sort((a, b) => a - b));
    expect(Math.max(...doneCounts)).toBeGreaterThanOrEqual(3);
  });

  test('ASY-05 생성 완료 후 "다시 생성"을 반복하면 매번 독립된 생성 요청으로 처리', { tag: '@P0' }, async ({ page, api }) => {
    api.generation = generationScript({ status: 'COMPLETED', done: 4 });
    await page.goto('/output/77/places');

    const polledJobIds = () =>
      new Set(api.callsTo('GET', '/api/ai-generation-jobs/:id').map((call) => Number(call.path.split('/').pop())));
    const jobsOfPlan = () => [...api.jobs.values()].filter((job) => job.planId === 77).map((job) => job.jobId);

    for (let i = 0; i < 3; i += 1) {
      await page.getByRole('button', { name: '일정 다시 만들기' }).click();
      await page.getByRole('dialog').filter({ hasText: '일정을 다시 만들까요?' }).getByRole('button', { name: '확인' }).click();

      // 새 생성 작업(job)이 만들어지고
      await expect.poll(() => jobsOfPlan().length).toBe(i + 1);
      const newJobId = jobsOfPlan()[i];
      // 생성 화면이 그 작업의 상태를 조회한 뒤(화면이 빨리 지나가도 요청 기록은 남는다)
      await expect.poll(() => polledJobIds().has(newJobId), { message: `job ${newJobId} 상태 조회` }).toBe(true);
      // 완료되어 결과 화면으로 돌아온다
      await expect(page).toHaveURL(/\/output\/77\/places$/, { timeout: 10_000 });
      await expect(page.getByRole('button', { name: '일정 다시 만들기' })).toBeVisible();
    }

    expect(api.callsTo('POST', '/api/travel-plans/77/regeneration')).toHaveLength(3);
    expect(new Set(jobsOfPlan()).size).toBe(3);
  });

  test('ASY-06 "AI 여행 생성하기" 연속 클릭 시 생성 요청은 한 번만 전송', { tag: '@P1' }, async ({ page, api }) => {
    await goToPlacesStep(page);
    // 응답 지연(네트워크 지연 상황)
    api.on('POST', '/api/travel-plans', (req, backend) => ({
      delayMs: 1500,
      status: 201,
      body: { travel_plan_id: 555, generation_job_id: backend.createGeneration().jobId, status: 'GENERATING' },
    }));

    await generateButton(page).dblclick();

    await expect(page).toHaveURL(/\/generating\/555/, { timeout: 10_000 });
    expect(api.callsTo('POST', '/api/travel-plans')).toHaveLength(1);
  });

  test('ASY-07 생성 결과 상세 — 기본정보 · 장소 목록 · 이동 경로 · 추천 음악 표시', { tag: '@P0' }, async ({ page }) => {
    knownGap('normalizeItinerary가 recommended_music을 누락 (api/travels.ts)');
    await page.goto('/output/77/places');

    // 기본 정보
    await expect(page.getByRole('heading', { name: '서울 1박 2일 여행' })).toBeVisible();
    await expect(page.locator('.output-trip-summary')).toContainText('2026.10.01 - 2026.10.02 · 1박 2일');
    // 장소 목록(장소 · 시간)
    await expect(page.locator('.output-place-heading strong')).toHaveText(['경복궁', '광장시장', '북촌한옥마을', '남산서울타워', '명동교자']);
    await expect(page.locator('.output-place-row').first()).toContainText('10:00 - 11:30');
    // 비용(이동 요금)
    await expect(page.locator('.output-place-row').first()).toContainText('1,500원');
    // 추천 음악
    await expect(page.locator('.output-music')).toContainText('여행의 시작');
    // 이동 경로
    await page.getByRole('tab', { name: '이동 경로' }).click();
    await expect(page.locator('.output-route-card')).toHaveCount(3);
    await expect(page.locator('.output-route-card').first()).toContainText('경복궁 → 광장시장');
  });
});
