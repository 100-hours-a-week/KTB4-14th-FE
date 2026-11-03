# SSE 알림 동기화 (#158)

## 동작

- SSE를 먼저 연결하고 `open`/`connected`, 재연결, `resync_required` 수신 시 목록과 미읽음 개수를 조회한다. 화면 복귀·온라인 복귀 시에도 갱신한다.
- BE의 `notification`은 새 알림이며, `resync_required`는 DB 상태를 다시 조회하라는 안내다. `sse_connected`, `redis_subscription_ready` 사유를 모두 동일하게 처리한다.
- 목록과 배지를 하나의 계정별 저장소에서 관리한다. `notification_id`로 중복을 제거하며 조회로 복구한 과거 알림은 토스트로 표시하지 않는다.
- 조회 중 실시간 이벤트나 읽음 처리가 발생하면 이전 응답을 버리고 다시 조회한다. 동시 동기화 요청은 병합한다. 목록과 개수의 조회 시점이 달라 결과가 불일치하면 기존 상태를 유지하고 재시도한다.
- 읽음 처리 성공 후 화면을 갱신한다. 전체 읽음 요청 중 도착한 새 알림은 재조회로 서버 상태를 확인한다.
- SSE 오류 시 연결을 닫고 `/api/users/me`로 인증을 확인한다. 인증이 만료됐으면 기존 HTTP 요청과 공유하는 단일 토큰 갱신 요청으로 복구한다. 네트워크·5xx 오류는 로그아웃하지 않고 최대 30초 간격으로 재시도한다.
- 갱신 토큰도 만료된 경우 로그인 화면으로 이동한다. 로그아웃·다른 탭의 계정 변경 시 스트림·예약 작업·조회 요청·중복 처리 상태를 정리하고 이전 계정의 지연 응답을 무시한다.

## API 계약

- `GET /api/notifications/subscribe` — 쿠키 인증 SSE: `connected`, `notification`, `resync_required`. heartbeat comment는 화면 상태를 바꾸지 않는다.
- `GET /api/notifications` — 전체 알림 목록.
- `GET /api/notifications/unread-count` — `{ count: number }`.
- `PATCH /api/notifications/{id}/read`, `POST /api/notifications/read-all` — 기존 읽음 API 유지.

## 자동 검증

- `npx tsc --noEmit`
- `npm run test:e2e:typecheck`
- `npm run build`
- `npx playwright test e2e/notifications e2e/part1-create/05-notification.spec.ts e2e/part1-create/06-session.spec.ts e2e/part2-itinerary/13-session.spec.ts --project=mock --workers=2`

추가 테스트는 실시간 목록 갱신, 중복·읽음 후 재수신, 과거 알림 복구, 재연결, 화면 복귀, 조회와 이벤트 경합, 요청 병합, 인증 갱신·만료·일시 장애, 계정 변경·로그아웃 후 지연 이벤트 차단을 검증한다. SSE/HTTP 응답을 제어한 자동 테스트이며 실제 BE·Redis 장애를 발생시키는 통합 테스트는 아니다.

검증 결과: 신규 19개 통과, 기존 알림·세션 20개 검사 완료. 기존 세션 테스트의 알려진 미구현 항목(`knownGap`) 1개와 다중 기기 정책에 따른 제외 항목 1개는 유지했다. 앱·테스트 타입 검사와 프로덕션 빌드도 통과했다.

## dev 환경에서 남은 확인

- BE A에서 생성 → BE B에 연결된 FE 수신 및 반대 방향.
- 같은 사용자 여러 탭 수신과 관계없는 사용자 미수신.
- 브라우저 연결 중단·재연결, Redis 구독 중단·복구 후 목록·미읽음 개수 일치.
- 실제 인증 쿠키 만료·갱신, 읽음·전체 읽음·알림 클릭 이동.
