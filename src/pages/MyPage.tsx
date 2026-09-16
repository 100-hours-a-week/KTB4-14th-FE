import { matchingApi, usersApi } from '@/api';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { MyPage } from '@/types';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]+$/;
const DEFAULT_NICKNAME = '사용자';

function normalizeNickname(value: string) {
  return value.replace(/\s+/g, '').slice(0, 5);
}

function getNicknameError(value: string) {
  if (value.length < 2) return '닉네임은 최소 2자 이상 입력해주세요.';
  if (!NICKNAME_PATTERN.test(value)) return '닉네임은 한글, 영문, 숫자만 사용할 수 있어요.';
  return '';
}

export function MyPage() {
  const navigate = useNavigate();
  const { user, updateNickname, logout } = useAuth();
  const toast = useToast();
  const [me, setMe] = useState<MyPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    usersApi.getMe()
      .then((data) => {
        if (alive) setMe(data);
      })
      .catch(() => {
        if (alive) toast.show('사용자 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [toast]);

  const displayNickname = me?.nickname ?? user?.nickname ?? DEFAULT_NICKNAME;
  const profileImageUrl = me?.profile_image_url ?? user?.profile_image_url ?? null;
  const nicknameError = useMemo(() => (nickname ? getNicknameError(nickname) : ''), [nickname]);

  const openNicknameModal = () => {
    setNickname(displayNickname);
    setOpen(true);
  };

  const saveNickname = async () => {
    const next = normalizeNickname(nickname);
    setNickname(next);

    if (getNicknameError(next)) return;
    if (next === displayNickname) {
      setOpen(false);
      return;
    }

    setSaving(true);
    try {
      const saved = await usersApi.updateNickname(next);
      await updateNickname(saved.nickname);
      setMe((prev) => (prev ? { ...prev, nickname: saved.nickname } : prev));
      setOpen(false);
      toast.show('닉네임이 변경되었습니다.');
    } catch {
      toast.show('닉네임을 변경하지 못했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="screen">
      <Header title="마이페이지" showBell />
      <div className="scroll">
        <div className="profile">
          <div className="avatar">
            {profileImageUrl ? <img src={profileImageUrl} alt="" /> : displayNickname.slice(0, 1)}
          </div>
          <button type="button" className="name-btn" onClick={openNicknameModal}>
            {loading ? '불러오는 중...' : displayNickname} ✎
          </button>
          <p className="hello">{me?.provider ?? 'KAKAO'} 계정으로 로그인됨</p>
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
      <Modal
        open={open}
        title="닉네임 변경"
        confirmLabel="변경하기"
        confirmDisabled={Boolean(nicknameError) || nickname.length === 0}
        confirmBusy={saving}
        onClose={() => setOpen(false)}
        onConfirm={saveNickname}>
        <input
          className="input nickname-input"
          value={nickname}
          onChange={(e) => setNickname(normalizeNickname(e.target.value))}
          placeholder="새로운 닉네임을 입력하세요."
          maxLength={5}
        />
        <p className={`field-help${nicknameError ? ' error' : ''}`}>{nicknameError}</p>
      </Modal>
    </section>
  );
}
