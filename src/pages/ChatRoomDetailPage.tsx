import { chatRoomDetailApi } from '@/api';
import { ApiError } from '@/api/client';
import { Header } from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import type { ChatRoomDetailMessage, ChatRoomDetailResponse } from '@/types/chat-detail';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '@/styles/chat-detail.css';

const PAGE_SIZE = 20;

function messageDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function formatMessageDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
}

function MessageBubble({ message, mine }: { message: ChatRoomDetailMessage; mine: boolean }) {
  return (
    <div className={`chat-message-row${mine ? ' mine' : ''}`}>
      <div className="chat-message-meta">
        <time dateTime={message.sent_at}>{formatMessageTime(message.sent_at)}</time>
        {mine ? <span>{message.is_read ? '읽음' : '안 읽음'}</span> : null}
      </div>
      <p className="chat-message-bubble">{message.content}</p>
    </div>
  );
}

export function ChatRoomDetailPage() {
  const { roomId: rawRoomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roomId = Number(rawRoomId);
  const validRoomId = Number.isSafeInteger(roomId) && roomId > 0;

  const [detail, setDetail] = useState<ChatRoomDetailResponse | null>(null);
  const [messages, setMessages] = useState<ChatRoomDetailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const loadingOlderRef = useRef(false);
  const pendingScrollHeightRef = useRef<number | null>(null);
  const initialPageLoadedRef = useRef(false);

  const loadDetail = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setErrorStatus(null);
    setDetail(null);
    setMessages([]);
    setOlderError(false);
    loadingOlderRef.current = false;
    setLoadingOlder(false);
    pendingScrollHeightRef.current = null;
    initialPageLoadedRef.current = false;

    if (!validRoomId) {
      setErrorStatus(404);
      setLoading(false);
      return;
    }

    try {
      const response = await chatRoomDetailApi.getRoomDetail(roomId, { size: PAGE_SIZE });
      if (requestId !== requestIdRef.current) return;
      setDetail(response);
      setMessages(response.chats);
      initialPageLoadedRef.current = true;
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setErrorStatus(error instanceof ApiError ? error.status : 0);
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [roomId, validRoomId]);

  useEffect(() => {
    void loadDetail();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadDetail]);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const previousHeight = pendingScrollHeightRef.current;
    if (previousHeight !== null) {
      container.scrollTop += container.scrollHeight - previousHeight;
      pendingScrollHeightRef.current = null;
      return;
    }

    if (initialPageLoadedRef.current) {
      container.scrollTop = container.scrollHeight;
      initialPageLoadedRef.current = false;
    }
  }, [loading, messages]);

  const loadOlderMessages = async () => {
    if (
      !detail?.has_next ||
      !detail.chat_cursor_time ||
      detail.chat_cursor_id === null ||
      loadingOlderRef.current
    ) return;

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    setOlderError(false);
    pendingScrollHeightRef.current = scrollRef.current?.scrollHeight ?? null;
    const requestId = requestIdRef.current;

    try {
      const olderPage = await chatRoomDetailApi.getRoomDetail(roomId, {
        size: PAGE_SIZE,
        chat_cursor_time: detail.chat_cursor_time,
        chat_cursor_id: detail.chat_cursor_id,
      });
      if (requestId !== requestIdRef.current) return;

      setMessages((current) => {
        const currentIds = new Set(current.map((message) => message.chat_id));
        const uniqueOlderMessages = olderPage.chats.filter(
          (message) => !currentIds.has(message.chat_id),
        );
        return [...uniqueOlderMessages, ...current];
      });
      setDetail((current) => current ? {
        ...current,
        chat_cursor_time: olderPage.chat_cursor_time,
        chat_cursor_id: olderPage.chat_cursor_id,
        has_next: olderPage.has_next,
      } : current);
    } catch {
      if (requestId === requestIdRef.current) {
        pendingScrollHeightRef.current = null;
        setOlderError(true);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        loadingOlderRef.current = false;
        setLoadingOlder(false);
      }
    }
  };

  const notFound = errorStatus === 404;

  return (
    <section className="screen chat-detail-screen">
      <Header
        title={detail?.opponent.chat_name || '채팅방'}
        onBack={() => navigate('/chat')}
        right={detail ? (
          <span className={`chat-detail-presence${detail.opponent.is_online ? ' online' : ''}`}>
            <span aria-hidden="true" />
            {detail.opponent.is_online ? '온라인' : '오프라인'}
          </span>
        ) : null}
      />

      {detail?.status === 'ENDED' ? (
        <div className="chat-detail-ended" role="status">종료된 채팅방입니다. 이전 대화만 확인할 수 있어요.</div>
      ) : null}

      {loading ? (
        <div className="chat-detail-state" role="status">대화 내용을 불러오고 있어요.</div>
      ) : null}

      {!loading && errorStatus !== null ? (
        <div className="empty-box chat-detail-error" role="alert">
          <strong>{notFound ? '채팅방을 찾을 수 없어요' : '대화 내용을 불러오지 못했어요'}</strong>
          <p>{notFound ? '채팅방이 없거나 조회할 권한이 없습니다.' : '잠시 후 다시 시도해 주세요.'}</p>
          <button type="button" className="chat-room-retry" onClick={() => void loadDetail()}>
            다시 시도
          </button>
        </div>
      ) : null}

      {!loading && errorStatus === null && detail ? (
        <div className="chat-detail-scroll" ref={scrollRef}>
          {detail.has_next ? (
            <button
              type="button"
              className="chat-detail-older"
              disabled={loadingOlder}
              onClick={() => void loadOlderMessages()}>
              {loadingOlder ? '이전 대화를 불러오는 중...' : olderError ? '다시 시도' : '이전 대화 불러오기'}
            </button>
          ) : null}

          {messages.length === 0 ? (
            <div className="chat-detail-empty">
              <span aria-hidden="true">💬</span>
              <p>아직 대화가 없습니다.</p>
            </div>
          ) : (
            <div className="chat-message-list">
              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const startsNewDay = !previous || messageDay(previous.sent_at) !== messageDay(message.sent_at);
                const mine = message.sender_id === user?.user_id;

                return (
                  <div className="chat-message-item" key={message.chat_id}>
                    {startsNewDay ? (
                      <div className="chat-detail-date"><span>{formatMessageDate(message.sent_at)}</span></div>
                    ) : null}
                    <MessageBubble message={message} mine={mine} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
