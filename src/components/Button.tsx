type Props = {
  label: string;
  variant?: 'primary' | 'kakao' | 'ghost' | 'dark' | 'soft';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
};

export function Button({ label, variant = 'primary', loading, disabled, onClick, type = 'button' }: Props) {
  return (
    <button type={type} className={`btn btn-${variant}`} disabled={disabled || loading} onClick={onClick}>
      {loading ? '처리 중...' : label}
    </button>
  );
}
