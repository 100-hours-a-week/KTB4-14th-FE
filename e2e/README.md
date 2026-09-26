# AUDIGO 프론트 E2E 테스트

`E2E 테스트 시나리오` 문서(Part 1 여행 생성 / Part 2 여행 일정 확인)를 Playwright로 옮긴 코드입니다.
시나리오 문서의 테스트 이름 앞의 ID(`WIZ-01`, `ITIN-10` …)가 문서 ID와 1:1로 대응합니다.

## 실행

```bash
npm install
npx playwright install chromium   # 최초 1회

npm run test:e2e          # 전체
npm run test:e2e:p0       # P0(릴리스 게이팅)만
npm run test:e2e:ui       # UI 모드(디버깅)
npx playwright test -g "WIZ-0"   # ID로 골라 실행
npx playwright show-report       # 결과 리포트
```

Vite 개발 서버(5174 포트)는 Playwright가 E2E 전용 환경변수로 자동 실행합니다. `.env`는 사용하지 않습니다.

## 구조

```
e2e/
├── support/
│   ├── env.ts             # 포트, 가짜 API 주소, 기준 시각(2026-10-01 09:00 KST)
│   ├── fixtures.ts        # test/expect, 로그인 상태 주입, 목 백엔드 자동 연결
│   ├── mock-backend.ts    # 상태를 가진 가짜 백엔드(page.route 가로채기)
│   ├── data.ts            # 응답 데이터 팩토리(사용자·장소·일정·알림)
│   ├── kakao-sdk-stub.ts  # 카카오 지도 SDK 대역(마커·경로선 생성 횟수 기록)
│   └── flows.ts           # 화면 조작 헬퍼(마법사 입력, 완료 체크 등)
├── part1-create/          # 1~8절: 인증, 마법사, 비동기 생성, 카카오맵, 알림, 세션, 경계값, 동시성
└── part2-itinerary/       # 9~14절: 홈, 일정 보기, 완료 체크, 여행 종료, 세션, 오프라인
```

## 방식

- **백엔드 없이 실행**: 앱은 `VITE_USE_MOCK=false`로 실제 API 호출 경로를 타고, 모든 요청은 `mock-backend.ts`가 응답합니다. 장애·지연·401은 테스트마다 `api.on()` / `api.once()`로 만듭니다.
  ```ts
  api.once('GET', '/api/travel-plans/upcoming', { status: 401, body: { message: 'unauthorized' } });
  api.on('GET', '/api/places/search', { delayMs: 30_000 });
  expect(api.callsTo('POST', '/api/travel-plans')).toHaveLength(1);
  ```
- **카카오 로그인**: `kauth.kakao.com` 요청을 가로채서 곧바로 `/auth/kakao?code=...`로 리다이렉트합니다. 로그인된 상태가 필요한 테스트는 `localStorage.audigo.user`를 주입합니다.
- **시간 고정**: `page.clock.setFixedTime`으로 기준 시각을 고정합니다. 바꾸려면 `test.use({ now: '2026-10-02T13:20:00+09:00' })`처럼 지정합니다.
- **태그**: `@P0` `@P1` `@P2`는 우선순위, `@BE`는 백엔드 테스트로 넘긴 항목(skip)입니다.

## 백엔드 테스트로 넘긴 시나리오 (skip)

EXT-05(검색 캐시), SESS-05(다중 기기 세션), CONC-01(서버 멱등성), CONC-03(DB 저장 재시도), ITIN-09(누락 데이터 미저장), ITIN-19(자동 종료 스케줄러)는 목 백엔드로 검증할 수 없어서 skip 처리했습니다.

## 현재 실패하는 시나리오 (프론트 구현 필요)

작성 시점(`test/e2e-playwright` 브랜치) 기준으로 문서의 예상 결과와 현재 구현이 달라 실패하는 항목입니다.

| ID | 실패 원인 |
| --- | --- |
| AUTH-04, AUTH-06 | 보호 경로 가드가 없어 미로그인 상태로 `/home`, `/create-travel`에 접근됨 |
| SESS-03 | 리프레시 실패(401) 시 로그인 화면으로 이동하지 않음 |
| ASY-07, ITIN-08 | `normalizeItinerary`가 `recommended_music`을 버려서 추천 음악이 표시되지 않음 |
| EXT-01 | 검색 결과가 없을 때 안내 문구 없음 |
| EXT-02 | 1글자 검색어 최소 글자 수 검증 없음 |
| EXT-03 | 장소 검색 요청 타임아웃 없음(응답이 올 때까지 무한 대기) |
| EXT-04 | 502 응답 시 "백엔드의 카카오 REST 키…" 개발자용 문구가 사용자에게 노출됨 |
| NOTI-03 | 읽은 알림의 투명도 60% 스타일 없음 |
| ITIN-01 | 홈 카드에 "진행 중" 표시와 진행률(완료/전체 장소 수)이 없음 — 백엔드 응답 필드 합의 필요 |
| ITIN-14 | 실시간 대중교통 조회 실패(`realtime: false`) 시 토스트 안내 없음 |
| ITIN-22 | 오프라인일 때 토스트 대신 "일정을 불러오지 못했어요" 빈 화면이 표시됨 |

구현을 고치면 해당 테스트가 통과하는지로 완료를 확인하면 됩니다. 문서 기준이 바뀌면 테스트의 예상값을 같이 수정하세요.
