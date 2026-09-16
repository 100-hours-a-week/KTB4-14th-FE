import { Button } from '@/components/Button';
import { useAuth } from '@/context/AuthContext';
import { USE_MOCK } from '@/api/client';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const navigate = useNavigate();
  const { loginWithKakaoCode } = useAuth();

  const onKakao = async () => {
    const restKey = import.meta.env.VITE_KAKAO_REST_KEY;
    const redirectUri = import.meta.env.VITE_KAKAO_REDIRECT_URI ?? `${window.location.origin}/auth/kakao`;

    if (!restKey) {
      if (!USE_MOCK) {
        alert('VITE_KAKAO_REST_KEY가 비어 있습니다. AUDIGO-FE/.env에 카카오 REST API 키를 넣고 프론트 서버를 재시작해주세요.');
        return;
      }

      await loginWithKakaoCode('mock-authorization-code');
      navigate('/home', { replace: true });
      return;
    }

    window.location.href = `https://kauth.kakao.com/oauth/authorize?client_id=${restKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  };

  return (
    <section className="screen">
      <div className="login">
        <div className="login-hero">
          <span className="badge">ROUTE + SOUND</span>
          <div className="orb">
            <div>
              <div style={{ fontSize: 36, color: 'var(--primary)' }}>◎</div>
              <div className="hint">여행 경로</div>
            </div>
          </div>
          <div className="brand">AUDIGO</div>
          <h1 className="headline">
            나에게 맞는 여행을
            <br />
            더 쉽게 시작하세요
          </h1>
          <p className="sub">장소부터 이동 경로까지 한 번에 추천해드려요.</p>
        </div>
        <div>
          <Button label="카카오로 계속하기" variant="kakao" onClick={onKakao} />
          <p className="hint" style={{ marginTop: 14 }}>
            카카오 계정으로 간편하게 로그인합니다.
          </p>
          <button
            type="button"
            className="logout"
            onClick={() => navigate('/policies')}>
            계속하면 <span className="link">이용약관</span> 및 <span className="link">개인정보처리방침</span>에 동의합니다.
          </button>
        </div>
      </div>
    </section>
  );
}
