export type ApiEnvelope<T> = {
  message: string;
  data: T;
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  access_token_expires_in: number;
  refresh_token_expires_in: number;
};

export type AuthUser = {
  user_id: number;
  nickname: string;
  profile_image_url: string | null;
  is_new_user: boolean;
};

export type MyPage = {
  nickname: string;
  profile_image: string | null;
  provider: 'KAKAO';
  completed_travel_count: number;
  upcoming_travel_count: number;
};

export type PolicyType = 'TERMS_OF_SERVICE' | 'PRIVACY_POLICY';

export type Policy = {
  policy_id: number;
  policy_type: PolicyType;
  title: string;
  content: string;
  version: string;
  effective_date: string;
};

export type CompanionType = 'SOLO' | 'FRIEND' | 'COUPLE' | 'FAMILY';
export type TransportType = 'PUBLIC' | 'CAR' | 'WALK' | 'ETC';
export type TripStyle = 'RELAXED' | 'BALANCED' | 'PACKED';
export type RegionPreference = 'HOTPLACE' | 'NATURE' | 'LOCAL';
export type FoodPreference = 'KOREAN' | 'JAPANESE' | 'CHINESE' | 'WESTERN' | 'ANY';
export type TripPace = 'QUIET' | 'NORMAL' | 'FUN' | 'FULL';
export type TravelPlanStatus = 'GENERATING' | 'COMPLETED' | 'FAILED';
export type GenerationStepKey =
  | 'PLACE_RECOMMEND'
  | 'STAY_RECOMMEND'
  | 'ROUTE_OPTIMIZE'
  | 'MUSIC_RECOMMEND';
export type GenerationStepState = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';

export type PlaceCandidate = {
  provider: 'KAKAO';
  provider_place_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category?: string;
};

export type TravelPreference = {
  style?: TripStyle;
  region_preference?: RegionPreference;
  food_preferences: FoodPreference[];
  activity_level: number;
  pace?: TripPace;
  extra_request: string;
};

export type TravelDraft = {
  destination?: string;
  companion?: CompanionType;
  start_date?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  transport?: TransportType;
  preference: TravelPreference;
  required_places: PlaceCandidate[];
};

export type CreateTravelPlanRequest = {
  destination: string;
  companion: CompanionType;
  start_datetime: string;
  end_datetime: string;
  transport: TransportType;
  preference: TravelPreference;
  required_places: PlaceCandidate[];
};

export type TravelSummary = {
  travel_plan_id: number;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: TravelPlanStatus;
  companion_label?: string;
  cover_color?: string;
};

export type GenerationStep = {
  key: GenerationStepKey;
  label: string;
  state: GenerationStepState;
};

export type TravelGenerationStatus = {
  travel_plan_id: number;
  status: TravelPlanStatus;
  steps: GenerationStep[];
  error_message?: string | null;
};

export type ItineraryItemType = 'PLACE' | 'ROUTE';

export type ItineraryPlaceItem = {
  itinerary_item_id: number;
  type: 'PLACE';
  place_id?: number;
  name: string;
  address?: string;
  start_time?: string;
  stay_minutes?: number;
  latitude?: number;
  longitude?: number;
  memo?: string;
};

export type ItineraryRouteItem = {
  itinerary_item_id: number;
  type: 'ROUTE';
  duration_minutes: number;
  distance_km: number;
  transport: TransportType;
};

export type ItineraryItem = ItineraryPlaceItem | ItineraryRouteItem;

export type ItineraryDay = {
  itinerary_day_id: number;
  day_number: number;
  date: string;
  items: ItineraryItem[];
};

export type RecommendedTrack = {
  track_id: number;
  title: string;
  artist: string;
};

export type TravelDetail = TravelSummary & {
  nights: number;
  days: number;
  preference?: TravelPreference;
  itinerary_days: ItineraryDay[];
  recommended_music: RecommendedTrack[];
};

export type ChecklistItem = {
  checklist_item_id: number;
  content: string;
  is_checked: boolean;
  sort_order: number;
};

export type Checklist = {
  checklist_id: number;
  travel_plan_id: number;
  status: TravelPlanStatus;
  items: ChecklistItem[];
};

export type TravelVideo = {
  video_id: number;
  travel_plan_id: number;
  status: TravelPlanStatus;
  video_url: string | null;
  thumbnail_url: string | null;
  error_message: string | null;
};

export type NotificationType =
  | 'TRAVEL_READY'
  | 'NEW_CHAT'
  | 'TRAVEL_D1'
  | 'TRAVEL_FAILED';

export type AppNotification = {
  notification_id: number;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  travel_plan_id?: number;
};

export type NotificationSettings = {
  travel_ready: boolean;
  new_chat: boolean;
  travel_d1: boolean;
  travel_failed: boolean;
};

export type MatchingSettings = {
  enabled: boolean;
  style?: TripStyle;
  region_preference?: RegionPreference;
  companion?: CompanionType;
};

export type ChatRoom = {
  chat_room_id: number;
  chat_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};
