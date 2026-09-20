import { travelsApi } from '@/api';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import { nightsAndDays } from '@/lib/options';
import type { ItineraryItem, TravelDetail } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function ItineraryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const planId = Number(id);
  const [detail, setDetail] = useState<TravelDetail | null>(null);
  const [tab, setTab] = useState<'list' | 'map'>('list');
  const [recreate, setRecreate] = useState(false);

  useEffect(() => {
    travelsApi.getDetail(planId).then(setDetail);
  }, [planId]);

  if (!detail) {
    return (
      <section className="screen">
        <Header title="추천 경로" onBack={() => navigate(-1)} showBell />
      </section>
    );
  }

  const places = detail.itinerary_days.flatMap((day) => day.items.filter((item) => item.type === 'PLACE'));

  return (
    <section className="screen">
      <Header title="추천 경로" onBack={() => navigate(-1)} showBell />
      <div className="scroll">
        <div className="row" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <h2 className="page-title" style={{ marginBottom: 6 }}>
              {detail.title}
            </h2>
            <p className="hello">
              {detail.start_date.replaceAll('-', '.')} - {detail.end_date.replaceAll('-', '.')} · {nightsAndDays(detail.start_date, detail.end_date)}
            </p>
          </div>
          <button type="button" className="recreate" onClick={() => setRecreate(true)}>
            일정 다시 만들기
          </button>
        </div>
        <div className="tabs">
          <button type="button" className={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>
            장소
          </button>
          <button type="button" className={tab === 'map' ? 'on' : ''} onClick={() => setTab('map')}>
            이동 경로
          </button>
        </div>
        {tab === 'map' ? (
          <div className="map-box" style={{ margin: '0 0 16px', height: 260 }}>
            {places.map((place, index) => (
              <span key={place.itinerary_item_id} className="map-pin on" style={{ left: `${12 + ((index * 18) % 70)}%`, top: `${16 + ((index * 14) % 60)}%` }}>
                {index + 1}
              </span>
            ))}
          </div>
        ) : (
          detail.itinerary_days.map((day) => (
            <article key={day.itinerary_day_id} className="day-card">
              <strong>DAY {day.day_number}</strong>
              <p className="place-addr" style={{ marginBottom: 10 }}>
                {day.date.replaceAll('-', '.')}
              </p>
              {day.items.map((item) => (
                <ItineraryRow key={item.itinerary_item_id} item={item} onChangePlace={() => navigate(`/create-travel/map-search?replaceItemId=${item.itinerary_item_id}`)} />
              ))}
            </article>
          ))
        )}
        {detail.recommended_music.length > 0 ? (
          <div className="music">
            <strong>추천 음악</strong>
            {detail.recommended_music.map((track) => (
              <p key={track.track_id}>
                {track.title} · {track.artist}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <div className="bottom-actions">
        <button type="button" onClick={() => navigate(`/checklist/${planId}`)}>
          체크리스트
        </button>
        <button type="button" onClick={() => navigate(`/video/${planId}`)}>
          여행 영상
        </button>
      </div>
      <Modal
        open={recreate}
        title="일정을 다시 만들까요?"
        message="일정이 다시 생성되면 현재 저장된 일정이 사라집니다."
        onClose={() => setRecreate(false)}
        onConfirm={async () => {
          setRecreate(false);
          const created = await travelsApi.regenerate(planId);
          const jobQuery = created.generation_job_id ? `?job_id=${created.generation_job_id}` : '';
          navigate(`/generating/${created.travel_plan_id}${jobQuery}`, { replace: true });
        }}
      />
    </section>
  );
}

function ItineraryRow({ item, onChangePlace }: { item: ItineraryItem; onChangePlace: () => void }) {
  if (item.type === 'ROUTE') {
    return (
      <div className="route-item">
        이동 {item.duration_minutes}분 · {item.distance_km}km
      </div>
    );
  }
  return (
    <div className="place-item">
      <div>
        <strong>{item.name}</strong>
        <div className="place-addr">
          {item.start_time ?? ''} {item.stay_minutes ? `· ${item.stay_minutes}분 체류` : ''}
        </div>
        {item.address ? <div className="place-addr">{item.address}</div> : null}
      </div>
      <button type="button" className="ghost-icon" onClick={onChangePlace}>
        ✎
      </button>
    </div>
  );
}
