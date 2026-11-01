import { PinIcon, PlusIcon, XIcon } from '@/components/Icons';
import type { PlaceCandidate } from '@/types';

/**
 * 장소 한 줄 (필수 장소 목록 · 장소 검색 결과 공용).
 * number 가 있으면 핀 대신 순번을 보여주고, highlighted 는 지도에서 고른 장소를 강조한다.
 */
export function PlaceRow({
  place,
  number,
  highlighted = false,
  onRemove,
  onAdd,
  addDisabled = false,
  addLabel = '추가',
}: {
  place: PlaceCandidate;
  number?: number;
  highlighted?: boolean;
  onRemove?: () => void;
  onAdd?: () => void;
  addDisabled?: boolean;
  addLabel?: string;
}) {
  const className = [
    'place-row',
    highlighted ? 'is-highlighted' : '',
    onAdd && addDisabled ? 'is-disabled' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={className}>
      {number != null ? (
        <span className="place-number" aria-hidden="true">{number}</span>
      ) : (
        <div className="pin" aria-hidden="true"><PinIcon size={16} /></div>
      )}
      <div className="place-text">
        <div className="place-name">{place.name}</div>
        <div className="place-addr">{place.address}</div>
      </div>
      {onAdd ? (
        <button type="button" className="add-mini" onClick={onAdd} disabled={addDisabled}>
          {!addDisabled ? <PlusIcon size={13} /> : null}
          {addLabel}
        </button>
      ) : null}
      {onRemove ? (
        <button type="button" className="ghost-icon place-remove" onClick={onRemove} aria-label="삭제">
          <XIcon size={15} />
        </button>
      ) : null}
    </div>
  );
}
