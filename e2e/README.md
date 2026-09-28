# AUDIGO 프론트 E2E 테스트

`E2E 테스트 시나리오` 문서(Part 1 여행 생성 / Part 2 여행 일정 확인)를 Playwright로 옮긴 코드입니다.
테스트 이름 앞의 ID(`WIZ-01`, `ITIN-10` …)가 문서 ID와 1:1로 대응합니다.

## 처음 한 번

```bash
npm install
npx playwright install chromium    # 테스트용 브라우저 설치
```

Vite 개발 서버(5174 포트)는 Playwright가 E2E 전용 환경변수로 자동 실행합니다. `.env`는 사용하지 않고, live 설정은 `.env.e2e`에서 읽습니다.

## 스위트

| 스위트 | 위치 | API 응답 | 용도 |
| --- | --- | --- | --- |
| mock | `part1-create/`, `part2-itinerary/` | `mock-backend.ts` 목데이터 | 예외 · 경계값 · 미구현 시나리오(고정 데이터로 정확한 값 검증) |
| live | `live/` | **실제 백엔드** | 정상 흐름이 실제 백엔드에서 동작하는지 확인. 401 · 5xx 같은 예외만 `api.once()`로 끼워 넣음 |

## 명령어

### npm 스크립트

| 명령어 | 하는 일 |
| --- | --- |
| `npm run test:e2e` | mock 스위트 전체 |
| `npm run test:e2e:p0` | mock 스위트 중 `@P0`(릴리스 게이팅)만 |
| `npm run test:e2e:live` | live 스위트 전체(세션 주입 → live 테스트) |
| `npm run test:e2e:live:session` | 세션 주입만 실행 — 쿠키가 유효한지 빠르게 확인 |
| `npm run test:e2e:ui` | UI 모드(테스트를 골라 실행 · 단계별 디버깅) |
| `npm run test:e2e:typecheck` | e2e 코드 타입 검사 |

npm 스크립트 뒤에 Playwright 옵션을 붙이려면 `--` 다음에 적습니다.

```bash
npm run test:e2e -- -g "WIZ-01"
npm run test:e2e:live -- -g "LIVE-ITIN-09"
```

### 골라서 실행하기

`--project`로 스위트를 고르고, `-g`(이름) · 파일 경로 · `파일:줄`로 테스트를 좁힙니다.

```bash
# 테스트 ID 하나 (-g 는 테스트 이름에 포함된 문자열로 거른다)
npx playwright test --project=mock -g "WIZ-01"
npx playwright test --project=live -g "LIVE-ITIN-09"

# 여러 ID (정규식)
npx playwright test --project=live -g "LIVE-ITIN-09|LIVE-ITIN-19"

# 같은 접두사 전부 (WIZ-01 ~ WIZ-09)
npx playwright test --project=mock -g "WIZ-0"

# 파일 하나
npx playwright test --project=live e2e/live/04-backend-rules.spec.ts

# 파일의 특정 테스트(테스트가 시작하는 줄 번호)
npx playwright test --project=live e2e/live/04-backend-rules.spec.ts:35

# 태그
npx playwright test --project=mock --grep @P0
npx playwright test --project=mock --grep-invert @P2    # P2 제외

# 실행하지 않고 어떤 테스트가 선택되는지만 보기
npx playwright test --project=live -g "LIVE-ITIN" --list
```

- live 테스트는 어떻게 골라도 세션 주입(`live-setup`)이 먼저 자동으로 실행됩니다.
- `-g`로 좁히면 실제 여행을 생성하는 테스트(LIVE-ASY-01, LIVE-CONC-01)는 선택하지 않는 한 돌지 않습니다.

### 디버깅 · 결과 확인

```bash
# 브라우저 창을 띄워서 실행
npx playwright test --project=live -g "LIVE-ITIN-01" --headed

# 한 단계씩 멈추면서 실행(Playwright Inspector)
npx playwright test --project=mock -g "WIZ-01" --debug

# UI 모드에서 live 만 보기
npx playwright test --project=live --ui

# 마지막 실행 리포트(HTML) 열기
npx playwright show-report

# 실패한 테스트의 trace 열기(네트워크 · 콘솔 · 스크린샷)
npx playwright show-trace test-results/<테스트 폴더>/trace.zip

# 직전 실행에서 실패한 테스트만 다시
npx playwright test --project=live --last-failed
```

## 실제 백엔드 연동 (live 스위트)

### 1. `.env.e2e` 만들기

```bash
cp .env.e2e.example .env.e2e
```

| 변수 | 필수 | 설명 |
| --- | --- | --- |
| `E2E_API_BASE_URL` | ✅ | 실제 백엔드 주소(끝에 `/` 없이). 비어 있으면 live 스위트는 목록에서 빠지고 mock 만 돈다. 예: `https://api.audigo.kr`, `http://localhost:8080` |
| `E2E_AUTH_COOKIES` | ✅ | 주입할 백엔드 인증 쿠키. 아래 "2. 세션 쿠키 넣기" 참고 |
| `E2E_AUTH_COOKIES_PREV` | | LIVE-SESS-05(단일 기기 정책)용 — **먼저** 로그인한 기기의 쿠키. 비우면 해당 테스트만 skip |
| `E2E_LIVE_GENERATE` | | `true`면 실제 여행 생성 테스트(LIVE-ASY-01, LIVE-CONC-01)를 실행. LLM 호출 · DB 저장이 발생 |
| `E2E_GENERATION_TIMEOUT_MS` | | 실제 AI 생성 대기 시간(**밀리초**, 기본 `180000`). 생성이 30초 걸리면 `60000` 이상 권장 |
| `E2E_PORT` | | E2E 용 Vite 개발 서버 포트(기본 `5174`) |

### 2. 세션 쿠키 넣기

카카오 2단계 인증 때문에 로그인은 자동화하지 않고, 직접 로그인한 브라우저의 백엔드 인증 쿠키를 넣습니다.

1. 브라우저에서 같은 백엔드를 쓰는 앱에 카카오 로그인합니다(운영이면 `https://audigo.kr`, 로컬이면 `npm run dev`).
2. 개발자 도구 → **Application → Cookies → 백엔드 도메인**에서 `audigo_refresh_token`의 **Value**를 복사합니다.
   (또는 Network → 백엔드 API 요청 → Request Headers의 `cookie` 값을 통째로 복사)
3. `.env.e2e`에 **쿠키 이름=값** 형태로 넣습니다.
   ```
   E2E_AUTH_COOKIES="audigo_refresh_token=AUDIGO_REFRESH_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   ```
   - 쿠키 이름은 `audigo_refresh_token` / `audigo_access_token`입니다(`refresh_token` 아님).
   - 리프레시 토큰만 넣어도 됩니다. 첫 요청에서 `/users/refresh`로 액세스 토큰을 받습니다.
4. **복사한 브라우저의 AUDIGO 탭을 닫습니다.** 열어 두면 브라우저가 먼저 재발급해서 복사한 토큰이 무효가 됩니다(RTR).
5. 확인합니다.
   ```bash
   npm run test:e2e:live:session
   # [live] 세션 준비 완료(.env.e2e 쿠키) — <닉네임>  이 나오면 성공
   ```

검증된 세션은 `e2e/.auth/live-user.json`(git 제외)에 저장되고, 재발급으로 바뀐 토큰도 매 테스트 후 이 파일에 갱신됩니다. 다음 실행부터는 이 파일을 먼저 쓰므로 쿠키를 다시 복사할 필요가 없습니다. 이 파일을 지우거나 리프레시 토큰이 만료(14일)되면 쿠키를 새로 복사하세요.

### 3. (선택) LIVE-SESS-05 — 단일 기기 정책

한 계정은 한 기기만 로그인할 수 있습니다(유저당 리프레시 토큰 1개). 이전 기기 세션이 실제로 끊기는지 확인하려면:

1. 브라우저 A에서 로그인 → 쿠키를 `E2E_AUTH_COOKIES_PREV`에 넣기
2. 시크릿 창에서 **같은 계정으로 다시 로그인** → 쿠키를 `E2E_AUTH_COOKIES`에 넣기
3. 두 창의 AUDIGO 탭 닫기

순서가 반대면 `E2E_AUTH_COOKIES`가 무효가 되어 live 스위트 전체가 실패합니다.

### 4. 실행

```bash
npm run test:e2e:live                              # 전체
npm run test:e2e:live -- -g "LIVE-ITIN-09"         # 하나만
npx playwright test --project=live e2e/live/01-session.spec.ts   # 파일 하나
```

실행 전에 5174 포트에 떠 있는 개발 서버가 있으면 끄세요. Playwright가 그 서버를 재사용하는데, 백엔드 프록시가 없는 서버일 수 있습니다.

```bash
lsof -ti tcp:5174 | xargs kill    # 5174 포트 서버 종료
```

### live 테스트 목록

| 파일 | ID | 내용 | 실행 조건 |
| --- | --- | --- | --- |
| `01-session` | LIVE-AUTH-01 | 주입한 세션으로 인증 후 홈에 닉네임 표시 | |
| | LIVE-AUTH-02 | 마이페이지에서 실제 내 정보 조회 | |
| | LIVE-SESS-01 | 액세스 토큰 만료(401) 시 실제 재발급 후 원래 요청 재시도 | |
| `02-browse` | LIVE-HOME-01 | 홈에서 다음 여행 · 최근 여행 표시 | |
| | LIVE-TRIP-01 | 여행 기록 목록이 백엔드 응답과 일치 | |
| | LIVE-ITIN-01 | 생성된 여행의 일정 · 이동 경로 표시 | 여행이 있을 때 |
| | LIVE-ITIN-02 | 일정 조회 중 토큰 만료돼도 재발급 후 일정 표시 | 여행이 있을 때 |
| | LIVE-NOTI-01 | 알림함이 백엔드 알림 목록과 일치 | |
| `03-create` | LIVE-WIZ-01 | 지역 목록 · 카카오 장소 검색 후 필수 장소 추가 | |
| | LIVE-EXT-01 | 장소 검색 5xx 시 기존 장소 유지 | |
| | LIVE-ASY-01 | 여행 생성 → 실제 AI 생성 완료 → 일정 상세 | `E2E_LIVE_GENERATE=true` |
| `04-backend-rules` | LIVE-EXT-05 | 동일 검색어 반복 조회 시 응답 속도 개선(캐시) | |
| | LIVE-ITIN-09 | 저장된 일정(최대 5개)에 좌표 · 시간 없는 장소가 없음 | 완료된 여행이 있을 때 |
| | LIVE-ITIN-19 | 종료일이 지난 여행이 "다음 여행"으로 남지 않음 | 지난 여행이 있을 때 |
| | LIVE-CONC-01 | 같은 생성 요청을 동시에 2번 보내도 여행 1개만 생성 | `E2E_LIVE_GENERATE=true` |
| `05-single-device` | LIVE-SESS-05 | 새 기기 로그인 후 이전 기기 재발급 401, 현재 기기 유지 | `E2E_AUTH_COOKIES_PREV` |

### 동작 방식

- **CORS 설정 불필요**: 앱은 `http://localhost:5174/__backend/*`로 요청하고, Vite 개발 서버가 `E2E_API_BASE_URL`로 넘깁니다(`vite.config.ts`). 넘길 때 `Origin` 헤더를 지워서 백엔드 CORS 검사를 거치지 않습니다.
- **쿠키**: 백엔드 쿠키는 프록시를 거쳐 `localhost`에 저장됩니다. http에서도 동작하도록 프록시가 `Domain` · `Secure` · `SameSite=None`을 떼어 냅니다.
- **RTR(Refresh Token Rotation)**: 한 번 쓴 리프레시 토큰은 다시 쓸 수 없습니다. live 스위트는 재발급이 겹치지 않도록 워커 1개로 순서대로 실행하고, 테스트마다 최신 쿠키를 세션 파일에 저장합니다.
- **인증 실패 응답**: 백엔드는 액세스 토큰이 없거나 만료되면 401이 아니라 **403**을 줍니다(`SecurityConfig`에 `AuthenticationEntryPoint` 없음). 테스트 헬퍼는 401 · 403 모두 재발급 대상으로 봅니다.

### 문제 해결

| 증상 | 원인 · 해결 |
| --- | --- |
| `세션 주입 실패 … 401` | 토큰이 무효(이미 재발급됨 · 재로그인함 · 만료). 브라우저에서 최신 쿠키를 다시 복사하고 탭을 닫은 뒤 재실행 |
| 백엔드 응답 `refresh_token_required`(400) | 쿠키 이름이 틀림. `audigo_refresh_token=...`인지 확인 |
| 백엔드 응답 `refresh_token_not_found`(401) | 값이 틀림(쿠키 이름을 값 자리에 넣었거나 잘림). 값은 `AUDIGO_REFRESH_` + UUID, 51자 |
| `ECONNREFUSED` | `E2E_API_BASE_URL`의 백엔드가 꺼져 있음 |
| 브라우저 콘솔에 `blocked by CORS policy` | 5174 포트에 프록시 없는 서버가 떠 있어 재사용됨. 서버를 끄고 재실행 |
| LIVE-ASY-01 생성 대기 타임아웃 | `E2E_GENERATION_TIMEOUT_MS`가 밀리초 단위인지 확인(30초 생성이면 `60000` 이상) |
| 어디서 멈췄는지 모르겠음 | `npx playwright show-trace test-results/<폴더>/trace.zip`로 네트워크 · 콘솔 확인 |

## 구조

```
e2e/
├── support/
│   ├── env.ts             # 포트, API 주소(.env.e2e), 기준 시각(2026-10-01 09:00 KST)
│   ├── fixtures.ts        # [mock] test/expect, 로그인 상태 주입, 목 백엔드 자동 연결
│   ├── live-fixtures.ts   # [live] test/expect, 실제 백엔드 패스스루 + 예외 주입, 세션 저장
│   ├── live-session.ts    # [live] 세션 파일 읽기/쓰기, 백엔드 직접 요청
│   ├── live-flows.ts      # [live] 실제 응답 대기 헬퍼
│   ├── mock-backend.ts    # 상태를 가진 가짜 백엔드(page.route 가로채기, passthrough 옵션)
│   ├── data.ts            # 응답 데이터 팩토리(사용자·장소·일정·알림)
│   ├── kakao-sdk-stub.ts  # 카카오 지도 SDK 대역(마커·경로선 생성 횟수 기록)
│   └── flows.ts           # 화면 조작 헬퍼(마법사 입력, 완료 체크 등)
├── part1-create/          # 1~8절: 인증, 마법사, 비동기 생성, 카카오맵, 알림, 세션, 경계값, 동시성
├── part2-itinerary/       # 9~14절: 홈, 일정 보기, 완료 체크, 여행 종료, 세션, 오프라인
└── live/                  # 실제 백엔드: 세션 주입(auth.setup.ts), 인증·세션, 조회, 여행 생성, 백엔드 규칙, 단일 기기 세션
```

## 방식

- **mock — 백엔드 없이 실행**: 앱은 `VITE_USE_MOCK=false`로 실제 API 호출 경로를 타고, 모든 요청은 `mock-backend.ts`가 응답합니다. 장애·지연·401은 테스트마다 `api.on()` / `api.once()`로 만듭니다.
  ```ts
  api.once('GET', '/api/travel-plans/upcoming', { status: 401, body: { message: 'unauthorized' } });
  api.on('GET', '/api/places/search', { delayMs: 30_000 });
  expect(api.callsTo('POST', '/api/travel-plans')).toHaveLength(1);
  ```
- **카카오 로그인**: `kauth.kakao.com` 요청을 가로채서 곧바로 `/auth/kakao?code=...`로 리다이렉트합니다. 로그인된 상태가 필요한 테스트는 `localStorage.audigo.user`를 주입합니다.
- **시간 고정**: `page.clock.setFixedTime`으로 기준 시각을 고정합니다. 바꾸려면 `test.use({ now: '2026-10-02T13:20:00+09:00' })`처럼 지정합니다.
- **태그**: `@P0` `@P1` `@P2`는 우선순위, `@BE`는 백엔드 테스트로 넘긴 항목(skip)입니다.

## 백엔드 테스트로 넘긴 시나리오 (skip)

아래 시나리오는 목 백엔드로 검증할 수 없어서 mock 스위트에서는 skip 하고, 가능한 것은 live 스위트에서 실제 백엔드로 검증합니다.

| mock (skip) | live | 검증 방법 |
| --- | --- | --- |
| EXT-05 검색 캐시 | LIVE-EXT-05 | 같은 검색어 반복 조회 응답 시간 비교(첫 조회 > 반복 조회 중앙값) |
| SESS-05 다중 기기 세션 | LIVE-SESS-05 | 정책이 단일 기기라 반대로 검증: 새 기기 로그인 후 이전 기기 재발급이 401 인지, 현재 기기 세션은 유지되는지 |
| CONC-01 서버 멱등성 | LIVE-CONC-01 | 앱이 만든 생성 요청 body 를 동시에 2번 전송 → 여행 1개만 생성(`E2E_LIVE_GENERATE=true`) |
| ITIN-09 누락 데이터 미저장 | LIVE-ITIN-09 | 저장된 일정(최대 5개)의 모든 장소에 좌표·시간이 있는지 |
| ITIN-19 자동 종료 | LIVE-ITIN-19 | 종료일이 지난 여행이 다음 여행(upcoming)으로 남지 않는지(스케줄러 실행 시점은 미검증) |
| CONC-03 DB 저장 재시도 | — | 백엔드 내부 장애 주입이 필요 → 백엔드 통합 테스트 |

LIVE-SESS-05 는 이전 기기 쿠키(`E2E_AUTH_COOKIES_PREV`)가 있을 때만 실행됩니다.

## 프론트 미구현 시나리오 (`knownGap`)

문서의 예상 결과와 현재 구현이 달라 실패하는 테스트는 테스트 첫 줄에 `knownGap('사유')`를 붙여 **예상된 실패**로 처리했습니다. 전체 실행은 초록색으로 끝나서 CI를 막지 않습니다.

- 기능을 구현하면 해당 테스트가 "예상과 달리 통과"로 실패합니다. 그때 `knownGap(...)` 줄을 지우면 됩니다.
- 리포트에서 `미구현:` 주석으로 목록을 확인할 수 있습니다.

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

문서 기준이 바뀌면 테스트의 예상값을 같이 수정하세요.
