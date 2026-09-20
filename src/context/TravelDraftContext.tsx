import { getJson, setJson, storage } from '@/storage';
import type { PlaceCandidate, TravelDraft } from '@/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

function createEmptyDraft(): TravelDraft {
  return {
    headcount: 2,
    preference: {
      budget_min: 100000,
      budget_max: 1000000,
      budget_type: 'KRW',
      distance_preference: 50,
      themes: [],
      foods: [],
      extra_request: '',
    },
    required_places: [],
  };
}

type DraftContextValue = {
  draft: TravelDraft;
  hydrated: boolean;
  update: (patch: Partial<TravelDraft>) => void;
  updatePreference: (patch: Partial<TravelDraft['preference']>) => void;
  addPlace: (place: PlaceCandidate) => void;
  removePlace: (providerPlaceId: string) => void;
  reset: () => void;
};

const TravelDraftContext = createContext<DraftContextValue | null>(null);

export function TravelDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<TravelDraft>(() => createEmptyDraft());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = getJson<TravelDraft>(storage.keys.travelDraft);
    if (saved) {
      const defaults = createEmptyDraft();
      setDraft({ ...defaults, ...saved, preference: { ...defaults.preference, ...saved.preference } });
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) setJson(storage.keys.travelDraft, draft);
  }, [draft, hydrated]);

  const update = useCallback((patch: Partial<TravelDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const updatePreference = useCallback((patch: Partial<TravelDraft['preference']>) => {
    setDraft((current) => ({ ...current, preference: { ...current.preference, ...patch } }));
  }, []);

  const addPlace = useCallback((place: PlaceCandidate) => {
    setDraft((current) => {
      if (current.required_places.some((item) => item.provider_place_id === place.provider_place_id)) return current;
      return { ...current, required_places: [...current.required_places, place] };
    });
  }, []);

  const removePlace = useCallback((providerPlaceId: string) => {
    setDraft((current) => ({
      ...current,
      required_places: current.required_places.filter((item) => item.provider_place_id !== providerPlaceId),
    }));
  }, []);

  const reset = useCallback(() => setDraft(createEmptyDraft()), []);

  const value = useMemo(
    () => ({ draft, hydrated, update, updatePreference, addPlace, removePlace, reset }),
    [draft, hydrated, update, updatePreference, addPlace, removePlace, reset],
  );

  return <TravelDraftContext.Provider value={value}>{children}</TravelDraftContext.Provider>;
}

export function useTravelDraft() {
  const ctx = useContext(TravelDraftContext);
  if (!ctx) throw new Error('TravelDraftProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
