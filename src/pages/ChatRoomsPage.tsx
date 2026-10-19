import { chatApi } from '@/api';
import { Header } from '@/components/Header';
import type { ChatRoom, ChatRoomListResponse } from '@/types';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

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
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="chat-room-row"
      aria-label={`${room.chat_name} 채팅방 열기`}
      onClick={() => navigate(`/chat/${room.room_id}`)}>
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
    </button>
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
  const [searchInput, setSearchInput] = useState('');
  const [activeChatName, setActiveChatName] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  // Keep the newest list available to async refreshes without relying on a stale render closure.
  const roomsRef = useRef<ChatRoom[]>([]);
  const pageRef = useRef<ChatRoomListResponse | null>(null);
  const refreshRoomsRef = useRef<() => void>(() => undefined);

  const updateRooms = useCallback((nextRooms: ChatRoom[]) => {
    roomsRef.current = nextRooms;
    setRooms(nextRooms);
  }, []);

  const updatePage = useCallback((nextPage: ChatRoomListResponse | null) => {
    pageRef.current = nextPage;
    setPage(nextPage);
  }, []);

  const loadPage = useCallback(async (cursor?: ChatRoomCursor, chatName = activeChatName) => {
    const requestId = ++requestIdRef.current;
    const isNextPage = Boolean(cursor);
    if (isNextPage) setLoadingMore(true);
    else {
      setLoading(true);
      setLoadingMore(false);
    }
    setError(false);
    setLoadMoreError(false);

    try {
      const nextPage = await chatApi.listRooms({
        chat_name: chatName ?? undefined,
        size: PAGE_SIZE,
        ...cursor,
      });
      if (requestId !== requestIdRef.current) return;
      updateRooms(isNextPage ? [...roomsRef.current, ...nextPage.rooms] : nextPage.rooms);
      updatePage(nextPage);
    } catch {
      if (requestId !== requestIdRef.current) return;
      if (isNextPage) setLoadMoreError(true);
      else setError(true);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [activeChatName, updatePage, updateRooms]);

  const refreshRooms = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    try {
      const latestPage = await chatApi.listRooms({
        chat_name: activeChatName ?? undefined,
        size: PAGE_SIZE,
      });
      if (requestId !== requestIdRef.current) return;

      const latestRoomIds = new Set(latestPage.rooms.map((room) => room.room_id));
      const mergedRooms = [
        ...latestPage.rooms,
        ...roomsRef.current.filter((room) => !latestRoomIds.has(room.room_id)),
      ];
      const lastRoom = mergedRooms[mergedRooms.length - 1];
      const previousPage = pageRef.current;

      updateRooms(mergedRooms);
      updatePage({
        ...latestPage,
        cursor_time: lastRoom?.last_message_at ?? latestPage.cursor_time,
        cursor_id: lastRoom?.room_id ?? latestPage.cursor_id,
        has_next: latestPage.has_next || Boolean(previousPage?.has_next),
      });
      setError(false);
      setLoadMoreError(false);
    } catch {
      if (requestId === requestIdRef.current && !pageRef.current && roomsRef.current.length === 0) {
        setError(true);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [activeChatName, updatePage, updateRooms]);

  refreshRoomsRef.current = () => {
    void refreshRooms();
  };

  useEffect(() => {
    roomsRef.current = [];
    pageRef.current = null;
  }, [activeChatName]);

  useEffect(() => {
    if (!matchedUserId) void loadPage();
  }, [loadPage, matchedUserId]);

  useEffect(() => {
    if (matchedUserId) return;

    let active = true;
    let disconnect: (() => void) | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        refreshRoomsRef.current();
      }, 150);
    };

    void import('@/api/chatRealtime').then(({ connectChatRealtime }) => {
      if (!active) return;
      disconnect = connectChatRealtime(
        null,
        (event) => {
          if (event.event_type === 'MESSAGE_CREATED') scheduleRefresh();
        },
        () => undefined,
        () => refreshRoomsRef.current(),
      );
    });

    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      disconnect?.();
    };
  }, [matchedUserId]);

  const loadNextPage = () => {
    if (page?.has_next && page.cursor_time && page.cursor_id !== null) {
      void loadPage({ cursor_time: page.cursor_time, cursor_id: page.cursor_id });
    }
  };

  const searchRooms = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const chatName = searchInput.trim();

    if (searchInput.length > 0 && chatName.length === 0) {
      setSearchError('검색어를 입력해 주세요.');
      return;
    }
    if (chatName.length > 5) {
      setSearchError('검색어는 5자 이내로 입력해 주세요.');
      return;
    }

    setSearchError(null);
    const nextChatName = chatName || null;
    if (nextChatName === activeChatName) {
      void loadPage(undefined, nextChatName);
    } else {
      setActiveChatName(nextChatName);
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchError(null);
    if (activeChatName !== null) setActiveChatName(null);
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

        <form className="chat-room-search" onSubmit={searchRooms} role="search">
          <input
            className="chat-room-search-input"
            type="search"
            aria-label="상대 닉네임으로 채팅방 검색"
            aria-describedby={searchError ? 'chat-room-search-error' : undefined}
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setSearchError(null);
            }}
            placeholder="상대 닉네임 검색"
          />
          <button type="submit" className="chat-room-search-button">검색</button>
          {searchInput || activeChatName ? (
            <button type="button" className="chat-room-search-clear" onClick={clearSearch}>
              초기화
            </button>
          ) : null}
        </form>
        {searchError ? (
          <p id="chat-room-search-error" className="chat-room-search-error" role="alert">
            {searchError}
          </p>
        ) : null}

        {loading ? (
          <div className="chat-room-state">
            {activeChatName ? '채팅방을 검색하고 있어요.' : '채팅방을 불러오고 있어요.'}
          </div>
        ) : null}

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
            <strong>{activeChatName ? '검색 결과가 없어요' : '아직 채팅방이 없어요'}</strong>
            <p>
              {activeChatName
                ? '다른 닉네임으로 검색하거나 검색어를 초기화해 주세요.'
                : '매칭 후 첫 메시지를 보내면 채팅을 시작할 수 있어요.'}
            </p>
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
