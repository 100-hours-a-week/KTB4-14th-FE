import { travelsApi } from '@/api';
import { Button } from '@/components/Button';
import { InfoIcon, PinIcon, SparkIcon } from '@/components/Icons';
import { PlannerHeader } from '@/components/PlannerHeader';
import { Modal } from '@/components/Modal';
import { PlaceRow } from '@/components/PlaceRow';
import { Progress } from '@/components/Progress';
import { useToast } from '@/context/ToastContext';
import { MAX_REQUIRED_PLACES, useTravelDraft } from '@/context/TravelDraftContext';
import { companionOptions, toDatetime } from '@/lib/options';
import { isTravelDateRangeValid, MAX_TRAVEL_DAYS } from '@/lib/travelDates';
import { formatDateRange, formatTripLength } from '@/lib/tripDates';
import { saveTravelGenerationRequest } from '@/storage';
import type { CreateTravelPlanRequest } from '@/types';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_TRAVEL_TIME = '10:00';

function generationErrorMessage(error: unknown) {
  const apiError = error as {
    status?: number;
    message?: string;
    payload?: { message?: string };
  };
  const code = apiError.payload?.message ?? apiError.message;

  if (apiError.status === 401 || code === 'unauthorized') {
    return '로그인이 만료됐어요. 다시 로그인해 주세요.';
  }
  if (apiError.status === 403 || code === 'forbidden') {
    return '여행을 생성할 권한이 없어요.';
  }
  if (apiError.status === 404 || code === 'region_not_found') {
    return '선택한 여행 지역을 찾을 수 없어요. 지역을 다시 선택해 주세요.';
  }
  if (code === 'travel_generation_in_progress') {
    return '현재 다른 여행 일정을 생성 중이에요. 생성이 완료된 후 다시 시도해 주세요.';
  }
  if (apiError.status === 409 || code === 'duplicated_required_place') {
    return '필수 장소가 중복됐어요. 장소를 다시 확인해 주세요.';
  }
  if (apiError.status === 422 || code === 'validation_failed') {
    return '입력한 여행 정보가 올바르지 않아요. 날짜·인원·취향을 다시 확인해 주세요.';
  }
  return '여행 생성 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.';
}

function validateDraftForGeneration(draft: ReturnType<typeof useTravelDraft>['draft']) {
  if (!draft.region_id) return '여행 지역을 다시 선택해 주세요.';
  if (!draft.start_date || !draft.end_date) {
    return '여행 날짜를 모두 선택해 주세요.';
  }
  if (!isTravelDateRangeValid(draft.start_date, draft.end_date)) {
    return `여행 기간은 최대 ${MAX_TRAVEL_DAYS}일까지 선택할 수 있어요.`;
  }
  if (!draft.companion || !draft.headcount) return '동행 유형과 인원을 확인해 주세요.';
  if (!draft.preference.pace_type || !draft.preference.transport_type) {
    return '여행 속도와 이동 수단을 선택해 주세요.';
  }
  if (draft.preference.budget_min > draft.preference.budget_max) {
    return '최소 예산은 최대 예산보다 클 수 없어요.';
  }
  if (draft.required_places.length > MAX_REQUIRED_PLACES) {
    return `필수 장소는 최대 ${MAX_REQUIRED_PLACES}개까지 추가할 수 있어요.`;
  }

  const invalidPlace = draft.required_places.find(
    (place) => !place.provider_place_id || !place.name?.trim() || !place.address?.trim()
      || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude),
  );
  if (invalidPlace) {
    return `${invalidPlace.name || '선택한 장소'}의 주소 또는 위치 정보가 없어요. 해당 장소를 삭제한 뒤 다시 검색해 추가해 주세요.`;
  }
  return null;
}

function normalizedHeadcount(draft: ReturnType<typeof useTravelDraft>['draft']) {
  if (draft.companion === 'SOLO') return 1;
  if (draft.companion === 'COUPLE') return 2;
  return draft.headcount ?? 2;
}

export function PlacesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { draft, removePlace, reset } = useTravelDraft();
  const [target, setTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requiredPlacesLimitReached = draft.required_places.length >= MAX_REQUIRED_PLACES;

  const generate = async () => {
    const validationMessage = validateDraftForGeneration(draft);
    if (validationMessage) {
      toast.show(validationMessage);
      return;
    }

    setLoading(true);
    try {
      const request: CreateTravelPlanRequest = {
        region_id: draft.region_id ?? 1,
        headcount: normalizedHeadcount(draft),
        companion_type: draft.companion ?? 'COUPLE',
        arrival_datetime: toDatetime(draft.start_date, draft.start_time ?? DEFAULT_TRAVEL_TIME),
        departure_datetime: toDatetime(draft.end_date, draft.end_time ?? DEFAULT_TRAVEL_TIME),
        preference: draft.preference,
        required_places: draft.required_places.map((place, index) => ({
          provider: place.provider,
          provider_place_id: place.provider_place_id,
          place_name: place.name,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          place_type: place.place_type ?? 'TOURISM',
          order: index + 1,
        })),
      };
      const created = await travelsApi.create(request);
      // 서버에는 장소 상세정보를 저장하지 않으므로, 같은 브라우저에서 재생성할 때만
      // 최초 요청을 다시 사용할 수 있도록 여행 ID별로 임시 보관한다.
      saveTravelGenerationRequest(created.travel_plan_id, request);
      reset();
      const jobQuery = created.generation_job_id ? `?job_id=${created.generation_job_id}` : '';
      navigate(`/generating/${created.travel_plan_id}${jobQuery}`, { replace: true });
    } catch (error) {
      toast.show(generationErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const regionLabel = draft.destination ?? draft.destination_province ?? null;

  return (
    <section className="screen places-screen jw-screen">
      <PlannerHeader title="여행 생성하기" onBack={() => navigate(-1)} />
      <div className="scroll">
        <Progress step={3} />
        <DraftSummary draft={draft} />
        <div className="jw-section-head">
          <h3 className="section">선택된 장소</h3>
          <small>{draft.required_places.length} / {MAX_REQUIRED_PLACES}</small>
        </div>
        {draft.required_places.length === 0 ? (
          <div className="empty-box jw-places-empty">
            <span className="jw-empty-icon" aria-hidden="true"><PinIcon size={24} /></span>
            <strong>아직 선택한 장소가 없어요.</strong>
            <p>꼭 들르고 싶은 곳이 있다면 추가해 주세요. AI가 이 장소들을 포함해 일정을 짜요.</p>
          </div>
        ) : (
          <div className="jw-place-list">
            {draft.required_places.map((place, index) => (
              <PlaceRow
                key={place.provider_place_id}
                place={place}
                number={index + 1}
                onRemove={() => setTarget(place.provider_place_id)}
              />
            ))}
          </div>
        )}
        <button
          type="button"
          className="menu-row jw-add-place"
          onClick={() => navigate('/create-travel/map-search')}
          disabled={requiredPlacesLimitReached}
        >
          {requiredPlacesLimitReached ? (
            `필수 장소는 최대 ${MAX_REQUIRED_PLACES}개까지 추가할 수 있어요.`
          ) : (
            <>
              <span className="jw-add-plus">+</span> 카카오맵에서 장소 추가
            </>
          )}
        </button>
        {regionLabel ? (
          <p className="jw-note">
            <InfoIcon size={14} />
            {regionLabel} 안의 장소만 추가할 수 있어요.
          </p>
        ) : null}
      </div>
      <div className="footer-bar">
        <Button label="AI 여행 생성하기" icon={<SparkIcon size={18} />} variant="dark" loading={loading} onClick={generate} />
      </div>
      <Modal
        open={!!target}
        title="선택한 장소를 삭제하시겠어요?"
        message="이 장소는 필수 방문 목록에서 바로 빠집니다."
        onClose={() => setTarget(null)}
        onConfirm={() => {
          if (target) removePlace(target);
          setTarget(null);
        }}
      />
    </section>
  );
}

/** 1단계에서 입력한 값을 다시 보여주는 요약 카드 (입력값이 모두 있을 때만). */
function DraftSummary({ draft }: { draft: ReturnType<typeof useTravelDraft>['draft'] }) {
  if (!draft.destination || !draft.start_date || !draft.end_date) return null;
  const companion = companionOptions.find((option) => option.value === draft.companion)?.label;
  const people = companion ? `${companion} ${normalizedHeadcount(draft)}명` : null;
  return (
    <div className="jw-summary">
      <span className="jw-summary-icon" aria-hidden="true"><PinIcon size={17} /></span>
      <div>
        <strong>{draft.destination} · {formatTripLength(draft.start_date, draft.end_date)}</strong>
        <small>{[formatDateRange(draft.start_date, draft.end_date), people].filter(Boolean).join(' · ')}</small>
      </div>
    </div>
  );
}
