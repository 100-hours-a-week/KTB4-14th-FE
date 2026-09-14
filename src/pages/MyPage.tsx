import { matchingApi, usersApi } from '@/api';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { MyPage } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function MyPage() {
  const navigate = useNavigate();
  const { user, updateNickname, logout } = useAuth();
  const toast = useToast();
  const [me, setMe] = useState<MyPage | null>(null);
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname ?? '');

  useEffect(() => {
    usersApi.getMe().then(setMe);
  }, []);

  const saveNickname = async () => {
    // TODO(backend-guard): 닉네임 길이/중복/금칙어 검증 후 저장. 현재는 화면 이동을 막지 않는다.
    const next = nickname.trim();
    const saved = await usersApi.updateNickname(next || me?.nickname || '여행자');
    await updateNickname(saved.nickname);
    setMe((prev) => (prev ? { ...prev, nickname: saved.nickname } : prev));
    setOpen(false);
    toast.show('닉네임이 변경되었습니다.');
  };

  return (
    <section className="screen">
      <Header title="마이페이지" showBell />
      <div className="scroll">
        <div className="profile">
          <div className="avatar">{(me?.nickname ?? user?.nickname ?? 'A').slice(0, 1)}</div>
          <button type="button" className="name-btn" onClick={() => setOpen(true)}>
            {me?.nickname ?? user?.nickname} ✎
          </button>
          <p className="hello">카카오 계정으로 로그인됨</p>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="stat-num">{me?.completed_travel_count ?? 0}</div>
            <div className="place-addr">완료한 여행</div>
          </div>
          <div className="stat">
            <div className="stat-num">{me?.upcoming_travel_count ?? 0}</div>
            <div className="place-addr">예정된 여행</div>
          </div>
        </div>
        <button type="button" className="menu-row" onClick={() => navigate('/my-trips')}>
          여행 기록 보기 <span>›</span>
        </button>
        <button
          type="button"
          className="menu-row"
          onClick={() => {
            void matchingApi.getSettings();
            navigate('/matching-settings');
          }}>
          매칭 설정 <span>›</span>
        </button>
        <button type="button" className="menu-row" onClick={() => navigate('/notification-settings')}>
          알림 설정 <span>›</span>
        </button>
        <button type="button" className="menu-row" onClick={() => navigate('/policies')}>
          이용약관 및 개인정보 <span>›</span>
        </button>
        <button
          type="button"
          className="logout"
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}>
          로그아웃
        </button>
      </div>
      <Modal open={open} title="닉네임 변경" confirmLabel="변경하기" onClose={() => setOpen(false)} onConfirm={saveNickname}>
        <input className="input" style={{ marginTop: 16 }} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="새로운 닉네임을 입력하세요" />
      </Modal>
    </section>
  );
}
