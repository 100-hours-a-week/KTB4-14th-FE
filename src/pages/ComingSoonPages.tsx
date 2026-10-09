import { ComingSoon } from '@/components/ComingSoon';
import { Header } from '@/components/Header';
import { useLocation, useSearchParams } from 'react-router-dom';

export function MatchingPage() {
  return (
    <section className="screen">
      <Header title="매칭" showBell />
      <ComingSoon />
    </section>
  );
}

export function ChatPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as
    | { fromMatching?: boolean; matchedUser?: { user_id: number; nickname: string; match_rate?: number } }
    | null;
  const matchedUserId = searchParams.get('matchedUserId');
  const matchedUser = state?.fromMatching ? state.matchedUser : null;

  return (
    <section className="screen">
      <Header title="채팅" showBell />
      {matchedUserId ? (
        <div className="coming-soon matching-chat-entry">
          <div className="coming-icon">💬</div>
          <h2>{matchedUser?.nickname ?? '매칭 상대'}님과의 채팅</h2>
          <p>
            {matchedUser?.match_rate ? `취향 일치 ${matchedUser.match_rate}% · ` : ''}
            채팅방 연결을 준비 중입니다.
          </p>
        </div>
      ) : (
        <ComingSoon />
      )}
    </section>
  );
}
