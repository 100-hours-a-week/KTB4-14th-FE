import { Digo } from '@/components/Digo';
import { AlertIcon, KakaoSymbol } from '@/components/Icons';
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
      <section className="splash jk-splash">
        <div className="jk-grid" aria-hidden="true" />
        <div className="jk-orb fail" aria-hidden="true"><AlertIcon size={44} /></div>
        <h1 className="jk-title">로그인하지 못했어요</h1>
        <p className="hint" role="alert">{error}</p>
        <button type="button" className="logout jk-back" onClick={() => navigate('/login', { replace: true })}>
          로그인으로 돌아가기
        </button>
      </section>
    );
  }

  return (
    <section className="splash jk-splash" aria-busy="true">
      <div className="jk-grid" aria-hidden="true" />
      <div className="jk-orb" aria-hidden="true">
        <svg className="jk-ring" viewBox="0 0 166 166">
          <circle className="track" cx="83" cy="83" r="78" />
          <circle className="bar" cx="83" cy="83" r="78" pathLength={100} strokeDasharray="22 100" />
        </svg>
        <Digo className="jk-digo" />
      </div>
      <span className="jk-kakao"><KakaoSymbol size={14} />카카오 계정 확인 중</span>
      <p className="hint jk-title" role="status">카카오 로그인 처리 중</p>
      <p className="jk-sub">잠시만 기다려 주세요.</p>
    </section>
  );
}
