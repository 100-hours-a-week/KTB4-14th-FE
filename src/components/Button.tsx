import type { ReactNode } from 'react';

type Props = {
  label: string;
  /** 라벨 앞에 붙는 장식용 아이콘 (접근성 이름에는 포함되지 않음) */
  icon?: ReactNode;
  variant?: 'primary' | 'kakao' | 'ghost' | 'dark' | 'soft';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
};

export function Button({ label, icon, variant = 'primary', loading, disabled, onClick, type = 'button' }: Props) {
  return (
    <button type={type} className={`btn btn-${variant}`} disabled={disabled || loading} onClick={onClick}>
      {loading ? '처리 중...' : (
        <>
          {icon}
          {label}
        </>
      )}
    </button>
  );
}
