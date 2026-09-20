import { travelsApi } from '@/api';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import { PlaceRow } from '@/components/PlaceRow';
import { Progress } from '@/components/Progress';
import { useToast } from '@/context/ToastContext';
import { useTravelDraft } from '@/context/TravelDraftContext';
import { toDatetime } from '@/lib/options';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  if (!draft.start_date || !draft.start_time || !draft.end_date || !draft.end_time) {
    return '여행 날짜와 시간을 모두 선택해 주세요.';
  }
  if (!draft.companion || !draft.headcount) return '동행 유형과 인원을 확인해 주세요.';
  if (!draft.preference.pace_type || !draft.preference.transport_type) {
    return '여행 속도와 이동 수단을 선택해 주세요.';
  }
  if (draft.preference.budget_min > draft.preference.budget_max) {
    return '최소 예산은 최대 예산보다 클 수 없어요.';
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

export function PlacesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { draft, removePlace, reset } = useTravelDraft();
  const [target, setTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    const validationMessage = validateDraftForGeneration(draft);
    if (validationMessage) {
      toast.show(validationMessage);
      return;
    }

    setLoading(true);
    try {
      const created = await travelsApi.create({
        region_id: draft.region_id ?? 1,
        headcount: draft.headcount ?? 2,
        companion_type: draft.companion ?? 'COUPLE',
        arrival_datetime: toDatetime(draft.start_date, draft.start_time),
        departure_datetime: toDatetime(draft.end_date, draft.end_time),
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
      });
      reset();
      const jobQuery = created.generation_job_id ? `?job_id=${created.generation_job_id}` : '';
      navigate(`/generating/${created.travel_plan_id}${jobQuery}`, { replace: true });
    } catch (error) {
      toast.show(generationErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="screen">
      <Header title="여행 생성하기" onBack={() => navigate(-1)} showBell />
      <div className="scroll">
        <Progress step={3} />
        <h3 className="section" style={{ marginTop: 0 }}>
          선택된 장소
        </h3>
        {draft.required_places.length === 0 ? (
          <div className="empty-box">아직 선택한 장소가 없어요.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {draft.required_places.map((place) => (
              <PlaceRow key={place.provider_place_id} place={place} onRemove={() => setTarget(place.provider_place_id)} />
            ))}
          </div>
        )}
        <button type="button" className="menu-row" style={{ marginTop: 12 }} onClick={() => navigate('/create-travel/map-search')}>
          + 카카오맵에서 장소 추가
        </button>
      </div>
      <div className="footer-bar">
        <Button label="AI 여행 생성하기" variant="dark" loading={loading} onClick={generate} />
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
