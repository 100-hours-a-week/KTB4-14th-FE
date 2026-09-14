import type {
  AppNotification,
  Checklist,
  MatchingSettings,
  MyPage,
  NotificationSettings,
  PlaceCandidate,
  Policy,
  TravelDetail,
  TravelSummary,
  TravelVideo,
} from '@/types';

export const mockUser = {
  user_id: 1,
  nickname: '송월',
  profile_image_url: null as string | null,
  is_new_user: false,
};

export const mockMyPage: MyPage = {
  nickname: '송월',
  profile_image: null,
  provider: 'KAKAO',
  completed_travel_count: 8,
  upcoming_travel_count: 3,
};

export const mockPolicies: Record<string, Policy> = {
  TERMS_OF_SERVICE: {
    policy_id: 1,
    policy_type: 'TERMS_OF_SERVICE',
    title: '이용약관',
    content:
      'AUDIGO 서비스 이용약관입니다.\n\n1. 서비스는 AI 여행 일정 생성, 경로 추천, 체크리스트와 여행 영상을 제공합니다.\n2. 생성된 일정은 참고용이며, 실제 영업시간/교통 상황은 달라질 수 있습니다.\n3. 회원은 카카오 계정으로 로그인하며, AUDIGO가 발급한 토큰으로 API를 이용합니다.',
    version: '1.0',
    effective_date: '2026-09-01',
  },
  PRIVACY_POLICY: {
    policy_id: 2,
    policy_type: 'PRIVACY_POLICY',
    title: '개인정보 처리방침',
    content:
      'AUDIGO는 카카오 로그인 식별값, 닉네임, 여행 조건, 알림 설정만 필요한 범위에서 처리합니다.\n프로필 이미지와 장소 검색 결과는 화면 표시 및 일정 구성 목적으로만 사용됩니다.',
    version: '1.0',
    effective_date: '2026-09-01',
  },
};

export const mockPlaces: PlaceCandidate[] = [
  {
    provider: 'KAKAO',
    provider_place_id: 'kakao-seongsan',
    name: '성산일출봉',
    address: '제주특별자치도 서귀포시 성산읍 일출로 284-12',
    latitude: 33.458,
    longitude: 126.942,
    category: '관광명소',
  },
  {
    provider: 'KAKAO',
    provider_place_id: 'kakao-seopjikoji',
    name: '섭지코지',
    address: '제주특별자치도 서귀포시 성산읍 섭지코지로 107',
    latitude: 33.424,
    longitude: 126.93,
    category: '관광명소',
  },
  {
    provider: 'KAKAO',
    provider_place_id: 'kakao-hamdeok',
    name: '함덕해수욕장',
    address: '제주특별자치도 제주시 조천읍 함덕리',
    latitude: 33.543,
    longitude: 126.669,
    category: '해수욕장',
  },
  {
    provider: 'KAKAO',
    provider_place_id: 'kakao-hallasan',
    name: '한라산 국립공원',
    address: '제주특별자치도 제주시 1100로',
    latitude: 33.361,
    longitude: 126.529,
    category: '자연',
  },
  {
    provider: 'KAKAO',
    provider_place_id: 'kakao-blackpork',
    name: '올레 흑돼지',
    address: '제주특별자치도 제주시 연동',
    latitude: 33.489,
    longitude: 126.498,
    category: '음식점',
  },
];

export const mockUpcoming: TravelSummary = {
  travel_plan_id: 101,
  title: '제주, 우리 둘의 여름',
  destination: '제주',
  start_date: '2026-09-18',
  end_date: '2026-09-20',
  status: 'COMPLETED',
  companion_label: '연인',
  cover_color: '#E85D4C',
};

export const mockRecent: TravelSummary[] = [
  {
    travel_plan_id: 88,
    title: '부산 주말 여행',
    destination: '부산',
    start_date: '2026-08-04',
    end_date: '2026-08-05',
    status: 'COMPLETED',
    companion_label: '친구 3명',
    cover_color: '#2A9D8F',
  },
  {
    travel_plan_id: 76,
    title: '강릉 바다 산책',
    destination: '강릉',
    start_date: '2026-06-12',
    end_date: '2026-06-14',
    status: 'COMPLETED',
    companion_label: '혼자',
    cover_color: '#4C6EF5',
  },
];

export const mockMyTrips: TravelSummary[] = [mockUpcoming, ...mockRecent];

export const mockTravelDetail: TravelDetail = {
  ...mockUpcoming,
  nights: 2,
  days: 3,
  itinerary_days: [
    {
      itinerary_day_id: 1,
      day_number: 1,
      date: '2026-09-18',
      items: [
        {
          itinerary_item_id: 11,
          type: 'PLACE',
          name: '성산일출봉',
          address: '서귀포시 성산읍',
          start_time: '10:00',
          stay_minutes: 90,
          latitude: 33.458,
          longitude: 126.942,
        },
        {
          itinerary_item_id: 12,
          type: 'ROUTE',
          duration_minutes: 15,
          distance_km: 4.2,
          transport: 'CAR',
        },
        {
          itinerary_item_id: 13,
          type: 'PLACE',
          name: '섭지코지',
          address: '서귀포시 성산읍',
          start_time: '12:00',
          stay_minutes: 70,
          latitude: 33.424,
          longitude: 126.93,
        },
        {
          itinerary_item_id: 14,
          type: 'ROUTE',
          duration_minutes: 20,
          distance_km: 8.1,
          transport: 'CAR',
        },
        {
          itinerary_item_id: 15,
          type: 'PLACE',
          name: '성산포 해녀촌',
          address: '서귀포시 성산읍',
          start_time: '14:00',
          stay_minutes: 80,
          latitude: 33.47,
          longitude: 126.933,
        },
      ],
    },
    {
      itinerary_day_id: 2,
      day_number: 2,
      date: '2026-09-19',
      items: [
        {
          itinerary_item_id: 21,
          type: 'PLACE',
          name: '함덕해수욕장',
          address: '제주시 조천읍',
          start_time: '11:00',
          stay_minutes: 120,
          latitude: 33.543,
          longitude: 126.669,
        },
        {
          itinerary_item_id: 22,
          type: 'ROUTE',
          duration_minutes: 35,
          distance_km: 18.4,
          transport: 'CAR',
        },
        {
          itinerary_item_id: 23,
          type: 'PLACE',
          name: '동문재래시장',
          address: '제주시 일도일동',
          start_time: '15:30',
          stay_minutes: 90,
          latitude: 33.512,
          longitude: 126.528,
        },
      ],
    },
    {
      itinerary_day_id: 3,
      day_number: 3,
      date: '2026-09-20',
      items: [
        {
          itinerary_item_id: 31,
          type: 'PLACE',
          name: '카페 베르광',
          address: '제주시 애월읍',
          start_time: '10:30',
          stay_minutes: 60,
          latitude: 33.462,
          longitude: 126.31,
        },
        {
          itinerary_item_id: 32,
          type: 'ROUTE',
          duration_minutes: 40,
          distance_km: 22.0,
          transport: 'CAR',
        },
        {
          itinerary_item_id: 33,
          type: 'PLACE',
          name: '제주국제공항',
          address: '제주시 공항로',
          start_time: '13:00',
          stay_minutes: 40,
          latitude: 33.511,
          longitude: 126.492,
        },
      ],
    },
  ],
  recommended_music: [
    { track_id: 1, title: '여름날의 해안도로', artist: 'AUDIGO Mix' },
    { track_id: 2, title: 'Slow Drive to Seongsan', artist: 'Coastal Notes' },
  ],
};

export const mockBusanDetail: TravelDetail = {
  travel_plan_id: 88,
  title: '부산 주말 여행',
  destination: '부산',
  start_date: '2026-08-04',
  end_date: '2026-08-05',
  status: 'COMPLETED',
  companion_label: '친구 3명',
  cover_color: '#2A9D8F',
  nights: 1,
  days: 2,
  itinerary_days: [
    {
      itinerary_day_id: 81,
      day_number: 1,
      date: '2026-08-04',
      items: [
        {
          itinerary_item_id: 811,
          type: 'PLACE',
          name: '광안리 해수욕장',
          address: '부산 수영구',
          start_time: '14:00',
          stay_minutes: 90,
        },
        {
          itinerary_item_id: 812,
          type: 'ROUTE',
          duration_minutes: 18,
          distance_km: 6.4,
          transport: 'PUBLIC',
        },
        {
          itinerary_item_id: 813,
          type: 'PLACE',
          name: '국제시장',
          address: '부산 중구',
          start_time: '16:30',
          stay_minutes: 80,
        },
      ],
    },
    {
      itinerary_day_id: 82,
      day_number: 2,
      date: '2026-08-05',
      items: [
        {
          itinerary_item_id: 821,
          type: 'PLACE',
          name: '해운대 블루라인',
          address: '부산 해운대구',
          start_time: '10:00',
          stay_minutes: 100,
        },
      ],
    },
  ],
  recommended_music: [{ track_id: 3, title: 'Harbor Lights', artist: 'Night Sea' }],
};

export const mockChecklist: Checklist = {
  checklist_id: 1,
  travel_plan_id: 101,
  status: 'COMPLETED',
  items: [
    { checklist_item_id: 1, content: '렌터카 예약 확인', is_checked: true, sort_order: 1 },
    { checklist_item_id: 2, content: '선크림 / 모자', is_checked: false, sort_order: 2 },
    { checklist_item_id: 3, content: '충전 케이블', is_checked: false, sort_order: 3 },
    { checklist_item_id: 4, content: '해녀촌 대기 줄 확인', is_checked: false, sort_order: 4 },
  ],
};

export const mockVideo: TravelVideo = {
  video_id: 1,
  travel_plan_id: 101,
  status: 'COMPLETED',
  video_url: 'https://example.com/videos/jeju-summer.mp4',
  thumbnail_url: null,
  error_message: null,
};

export const mockNotifications: AppNotification[] = [
  {
    notification_id: 1,
    type: 'TRAVEL_READY',
    title: '여행 추천 완료',
    body: '제주 2박 3일 일정이 완성됐어요.',
    is_read: false,
    created_at: '2026-09-14T09:12:00',
    travel_plan_id: 101,
  },
  {
    notification_id: 2,
    type: 'NEW_CHAT',
    title: '새 채팅',
    body: '한지승이 메시지를 보냈어요.',
    is_read: false,
    created_at: '2026-09-13T18:40:00',
  },
  {
    notification_id: 3,
    type: 'TRAVEL_D1',
    title: '여행 D-1',
    body: '내일 제주 여행이 시작됩니다.',
    is_read: true,
    created_at: '2026-09-17T08:00:00',
    travel_plan_id: 101,
  },
  {
    notification_id: 4,
    type: 'TRAVEL_FAILED',
    title: '여행 일정 생성 실패',
    body: '제주 2박 3일 일정 생성이 실패했어요.',
    is_read: true,
    created_at: '2026-09-10T21:20:00',
  },
];

export const mockNotificationSettings: NotificationSettings = {
  travel_ready: true,
  new_chat: true,
  travel_d1: true,
  travel_failed: true,
};

export const mockMatchingSettings: MatchingSettings = {
  enabled: false,
  style: 'BALANCED',
  region_preference: 'NATURE',
  companion: 'FRIEND',
};

export const destinations = [
  '제주',
  '부산',
  '서울',
  '강릉',
  '여수',
  '경주',
  '전주',
  '속초',
  '인천',
  '대구',
];
