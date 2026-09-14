# AUDIGO API 연결 가이드

백엔드가 도메인 단위로 API를 붙이고, 프론트가 명세 차이에 맞춰 부분 수정할 때 보는 문서입니다.

현재 프론트는 **React + Vite 웹앱**입니다. (React Native / Expo 아님)
클릭 이벤트는 DOM `onClick` 으로 처리합니다.

- API 명세: https://docs.google.com/spreadsheets/d/1TzLjPrQyFacu3QHNvTs71D12u_Yt2-N8eZ9KSzThijs
- ERD: https://www.erdcloud.com/d/SSauy2XBMtMhpHnNf
- 프론트 루트: `AUDIGO-FE/`

지금 화면은 **목 데이터**로 동작합니다. DB에 저장되지 않습니다.

실행:

```bash
cd AUDIGO-FE
npm install
npm run dev
```

개발 서버는 `http://localhost:5173` 입니다. 배포 산출물은 `npm run build` 로 `dist/` 에 만들어집니다.

---

## 1. 연결 전에 공통으로 할 일

### 백엔드

1. 해당 도메인 API를 명세와 맞춘다.
2. 응답은 `{ "message": string, "data": T }` 형태를 기본으로 한다. (`204`는 body 없음)
3. 인증이 필요한 API는 `Authorization: Bearer {access_token}` 을 받는다.
4. URL / 필드명이 프론트와 다르면 **프론트에 알려서** `src/api/*.ts` 와 `src/types/index.ts` 를 고친다. 화면 파일부터 고치지 않는다.

### 프론트

1. `AUDIGO-FE/.env` 를 만든다. 예시는 `.env.example`.

```
VITE_API_BASE_URL=http://localhost:8080
VITE_USE_MOCK=false
VITE_KAKAO_REST_KEY=
VITE_KAKAO_REDIRECT_URI=http://localhost:5173/auth/kakao
```

2. 도메인이 아직 없으면 `VITE_USE_MOCK=true` 를 유지해도 된다. 지금은 전역 스위치다.
3. 경로·필드가 명세와 다르면 아래 파일을 고친다.

| 무엇을 고치나 | 파일 |
| --- | --- |
| URL, method, body | `src/api/{도메인}.ts` |
| 공통 fetch, 401 재발급 | `src/api/client.ts` |
| 타입 / 필드명 | `src/types/index.ts` |
| 목 데이터 | `src/mocks/data.ts` |
| 화면 표시만 | `src/pages/` 해당 화면 |
| 스타일 | `src/styles/` |

원칙: **화면은 API 함수만 호출**한다. 백엔드 연동은 `src/api/` 에서 끝낸다.

---

## 2. 폴더 구조

```
AUDIGO-FE/
  index.html                  엔트리 HTML
  src/main.tsx                React 엔트리
  src/App.tsx                 라우터
  src/styles/                 CSS (tokens → reset → layout → components → pages)
  src/pages/                  화면
  src/components/             공통 UI
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
  src/storage/index.ts        토큰 localStorage 저장
  src/context/AuthContext.tsx 로그인 세션
  src/mocks/data.ts           목 데이터
```

각 API 함수는 이런 형태다.

```ts
async getMe() {
  if (USE_MOCK) return { ...mockMyPage };
  return apiRequest<MyPage>('/api/users/me');
}
```

`VITE_USE_MOCK=false` 이면 `apiRequest` 가 `VITE_API_BASE_URL` 로 나간다.

---

## 3. 도메인별 연결표

사용자 도메인 URL은 명세에 있는 값을 그대로 썼다.  
여행 / 알림 / 매칭 / 채팅 URL은 명세 시트와 다를 수 있다. **백엔드가 최종 URL을 정하면 프론트 `src/api/` 경로만 맞추면 된다.**

### 3-1. 인증 / 사용자

| 기능 | Method | URL | 프론트 함수 | 화면 |
| --- | --- | --- | --- | --- |
| 카카오 로그인 | POST | `/users/login` | `authApi.loginWithKakao` | `src/pages/LoginPage.tsx`, `KakaoCallbackPage.tsx` |
| 토큰 재발급 | POST | `/users/refresh` | `authApi.refresh` + `client.ts` | 공통 (401 시 자동) |
| 로그아웃 | POST | `/users/logout` | `authApi.logout` | `src/pages/MyPage.tsx` |
| 내 정보 | GET | `/api/users/me` | `usersApi.getMe` | `src/pages/MyPage.tsx` |
| 닉네임 수정 | PATCH | `/api/users/me/nickname` | `usersApi.updateNickname` | `src/pages/MyPage.tsx` |
| 약관 조회 | GET | `/api/policies/latest?policy_type=` | `policiesApi.getLatest` | `src/pages/PoliciesPage.tsx` |

로그인 body:

```json
{ "provider": "KAKAO", "authorization_code": "카카오_인증_코드" }
```

Refresh Token은 현재 `localStorage`에 둔다. HttpOnly Cookie로 바꾸면 `src/storage/index.ts` 와 `src/api/client.ts` 를 수정한다.

카카오 실연동: `src/pages/LoginPage.tsx` — `VITE_KAKAO_REST_KEY` 가 없으면 목 로그인.

### 3-2. 여행

| 기능 | Method | URL | 프론트 함수 | 화면 |
| --- | --- | --- | --- | --- |
| 다음 여행 | GET | `/api/travel-plans/upcoming` | `travelsApi.getUpcoming` | `src/pages/HomePage.tsx` |
| 최근 여행 | GET | `/api/travel-plans/recent` | `travelsApi.getRecent` | `src/pages/HomePage.tsx` |
| 내 여행 기록 | GET | `/api/travel-plans/me` | `travelsApi.getMyTrips` | `src/pages/MyTripsPage.tsx` |
| 여행 생성 | POST | `/api/travel-plans` | `travelsApi.create` | `src/pages/PlacesPage.tsx` |
| 생성 상태 | GET | `/api/travel-plans/:id/status` | `travelsApi.getStatus` | `src/pages/GeneratingPage.tsx` |
| 여행 상세 | GET | `/api/travel-plans/:id` | `travelsApi.getDetail` | `src/pages/ItineraryPage.tsx` |
| 일정 재생성 | POST | `/api/travel-plans/:id/regenerate` | `travelsApi.regenerate` | `ItineraryPage`, `GeneratingPage` |
| 여행 삭제 | DELETE | `/api/travel-plans/:id` | `travelsApi.remove` | (화면 미연결) |

생성 직후 `data`에 `travel_plan_id` 가 있어야 생성 중 화면으로 이동한다.  
상태 `COMPLETED` 이면 `GeneratingPage` 가 상세로 이동한다. 폴링 약 0.8초.

여행 조건 임시값은 `src/context/TravelDraftContext.tsx` + localStorage.

### 3-3. 장소

| 기능 | Method | URL | 프론트 함수 | 화면 |
| --- | --- | --- | --- | --- |
| 장소 검색 | GET | `/api/places/search?query=` | `placesApi.search` | `src/pages/MapSearchPage.tsx` |
| 일정 장소 변경 | PATCH | `/api/itinerary-items/:id/place` | `placesApi.changePlace` | `MapSearchPage` (`replaceItemId`) |

카카오맵 SDK는 아직 없다. 지도는 미리보기 UI다.

### 3-4. 체크리스트

| 기능 | Method | URL | 프론트 함수 | 화면 |
| --- | --- | --- | --- | --- |
| 생성 | POST | `/api/travel-plans/:id/checklists` | `checklistsApi.generate` | `src/pages/ChecklistPage.tsx` |
| 조회 | GET | `/api/travel-plans/:id/checklists` | `checklistsApi.getByPlan` | 같은 화면 |
| 항목 추가 | POST | `/api/checklists/:id/items` | `checklistsApi.addItem` | 같은 화면 |
| 항목 수정 | PATCH | `/api/checklist-items/:id` | `checklistsApi.updateItem` | 같은 화면 |
| 항목 삭제 | DELETE | `/api/checklist-items/:id` | `checklistsApi.removeItem` | 같은 화면 |

필드명은 `is_checked`.

### 3-5. 여행 영상

| 기능 | Method | URL | 프론트 함수 | 화면 |
| --- | --- | --- | --- | --- |
| 생성 요청 | POST | `/api/travel-plans/:id/videos` | `videosApi.generate` | `src/pages/VideoPage.tsx` |
| 조회 | GET | `/api/travel-plans/:id/videos` | `videosApi.getByPlan` | 같은 화면 |
| 재생성 | POST | `/api/videos/:id/regenerate` | `videosApi.regenerate` | 같은 화면 |

필드: `status`, `video_url`, `thumbnail_url`, `error_message`

### 3-6. 알림

| 기능 | Method | URL | 프론트 함수 | 화면 |
| --- | --- | --- | --- | --- |
| 목록 | GET | `/api/notifications` | `notificationsApi.list` | `src/pages/NotificationsPage.tsx` |
| 안 읽은 개수 | GET | `/api/notifications/unread-count` | `notificationsApi.unreadCount` | `src/pages/HomePage.tsx` |
| 단건 읽음 | PATCH | `/api/notifications/:id/read` | `notificationsApi.markRead` | `NotificationsPage` |
| 모두 읽음 | POST | `/api/notifications/read-all` | `notificationsApi.markAllRead` | `NotificationsPage` |
| 설정 조회 | GET | `/api/notification-settings` | `notificationsApi.getSettings` | `src/pages/NotificationSettingsPage.tsx` |
| 설정 수정 | PATCH | `/api/notification-settings` | `notificationsApi.updateSettings` | 같은 화면 |

### 3-7. 매칭 / 채팅

`src/pages/ComingSoonPages.tsx` 의 매칭·채팅 탭은 **서비스 준비중입니다** 만 보여 준다.

매칭 설정만 통로가 있다: `src/pages/MatchingSettingsPage.tsx` → `matchingApi` (`src/api/notifications.ts` 하단)

채팅 목록 통로: `chatApi.listRooms` → `GET /chat/rooms`

---

## 4. 화면 → API

| 화면 파일 | 호출하는 API |
| --- | --- |
| `src/pages/LoginPage.tsx` | `authApi.loginWithKakao` |
| `src/pages/KakaoCallbackPage.tsx` | `authApi.loginWithKakao` |
| `src/pages/HomePage.tsx` | `travelsApi.getUpcoming`, `getRecent`, `notificationsApi.unreadCount` |
| `src/pages/ComingSoonPages.tsx` | 없음 (준비중) |
| `src/pages/MyPage.tsx` | `usersApi.getMe`, `updateNickname`, `authApi.logout` |
| `src/pages/CreateTravelPage.tsx` | 없음 (로컬 draft) |
| `src/pages/PreferencePage.tsx` | 없음 (로컬 draft) |
| `src/pages/PlacesPage.tsx` | `travelsApi.create` |
| `src/pages/MapSearchPage.tsx` | `placesApi.search`, `changePlace` |
| `src/pages/GeneratingPage.tsx` | `travelsApi.getStatus`, `regenerate` |
| `src/pages/ItineraryPage.tsx` | `travelsApi.getDetail`, `regenerate` |
| `src/pages/ChecklistPage.tsx` | `checklistsApi.*` |
| `src/pages/VideoPage.tsx` | `videosApi.*` |
| `src/pages/NotificationsPage.tsx` | `notificationsApi.list / markRead / markAllRead` |
| `src/pages/MyTripsPage.tsx` | `travelsApi.getMyTrips` |
| `src/pages/MatchingSettingsPage.tsx` | `matchingApi.*` |
| `src/pages/NotificationSettingsPage.tsx` | `notificationsApi.getSettings / updateSettings` |
| `src/pages/PoliciesPage.tsx` | `policiesApi.getLatest` |

---

## 5. 프론트에 나중에 넣을 검증 (지금은 주석)

`TODO(backend-guard)` 를 실제 분기로 바꾸면 된다.

| 파일 | 내용 |
| --- | --- |
| `src/pages/CreateTravelPage.tsx` | 목적지/동행/기간/이동수단 없으면 다음 단계 차단 |
| `src/pages/PreferencePage.tsx` | 스타일/지역/식사 미선택 시 다음 단계 차단 |
| `src/pages/PlacesPage.tsx` | 필수값 비어도 생성 요청을 막지 않음 |
| `src/pages/MyPage.tsx` | 닉네임 길이/중복/금칙어 |
| `src/pages/LoginPage.tsx` | 카카오 REST KEY 목 로그인 |
| `src/storage/index.ts` | Refresh Token 로컬 저장. Cookie 확정 시 제거 |

---

## 6. 도메인 붙이는 순서 예시

1. 백엔드 API 확인
2. `.env` 의 `VITE_USE_MOCK=false`
3. 로그인 → 마이페이지 닉네임 변경이 DB에 반영되는지 확인
4. 응답 필드가 다르면 `src/api/*.ts`, `src/types/index.ts` 만 수정

한 도메인만 먼저 붙이려면 해당 `src/api/{도메인}.ts` 의 `if (USE_MOCK)` 만 잠시 끄면 된다.

---

## 7. 응답 약속

`src/api/client.ts` 는 성공 시 `data` 만 화면으로 넘긴다.

```json
{ "message": "my_page_found", "data": { "...": "..." } }
```

에러는 `{ "message": "..." }` 와 HTTP status. `ApiError` 가 이 `message` 를 담는다.
401 이면 `/users/refresh` 후 한 번 재시도한다.
