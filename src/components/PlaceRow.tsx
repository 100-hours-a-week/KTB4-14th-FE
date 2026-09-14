import type { PlaceCandidate } from '@/types';

export function PlaceRow({
  place,
  onRemove,
  onAdd,
}: {
  place: PlaceCandidate;
  onRemove?: () => void;
  onAdd?: () => void;
}) {
  return (
    <div className="place-row">
      <div className="pin">📍</div>
      <div style={{ flex: 1 }}>
        <div className="place-name">{place.name}</div>
        <div className="place-addr">{place.address}</div>
      </div>
      {onAdd ? (
        <button type="button" className="add-mini" onClick={onAdd}>
          추가
        </button>
      ) : null}
      {onRemove ? (
        <button type="button" className="ghost-icon" onClick={onRemove} aria-label="삭제">
          ✕
        </button>
      ) : null}
    </div>
  );
}
