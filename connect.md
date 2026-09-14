# AUDIGO API 연결 가이드

백엔드가 도메인 단위로 API를 붙이고, 프론트가 명세 차이에 맞춰 부분 수정할 때 보는 문서입니다.

- API 명세: https://docs.google.com/spreadsheets/d/1TzLjPrQyFacu3QHNvTs71D12u_Yt2-N8eZ9KSzThijs
- ERD: https://www.erdcloud.com/d/SSauy2XBMtMhpHnNf
- 프론트 루트: `frontend/`

지금 화면은 **목 데이터**로 동작합니다. DB에 저장되지 않습니다.

---

## 1. 연결 전에 공통으로 할 일

### 백엔드

1. 해당 도메인 API를 명세와 맞춘다.
2. 응답은 `{ "message": string, "data": T }` 형태를 기본으로 한다. (`204`는 body 없음)
3. 인증이 필요한 API는 `Authorization: Bearer {access_token}` 을 받는다.
4. URL / 필드명이 프론트와 다르면 **프론트에 알려서** `src/api/*.ts` 와 `src/types/index.ts` 를 고친다. 화면 파일부터 고치지 않는다.

### 프론트

1. `frontend/.env` 를 만든다.

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
EXPO_PUBLIC_USE_MOCK=false
EXPO_PUBLIC_KAKAO_REST_KEY=
EXPO_PUBLIC_KAKAO_REDIRECT_URI=
```

2. 도메인이 아직 없으면 `USE_MOCK=true` 를 유지해도 된다. 목/실서버 분기는 **API 함수 단위**라서, 다른 도메인은 목으로 두고 한 도메인만 실서버로 바꾸는 건 현재 구조에선 통째 스위치다.
3. 경로·필드가 명세와 다르면 아래 파일을 고친다.

| 무엇을 고치나 | 파일 |
| --- | --- |
| URL, method, body | `src/api/{도메인}.ts` |
| 공통 fetch, 401 재발급 | `src/api/client.ts` |
| 타입 / 필드명 | `src/types/index.ts` |
| 목 데이터 | `src/mocks/data.ts` |
| 화면 표시만 | `app/` 해당 화면 |

원칙: **화면은 API 함수만 호출**한다. 백엔드 연동은 `src/api/` 에서 끝낸다.

---

## 2. 파일 한눈에 보기

```
frontend/
  src/api/client.ts           공통 fetch, Bearer, refresh
  src/api/auth.ts             로그인 / 토큰 / 로그아웃
  src/api/users.ts            마이페이지 내 정보, 닉네임
  src/api/policies.ts         이용약관 / 개인정보
  src/api/travels.ts          여행 생성·조회·상태·재생성
  src/api/places.ts           장소 검색, 일정 장소 변경
  src/api/checklists.ts       체크리스트
  src/api/videos.ts           여행 영상
  src/api/notifications.ts    알림 + 매칭 설정
  src/api/chat.ts             채팅 (화면은 준비중)
  src/types/index.ts          요청/응답 타입
  src/storage/index.ts        토큰 로컬 저장
  src/context/AuthContext.tsx 로그인 세션
  src/mocks/data.ts           목 데이터
```

각 API 함수는 이런 형태다.

```ts
async getMe() {
  if (USE_MOCK) return { ...mockMyPage };   // 지금 동작
  return apiRequest<MyPage>('/api/users/me'); // 실서버 연결
}
```

`USE_MOCK=false` 가 되면 `if (USE_MOCK)` 아래는 쓰이지 않고 `apiRequest` 가 `EXPO_PUBLIC_API_BASE_URL` 로 나간다.

---

## 3. 도메인별 연결표

사용자 도메인 URL은 명세에 있는 값을 그대로 썼다.  
여행 / 알림 / 매칭 / 채팅 URL은 명세 시트와 다를 수 있다. **백엔드가 최종 URL을 정하면 프론트 `src/api/` 경로만 맞추면 된다.**

### 3-1. 인증 / 사용자

| 기능 | Method | 프론트가 호출하는 URL | 프론트 함수 | 화면 |
| --- | --- | --- | --- | --- |
| 카카오 로그인 | POST | `/users/login` | `authApi.loginWithKakao` | `app/login.tsx`, `app/auth/kakao.tsx` |
| 토큰 재발급 | POST | `/users/refresh` | `authApi.refresh` + `client.ts` | 공통 (401 시 자동) |
| 로그아웃 | POST | `/users/logout` | `authApi.logout` | `app/(tabs)/my.tsx` |
| 내 정보 | GET | `/api/users/me` | `usersApi.getMe` | `app/(tabs)/my.tsx` |
| 닉네임 수정 | PATCH | `/api/users/me/nickname` | `usersApi.updateNickname` | `app/(tabs)/my.tsx` |
| 약관 조회 | GET | `/api/policies/latest?policy_type=` | `policiesApi.getLatest` | `app/policies.tsx` |

로그인 body:

```json
{ "provider": "KAKAO", "authorization_code": "카카오_인증_코드" }
```

로그인 성공 시 프론트가 쓰는 `data`:

- `access_token`, `refresh_token`, `token_type`, `access_token_expires_in`, `refresh_token_expires_in`
- `user.user_id`, `user.nickname`, `user.profile_image_url`, `user.is_new_user`

닉네임 수정 body: `{ "nickname": "송월" }`

약관 `policy_type`: `TERMS_OF_SERVICE` | `PRIVACY_POLICY`

**백엔드가 할 일**

- `/users/login` 이 `authorization_code` 로 AUDIGO 토큰을 발급한다. 카카오 access token은 프론트가 보관하지 않는다.
- Refresh Token을 HttpOnly Cookie 로 바꿀 계획이면 `src/storage/index.ts` 의 `TODO(auth)` 와 `client.ts` 를 프론트가 수정해야 한다. 지금은 AsyncStorage에 저장한다.

**프론트가 고칠 곳 (카카오 실연동)**

- `app/login.tsx` — `EXPO_PUBLIC_KAKAO_REST_KEY` 가 없으면 목 코드로 로그인한다.
- `src/context/AuthContext.tsx` — 세션 저장 방식.

---

### 3-2. 여행

| 기능 | Method | 프론트가 호출하는 URL | 프론트 함수 | 화면 |
| --- | --- | --- | --- | --- |
| 다음 여행 | GET | `/api/travel-plans/upcoming` | `travelsApi.getUpcoming` | `app/(tabs)/index.tsx` |
| 최근 여행 | GET | `/api/travel-plans/recent` | `travelsApi.getRecent` | `app/(tabs)/index.tsx` |
| 내 여행 기록 | GET | `/api/travel-plans/me` | `travelsApi.getMyTrips` | `app/my-trips.tsx` |
| 여행 생성 | POST | `/api/travel-plans` | `travelsApi.create` | `app/create-travel/places.tsx` |
| 생성 상태 | GET | `/api/travel-plans/:id/status` | `travelsApi.getStatus` | `app/generating/[id].tsx` |
| 여행 상세 | GET | `/api/travel-plans/:id` | `travelsApi.getDetail` | `app/itinerary/[id].tsx` |
| 일정 재생성 | POST | `/api/travel-plans/:id/regenerate` | `travelsApi.regenerate` | `app/itinerary/[id].tsx`, `app/generating/[id].tsx` |
| 여행 삭제 | DELETE | `/api/travel-plans/:id` | `travelsApi.remove` | (화면 미연결, 함수만 있음) |

생성 요청 body 타입: `CreateTravelPlanRequest` (`src/types/index.ts`)

```json
{
  "destination": "제주",
  "companion": "COUPLE",
  "start_datetime": "2026-09-18T10:00:00",
  "end_datetime": "2026-09-20T18:00:00",
  "transport": "CAR",
  "preference": {
    "style": "BALANCED",
    "region_preference": "NATURE",
    "food_preferences": ["KOREAN"],
    "activity_level": 45,
    "pace": "NORMAL",
    "extra_request": ""
  },
  "required_places": [
    {
      "provider": "KAKAO",
      "provider_place_id": "kakao-seongsan",
      "name": "성산일출봉",
      "address": "제주특별자치도 서귀포시 ...",
      "latitude": 33.458,
      "longitude": 126.942
    }
  ]
}
```

생성 직후 프론트가 기대하는 `data`: `{ "travel_plan_id": number, "status": "GENERATING" }`

상태 조회 `status`: `GENERATING` | `COMPLETED` | `FAILED`  
`COMPLETED` 가 오면 `app/generating/[id].tsx` 가 상세 화면으로 이동한다. 폴링 간격은 약 0.8초.

여행 조건 임시값은 생성 API 호출 전까지 `src/context/TravelDraftContext.tsx` + AsyncStorage 에만 있다.

**백엔드가 할 일**

- 생성 응답에 `travel_plan_id` 를 꼭 넣는다. 없으면 생성 중 화면으로 못 간다.
- 상세 응답에 일차(`itinerary_days`), 장소명, 시간, 이동 구간이 있어야 추천 경로 화면이 채워진다.
- URL이 `/api/trips` 처럼 다르면 `src/api/travels.ts` 만 수정한다.

---

### 3-3. 장소

| 기능 | Method | 프론트가 호출하는 URL | 프론트 함수 | 화면 |
| --- | --- | --- | --- | --- |
| 장소 검색 | GET | `/api/places/search?query=` | `placesApi.search` | `app/create-travel/map-search.tsx` |
| 일정 장소 변경 | PATCH | `/api/itinerary-items/:id/place` | `placesApi.changePlace` | `app/create-travel/map-search.tsx` (`replaceItemId`) |

검색 결과 필드: `provider`, `provider_place_id`, `name`, `address`, `latitude`, `longitude`

카카오맵 SDK는 아직 붙이지 않았다. 지도는 미리보기 UI다. SDK 연동 시 `app/create-travel/map-search.tsx` 를 고친다. 검색 API 중계는 백엔드 `GET /api/places/search` 를 쓰는 쪽으로 맞춰 두었다.

---

### 3-4. 체크리스트

| 기능 | Method | 프론트가 호출하는 URL | 프론트 함수 | 화면 |
| --- | --- | --- | --- | --- |
| 생성 | POST | `/api/travel-plans/:id/checklists` | `checklistsApi.generate` | `app/checklist/[id].tsx` |
| 조회 | GET | `/api/travel-plans/:id/checklists` | `checklistsApi.getByPlan` | `app/checklist/[id].tsx` |
| 항목 추가 | POST | `/api/checklists/:id/items` | `checklistsApi.addItem` | 같은 화면 |
| 항목 수정 | PATCH | `/api/checklist-items/:id` | `checklistsApi.updateItem` | 같은 화면 (체크/내용) |
| 항목 삭제 | DELETE | `/api/checklist-items/:id` | `checklistsApi.removeItem` | 같은 화면 |

프론트 필드명은 `is_checked` 다. 명세가 `is_completed` 면 `src/types/index.ts` 와 `src/api/checklists.ts` 를 맞춘다.

---

### 3-5. 여행 영상

| 기능 | Method | 프론트가 호출하는 URL | 프론트 함수 | 화면 |
| --- | --- | --- | --- | --- |
| 생성 요청 | POST | `/api/travel-plans/:id/videos` | `videosApi.generate` | `app/video/[id].tsx` |
| 조회 | GET | `/api/travel-plans/:id/videos` | `videosApi.getByPlan` | `app/video/[id].tsx` |
| 재생성 | POST | `/api/videos/:id/regenerate` | `videosApi.regenerate` | `app/video/[id].tsx` |

프론트가 쓰는 필드: `status`, `video_url`, `thumbnail_url`, `error_message`  
`status` 는 여행과 같이 `GENERATING` | `COMPLETED` | `FAILED`.

---

### 3-6. 알림

| 기능 | Method | 프론트가 호출하는 URL | 프론트 함수 | 화면 |
| --- | --- | --- | --- | --- |
| 목록 | GET | `/api/notifications` | `notificationsApi.list` | `app/notifications.tsx` |
| 안 읽은 개수 | GET | `/api/notifications/unread-count` | `notificationsApi.unreadCount` | `app/(tabs)/index.tsx` (벨 뱃지) |
| 단건 읽음 | PATCH | `/api/notifications/:id/read` | `notificationsApi.markRead` | `app/notifications.tsx` |
| 모두 읽음 | POST | `/api/notifications/read-all` | `notificationsApi.markAllRead` | `app/notifications.tsx` |
| 설정 조회 | GET | `/api/notification-settings` | `notificationsApi.getSettings` | `app/notification-settings.tsx` |
| 설정 수정 | PATCH | `/api/notification-settings` | `notificationsApi.updateSettings` | `app/notification-settings.tsx` |

알림 타입: `TRAVEL_READY` | `NEW_CHAT` | `TRAVEL_D1` | `TRAVEL_FAILED`  
설정 키: `travel_ready`, `new_chat`, `travel_d1`, `travel_failed`

명세 enum / cursor 페이징이 확정되면 `src/api/notifications.ts` 와 `src/types/index.ts` 만 수정하면 된다.

---

### 3-7. 매칭

탭 `app/(tabs)/matching.tsx` 는 **서비스 준비중입니다** 만 보여 준다. 목록/매칭 실행 API는 화면과 연결하지 않았다.

마이페이지의 매칭 설정만 통로가 있다.

| 기능 | Method | 프론트가 호출하는 URL | 프론트 함수 | 화면 |
| --- | --- | --- | --- | --- |
| 설정 조회 | GET | `/api/matching/settings` | `matchingApi.getSettings` | `app/matching-settings.tsx` |
| 설정 수정 | PATCH | `/api/matching/settings` | `matchingApi.updateSettings` | `app/matching-settings.tsx` |

함수 위치는 `src/api/notifications.ts` 하단이다. 매칭 도메인을 분리하려면 `src/api/matching.ts` 로 옮기고 `src/api/index.ts` 만 바꾸면 된다.

---

### 3-8. 채팅

탭 `app/(tabs)/chat.tsx` 는 **서비스 준비중입니다** 만 보여 준다.

미리 만들어 둔 통로:

| 기능 | Method | 프론트가 호출하는 URL | 프론트 함수 | 화면 |
| --- | --- | --- | --- | --- |
| 채팅방 목록 | GET | `/chat/rooms?chat_name=&cursor_time=&cursor_id=&size=` | `chatApi.listRooms` | 아직 없음 |

채팅 화면을 열 때 `app/(tabs)/chat.tsx` 를 교체하고 `chatApi` 를 연결하면 된다.

---

## 4. 화면 → API 찾기

| 화면 파일 | 호출하는 API |
| --- | --- |
| `app/login.tsx` | `authApi.loginWithKakao` |
| `app/auth/kakao.tsx` | `authApi.loginWithKakao` |
| `app/(tabs)/index.tsx` | `travelsApi.getUpcoming`, `getRecent`, `notificationsApi.unreadCount` |
| `app/(tabs)/matching.tsx` | 없음 (준비중) |
| `app/(tabs)/chat.tsx` | 없음 (준비중) |
| `app/(tabs)/my.tsx` | `usersApi.getMe`, `updateNickname`, `authApi.logout` |
| `app/create-travel/index.tsx` | 없음 (로컬 draft) |
| `app/create-travel/preference.tsx` | 없음 (로컬 draft) |
| `app/create-travel/places.tsx` | `travelsApi.create` |
| `app/create-travel/map-search.tsx` | `placesApi.search`, `changePlace` |
| `app/generating/[id].tsx` | `travelsApi.getStatus`, `regenerate` |
| `app/itinerary/[id].tsx` | `travelsApi.getDetail`, `regenerate` |
| `app/checklist/[id].tsx` | `checklistsApi.*` |
| `app/video/[id].tsx` | `videosApi.*` |
| `app/notifications.tsx` | `notificationsApi.list / markRead / markAllRead` |
| `app/my-trips.tsx` | `travelsApi.getMyTrips` |
| `app/matching-settings.tsx` | `matchingApi.*` |
| `app/notification-settings.tsx` | `notificationsApi.getSettings / updateSettings` |
| `app/policies.tsx` | `policiesApi.getLatest` |

---

## 5. 프론트에 나중에 넣을 검증 (지금은 주석)

페이지를 막지 말라는 요청대로, 아래는 막아 두지 않았다. 백엔드 검증이 준비되면 프론트도 같은 파일을 열어 `TODO(backend-guard)` 를 실제 분기로 바꾸면 된다.

| 파일 | 내용 |
| --- | --- |
| `app/create-travel/index.tsx` | 목적지/동행/기간/이동수단 없으면 다음 단계 차단 |
| `app/create-travel/preference.tsx` | 스타일/지역/식사 미선택 시 다음 단계 차단 |
| `app/create-travel/places.tsx` | 필수값 비어도 생성 요청을 막지 않음 |
| `app/(tabs)/my.tsx` | 닉네임 길이/중복/금칙어 |

인증 관련:

| 파일 | 내용 |
| --- | --- |
| `app/login.tsx` | 카카오 REST KEY 목 로그인 |
| `src/storage/index.ts` | Refresh Token 로컬 저장. Cookie 확정 시 제거 |

---

## 6. 도메인 붙이는 순서 예시

사용자 도메인을 붙일 때:

1. 백엔드 `/users/login`, `/users/refresh`, `/users/logout`, `/api/users/me`, `/api/users/me/nickname` 확인
2. 프론트 `.env` 의 `EXPO_PUBLIC_USE_MOCK=false`
3. 로그인 → 마이페이지 닉네임 변경이 DB에 반영되는지 확인
4. 응답 필드가 다르면 `src/api/auth.ts`, `src/api/users.ts`, `src/types/index.ts` 만 수정

여행 도메인을 붙일 때:

1. 생성 응답에 `travel_plan_id` 있는지 확인
2. `src/api/travels.ts` URL을 명세와 일치시킴
3. 홈 카드 / 생성 중 폴링 / 상세 일정 순으로 확인

한 도메인만 먼저 붙이고 나머지는 목이 필요하면, `src/api/{도메인}.ts` 에서 해당 함수의 `if (USE_MOCK)` 를 잠시 끄거나 함수별로 플래그를 나누면 된다. 지금은 전역 `USE_MOCK` 하나다.

---

## 7. 응답 약속

`src/api/client.ts` 는 성공 시 `data` 만 화면으로 넘긴다.

```json
{ "message": "my_page_found", "data": { "...": "..." } }
```

에러는 `{ "message": "..." }` 와 HTTP status 로 받는다. 프론트 `ApiError` 가 이 `message` 를 담는다.

토큰이 없으면 `Authorization` 헤더를 안 붙인다. 401 이면 `/users/refresh` 후 한 번 재시도하고, 실패하면 요청이 실패한다. 로그인 화면으로 보내는 처리는 아직 화면 가드로 넣지 않았다.
