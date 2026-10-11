import { chatApi } from '@/api';
import { Header } from '@/components/Header';
import type { ChatRoom, ChatRoomListResponse } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

const PAGE_SIZE = 20;

type ChatRoomCursor = {
  cursor_time: string;
  cursor_id: number;
};

function formatMessageTime(value: string) {
  const sentAt = new Date(value);
  if (Number.isNaN(sentAt.getTime())) return '';

  const now = new Date();
  if (sentAt.toDateString() === now.toDateString()) {
    return sentAt.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  }

  if (sentAt.getFullYear() === now.getFullYear()) {
    return `${sentAt.getMonth() + 1}월 ${sentAt.getDate()}일`;
  }

  return `${sentAt.getFullYear()}. ${sentAt.getMonth() + 1}. ${sentAt.getDate()}.`;
}

function ChatRoomRow({ room }: { room: ChatRoom }) {
  return (
    <article className="chat-room-row">
      <div className="chat-room-avatar-wrap">
        <div className="chat-room-avatar">
          {room.profile_image_url ? (
            <img src={room.profile_image_url} alt="" />
          ) : (
            <span aria-hidden="true">{room.chat_name.slice(0, 1) || '채'}</span>
          )}
        </div>
        {room.is_online ? <span className="chat-room-online-dot" aria-label="온라인" /> : null}
      </div>

      <div className="chat-room-content">
        <div className="chat-room-title-line">
          <strong className="chat-room-name">{room.chat_name}</strong>
          {room.status === 'ENDED' ? <span className="chat-room-ended">종료</span> : null}
          <time className="chat-room-time" dateTime={room.last_message_at}>
            {formatMessageTime(room.last_message_at)}
          </time>
        </div>
        <div className="chat-room-message-line">
          <p className="chat-room-last-message">{room.last_message || '메시지가 없습니다.'}</p>
          {room.unread_count > 0 ? (
            <span className="chat-room-unread" aria-label={`읽지 않은 메시지 ${room.unread_count}개`}>
              {room.unread_count > 99 ? '99+' : room.unread_count}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ChatPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const matchingState = location.state as
    | { fromMatching?: boolean; matchedUser?: { user_id: number; nickname: string; match_rate?: number } }
    | null;
  const matchedUserId = searchParams.get('matchedUserId');
  const matchedUser = matchingState?.fromMatching ? matchingState.matchedUser : null;

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [page, setPage] = useState<ChatRoomListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);

  const loadPage = useCallback(async (cursor?: ChatRoomCursor) => {
    const isNextPage = Boolean(cursor);
    if (isNextPage) setLoadingMore(true);
    else setLoading(true);
    setError(false);
    setLoadMoreError(false);

    try {
      const nextPage = await chatApi.listRooms({ size: PAGE_SIZE, ...cursor });
      setRooms((current) => (isNextPage ? [...current, ...nextPage.rooms] : nextPage.rooms));
      setPage(nextPage);
    } catch {
      if (isNextPage) setLoadMoreError(true);
      else setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!matchedUserId) void loadPage();
  }, [loadPage, matchedUserId]);

  const loadNextPage = () => {
    if (page?.has_next && page.cursor_time && page.cursor_id !== null) {
      void loadPage({ cursor_time: page.cursor_time, cursor_id: page.cursor_id });
    }
  };

  if (matchedUserId) {
    return (
      <section className="screen">
        <Header title="채팅" showBell />
        <div className="coming-soon matching-chat-entry">
          <div className="coming-icon">💬</div>
          <h2>{matchedUser?.nickname ?? '매칭 상대'}님과의 채팅</h2>
          <p>
            {matchedUser?.match_rate ? `취향 일치 ${matchedUser.match_rate}% · ` : ''}
            채팅방 연결을 준비 중입니다.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="screen">
      <Header title="채팅" showBell />
      <div className="scroll chat-room-scroll">
        <div className="chat-room-list-heading">
          <strong>채팅방</strong>
          {!loading && !error ? <span>{rooms.length}개</span> : null}
        </div>

        {loading ? <div className="chat-room-state">채팅방을 불러오고 있어요.</div> : null}

        {error ? (
          <div className="empty-box chat-room-error" role="alert">
            <p>채팅방 목록을 불러오지 못했어요.</p>
            <button type="button" className="chat-room-retry" onClick={() => void loadPage()}>
              다시 시도
            </button>
          </div>
        ) : null}

        {!loading && !error && rooms.length === 0 ? (
          <div className="empty-box chat-room-empty">
            <span className="chat-room-empty-icon" aria-hidden="true">💬</span>
            <strong>아직 채팅방이 없어요</strong>
            <p>매칭 후 첫 메시지를 보내면 채팅을 시작할 수 있어요.</p>
          </div>
        ) : null}

        {!loading && !error && rooms.length > 0 ? (
          <>
            <div className="chat-room-list">
              {rooms.map((room) => <ChatRoomRow key={room.room_id} room={room} />)}
            </div>
            {page?.has_next ? (
              <button
                type="button"
                className="chat-room-more"
                disabled={loadingMore}
                onClick={loadNextPage}>
                {loadingMore ? '불러오는 중...' : loadMoreError ? '다시 시도' : '이전 채팅방 더 보기'}
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
