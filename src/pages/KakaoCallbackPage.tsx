import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function KakaoCallbackPage() {
  const navigate = useNavigate();
  const { loginWithKakaoCode } = useAuth();
  const [params] = useSearchParams();

  useEffect(() => {
    const code = params.get('code');
    if (!code) {
      navigate('/login', { replace: true });
      return;
    }
    loginWithKakaoCode(code)
      .then(() => navigate('/home', { replace: true }))
      .catch(() => navigate('/login', { replace: true }));
  }, [loginWithKakaoCode, navigate, params]);

  return (
    <section className="splash">
      <p className="hint">카카오 로그인 처리 중</p>
    </section>
  );
}
