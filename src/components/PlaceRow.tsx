import type { PlaceCandidate } from '@/types';

export function PlaceRow({
  place,
  onRemove,
  onAdd,
  addDisabled = false,
  addLabel = '추가',
}: {
  place: PlaceCandidate;
  onRemove?: () => void;
  onAdd?: () => void;
  addDisabled?: boolean;
  addLabel?: string;
}) {
  return (
    <div className="place-row">
      <div className="pin">📍</div>
      <div style={{ flex: 1 }}>
        <div className="place-name">{place.name}</div>
        <div className="place-addr">{place.address}</div>
      </div>
      {onAdd ? (
        <button type="button" className="add-mini" onClick={onAdd} disabled={addDisabled}>
          {addLabel}
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
