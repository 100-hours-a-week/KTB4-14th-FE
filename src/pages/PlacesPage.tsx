import { travelsApi } from '@/api';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import { PlaceRow } from '@/components/PlaceRow';
import { Progress } from '@/components/Progress';
import { useTravelDraft } from '@/context/TravelDraftContext';
import { toDatetime } from '@/lib/options';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function PlacesPage() {
  const navigate = useNavigate();
  const { draft, removePlace, reset } = useTravelDraft();
  const [target, setTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    // TODO(backend-guard): 필수 값이 비어 있어도 현재는 생성 요청을 막지 않는다.
    setLoading(true);
    try {
      const created = await travelsApi.create({
        destination: draft.destination ?? '제주',
        companion: draft.companion ?? 'COUPLE',
        start_datetime: toDatetime(draft.start_date, draft.start_time),
        end_datetime: toDatetime(draft.end_date, draft.end_time),
        transport: draft.transport ?? 'CAR',
        preference: draft.preference,
        required_places: draft.required_places,
      });
      reset();
      navigate(`/generating/${created.travel_plan_id}`, { replace: true });
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
