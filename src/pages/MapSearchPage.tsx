import { placesApi } from '@/api';
import { Header } from '@/components/Header';
import { KakaoMap } from '@/components/KakaoMap';
import { PlaceRow } from '@/components/PlaceRow';
import { useToast } from '@/context/ToastContext';
import { useTravelDraft } from '@/context/TravelDraftContext';
import type { PlaceCandidate } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function MapSearchPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { draft, addPlace } = useTravelDraft();
  const [params] = useSearchParams();
  const replaceItemId = params.get('replaceItemId');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [selected, setSelected] = useState<PlaceCandidate | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void placesApi.search('제주', draft.region_id ?? 1)
      .then((found) => {
        if (cancelled) return;
        setResults(found);
        setSelected(found[0] ?? null);
        setSearchError(null);
      })
      .catch((error: unknown) => {
        if (!cancelled) setSearchError(toSearchErrorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, [draft.region_id]);

  const search = async () => {
    if (!query.trim()) {
      setSearchError('검색어를 입력해 주세요.');
      return;
    }

    setSearchError(null);
    try {
      const found = await placesApi.search(query, draft.region_id ?? 1);
      setResults(found);
      setSelected(found[0] ?? null);
    } catch (error: unknown) {
      setResults([]);
      setSelected(null);
      setSearchError(toSearchErrorMessage(error));
    }
  };

  const add = async (place: PlaceCandidate) => {
    if (!place.address.trim()) {
      toast.show('주소 정보가 없는 장소는 필수 장소로 추가할 수 없어요.');
      return;
    }
    if (replaceItemId) {
      await placesApi.changePlace(Number(replaceItemId), place);
      toast.show('장소가 변경되었습니다.');
      navigate(-1);
      return;
    }
    if (draft.required_places.some((item) => item.provider_place_id === place.provider_place_id)) {
      toast.show('이미 필수 장소에 추가된 장소예요.');
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
      {searchError ? <p className="field-help error" role="alert">{searchError}</p> : null}
      <div className="map-box">
        <KakaoMap
          places={results}
          selectedPlaceId={selected?.provider_place_id}
          onSelect={setSelected}
        />
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

function toSearchErrorMessage(error: unknown) {
  const candidate = error && typeof error === 'object'
    ? error as { status?: number; message?: string; payload?: { message?: string } }
    : {};
  const code = candidate.payload?.message ?? candidate.message;

  if (code === 'region_not_found' || candidate.status === 404) {
    return '선택한 지역 정보를 찾을 수 없습니다. 지역 목록을 다시 확인해 주세요.';
  }
  if (code === 'external_api_error' || candidate.status === 502) {
    return '카카오 장소 검색을 사용할 수 없습니다. 백엔드의 카카오 REST 키와 로컬 API 설정을 확인해 주세요.';
  }
  if (code === 'service_unavailable' || candidate.status === 503) {
    return '장소 검색 설정이 아직 준비되지 않았습니다. 백엔드의 카카오 REST 키를 확인해 주세요.';
  }
  if (candidate.status === 401 || candidate.status === 403) {
    return '로그인 인증이 만료되었습니다. 다시 로그인해 주세요.';
  }
  if (code === 'validation_failed' || candidate.status === 422) {
    return '검색어 또는 검색 조건을 확인해 주세요.';
  }
  return '장소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.';
}
