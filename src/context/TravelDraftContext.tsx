import { getJson, setJson, storage } from '@/storage';
import type { PlaceCandidate, TravelDraft } from '@/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const emptyDraft: TravelDraft = {
  preference: {
    food_preferences: [],
    activity_level: 45,
    extra_request: '',
  },
  required_places: [],
};

type DraftContextValue = {
  draft: TravelDraft;
  update: (patch: Partial<TravelDraft>) => void;
  updatePreference: (patch: Partial<TravelDraft['preference']>) => void;
  addPlace: (place: PlaceCandidate) => void;
  removePlace: (providerPlaceId: string) => void;
  reset: () => void;
};

const TravelDraftContext = createContext<DraftContextValue | null>(null);

export function TravelDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<TravelDraft>(emptyDraft);

  useEffect(() => {
    const saved = getJson<TravelDraft>(storage.keys.travelDraft);
    if (saved) setDraft({ ...emptyDraft, ...saved, preference: { ...emptyDraft.preference, ...saved.preference } });
  }, []);

  const persist = useCallback((next: TravelDraft) => {
    setDraft(next);
    setJson(storage.keys.travelDraft, next);
  }, []);

  const update = useCallback((patch: Partial<TravelDraft>) => persist({ ...draft, ...patch }), [draft, persist]);

  const updatePreference = useCallback(
    (patch: Partial<TravelDraft['preference']>) => persist({ ...draft, preference: { ...draft.preference, ...patch } }),
    [draft, persist],
  );

  const addPlace = useCallback(
    (place: PlaceCandidate) => {
      if (draft.required_places.some((item) => item.provider_place_id === place.provider_place_id)) return;
      persist({ ...draft, required_places: [...draft.required_places, place] });
    },
    [draft, persist],
  );

  const removePlace = useCallback(
    (providerPlaceId: string) => {
      persist({
        ...draft,
        required_places: draft.required_places.filter((item) => item.provider_place_id !== providerPlaceId),
      });
    },
    [draft, persist],
  );

  const reset = useCallback(() => persist(emptyDraft), [persist]);

  const value = useMemo(
    () => ({ draft, update, updatePreference, addPlace, removePlace, reset }),
    [draft, update, updatePreference, addPlace, removePlace, reset],
  );

  return <TravelDraftContext.Provider value={value}>{children}</TravelDraftContext.Provider>;
}

export function useTravelDraft() {
  const ctx = useContext(TravelDraftContext);
  if (!ctx) throw new Error('TravelDraftProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
