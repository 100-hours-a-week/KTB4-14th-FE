import { useId, type ReactNode } from 'react';

/**
 * 공용 확인 팝업.
 * - tone="danger" : 삭제 · 나가기처럼 되돌릴 수 없는 동작. 확인 버튼이 빨간색이 된다.
 * - icon          : 제목 위에 보이는 장식용 아이콘 (선택)
 * 동작(열기 · 닫기 · 확인)과 버튼 문구는 기존과 같다.
 */
export function Modal({
  open,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  confirmDisabled = false,
  confirmBusy = false,
  tone = 'default',
  icon,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  confirmBusy?: boolean;
  tone?: 'default' | 'danger';
  icon?: ReactNode;
  onConfirm?: () => void | Promise<void>;
  onClose: () => void;
  children?: ReactNode;
}) {
  const titleId = useId();
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal-sheet${tone === 'danger' ? ' danger' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}>
        <span className="modal-grab" aria-hidden="true" />
        {icon ? <span className="modal-icon" aria-hidden="true">{icon}</span> : null}
        <h2 className="modal-title" id={titleId}>{title}</h2>
        {message ? <p className="modal-message">{message}</p> : null}
        {children}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-dark'}`}
            onClick={onConfirm ?? onClose}
            disabled={confirmDisabled || confirmBusy}>
            {confirmBusy ? '변경 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
