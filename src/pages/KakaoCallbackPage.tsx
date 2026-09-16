import { useAuth } from '@/context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function KakaoCallbackPage() {
  const navigate = useNavigate();
  const { loginWithKakaoCode } = useAuth();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const requestedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const code = params.get('code');
    if (!code) {
      setError('카카오 인증 코드가 없습니다. 로그인 화면에서 다시 시도해주세요.');
      return;
    }
    if (requestedCodeRef.current === code) {
      return;
    }
    requestedCodeRef.current = code;

    loginWithKakaoCode(code)
      .then(() => navigate('/home', { replace: true }))
      .catch((err) => {
        setError(err instanceof Error ? err.message : '카카오 로그인 처리에 실패했습니다.');
      });
  }, [loginWithKakaoCode, navigate, params]);

  if (error) {
    return (
      <section className="splash">
        <p className="hint">{error}</p>
        <button type="button" className="logout" onClick={() => navigate('/login', { replace: true })}>
          로그인으로 돌아가기
        </button>
      </section>
    );
  }

  return (
    <section className="splash">
      <p className="hint">카카오 로그인 처리 중</p>
    </section>
  );
}
