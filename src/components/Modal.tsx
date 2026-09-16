import type { ReactNode } from 'react';

export function Modal({
  open,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  confirmDisabled = false,
  confirmBusy = false,
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
  onConfirm?: () => void | Promise<void>;
  onClose: () => void;
  children?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog">
        <h2 className="modal-title">{title}</h2>
        {message ? <p className="modal-message">{message}</p> : null}
        {children}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-dark" onClick={onConfirm ?? onClose} disabled={confirmDisabled || confirmBusy}>
            {confirmBusy ? '변경 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
