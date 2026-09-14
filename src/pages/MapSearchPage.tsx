import { placesApi } from '@/api';
import { Header } from '@/components/Header';
import { PlaceRow } from '@/components/PlaceRow';
import { useToast } from '@/context/ToastContext';
import { useTravelDraft } from '@/context/TravelDraftContext';
import type { PlaceCandidate } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function MapSearchPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { addPlace } = useTravelDraft();
  const [params] = useSearchParams();
  const replaceItemId = params.get('replaceItemId');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [selected, setSelected] = useState<PlaceCandidate | null>(null);

  useEffect(() => {
    placesApi.search('제주').then(setResults);
  }, []);

  const search = async () => {
    const found = await placesApi.search(query);
    setResults(found);
    setSelected(found[0] ?? null);
  };

  const add = async (place: PlaceCandidate) => {
    if (replaceItemId) {
      await placesApi.changePlace(Number(replaceItemId), place);
      toast.show('장소가 변경되었습니다.');
      navigate(-1);
      return;
    }
    addPlace(place);
    toast.show('장소가 추가되었습니다.');
  };

  return (
    <section className="screen">
      <Header title="여행 생성하기" onBack={() => navigate(-1)} showBell />
      <div className="search-row">
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="장소를 검색해 주세요" onKeyDown={(e) => e.key === 'Enter' && search()} />
        <button type="button" className="search-btn" onClick={search}>
          🔍
        </button>
      </div>
      <div className="map-box">
        {results.map((place, index) => (
          <button
            key={place.provider_place_id}
            type="button"
            className={`map-pin${selected?.provider_place_id === place.provider_place_id ? ' on' : ''}`}
            style={{ left: `${18 + ((index * 23) % 62)}%`, top: `${22 + ((index * 17) % 48)}%` }}
            onClick={() => setSelected(place)}>
            {index + 1}
          </button>
        ))}
        <p className="hint" style={{ position: 'absolute', bottom: 10, width: '100%' }}>
          카카오맵 SDK 연동 전 미리보기 지도
        </p>
      </div>
      <div className="scroll" style={{ paddingTop: 4 }}>
        {selected ? (
          <div style={{ marginBottom: 10 }}>
            <PlaceRow place={selected} onAdd={() => add(selected)} />
          </div>
        ) : null}
        <strong>검색 결과</strong>
        <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
          {results.map((place) => (
            <PlaceRow key={place.provider_place_id} place={place} onAdd={() => add(place)} />
          ))}
        </div>
      </div>
    </section>
  );
}
