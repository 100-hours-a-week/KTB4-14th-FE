import { ApiError, USE_MOCK } from '@/api/client';
import type { ChatRealtimeEvent } from '@/api/chatRealtime';
import { chatApi, chatRoomDetailApi } from '@/api';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { ChatRoomDetailMessage, ChatRoomDetailResponse } from '@/types/chat-detail';
import type { ChatMessageSendResponse } from '@/types';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const PAGE_SIZE = 20;
const CATCH_UP_PAGE_SIZE = 100;

type ChatMessage = ChatRoomDetailMessage & { message_seq?: number };

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

function normalizeMessageContent(value: string) {
  return value.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, '');
}

function toChatMessage(response: ChatMessageSendResponse, senderId = response.sender_id): ChatMessage {
  return {
    chat_id: response.message_id,
    message_seq: response.message_seq,
    sender_id: senderId,
    content: response.content,
    sent_at: response.sent_at,
    is_read: false,
  };
}

function compareMessages(left: ChatMessage, right: ChatMessage) {
  if (left.message_seq !== undefined && right.message_seq !== undefined) {
    return left.message_seq - right.message_seq;
  }
  const timeOrder = new Date(left.sent_at).getTime() - new Date(right.sent_at).getTime();
  return timeOrder || left.chat_id - right.chat_id;
}

function createClientMessageId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
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

export function ChatRoomMessagingPage() {
  const { roomId: rawRoomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const roomId = Number(rawRoomId);
  const validRoomId = Number.isSafeInteger(roomId) && roomId > 0;
  const [detail, setDetail] = useState<ChatRoomDetailResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingScrollHeightRef = useRef<number | null>(null);
  const shouldScrollToBottomRef = useRef(false);
  const initialPageLoadedRef = useRef(false);
  const requestIdRef = useRef(0);
  const loadingOlderRef = useRef(false);
  const sequenceCursorRef = useRef(0);
  const pendingSequencesRef = useRef(new Set<number>());
  const retryRequestRef = useRef<{ content: string; clientMessageId: string } | null>(null);
  const sendingRef = useRef(false);
  const leavingRef = useRef(false);

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    const container = scrollRef.current;
    if (container && container.scrollHeight - container.scrollTop - container.clientHeight < 100) {
      shouldScrollToBottomRef.current = true;
    }
    setMessages((current) => {
      const merged = new Map(current.map((message) => [message.chat_id, message]));
      incoming.forEach((message) => {
        const previous = merged.get(message.chat_id);
        merged.set(message.chat_id, {
          ...previous,
          ...message,
          is_read: Boolean(previous?.is_read || message.is_read),
        });
      });
      return [...merged.values()].sort(compareMessages);
    });
  }, []);

  const markRoomReadThrough = useCallback((lastReadChatId: number) => {
    void chatApi.markRoomRead(roomId, lastReadChatId).catch(() => undefined);
  }, [roomId]);

  const loadDetail = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setErrorStatus(null);
    setDetail(null);
    setMessages([]);
    setDraft('');
    setSendError(null);
    setSyncError(false);
    setRealtimeConnected(false);
    sequenceCursorRef.current = 0;
    pendingSequencesRef.current.clear();
    retryRequestRef.current = null;
    loadingOlderRef.current = false;
    setLoadingOlder(false);
    setOlderError(false);
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
      initialPageLoadedRef.current = true;
      setDetail(response);
      setMessages(response.chats);
      const lastMessage = response.chats.at(-1);
      if (lastMessage) markRoomReadThrough(lastMessage.chat_id);
      sequenceCursorRef.current = response.chats.reduce(
        (latest, message) => Math.max(latest, message.message_seq ?? 0),
        0,
      );
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setErrorStatus(error instanceof ApiError ? error.status : 0);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [markRoomReadThrough, roomId, validRoomId]);

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
      shouldScrollToBottomRef.current = false;
      return;
    }

    if (shouldScrollToBottomRef.current) {
      container.scrollTop = container.scrollHeight;
      shouldScrollToBottomRef.current = false;
    }
  }, [messages]);

  useEffect(() => {
    const opponentUserId = detail?.opponent.user_id;
    const currentUserId = user?.user_id;
    if (
      opponentUserId === undefined ||
      loading ||
      detail?.status !== 'ACTIVE' ||
      !validRoomId ||
      USE_MOCK
    ) return;

    let active = true;
    let catchingUp = false;
    let catchUpAgain = false;
    let catchUpRetryTimer: number | null = null;

    const advancePendingSequences = () => {
      while (pendingSequencesRef.current.delete(sequenceCursorRef.current + 1)) {
        sequenceCursorRef.current += 1;
      }
    };

    const scheduleCatchUpRetry = () => {
      if (catchUpRetryTimer !== null) return;
      catchUpRetryTimer = window.setTimeout(() => {
        catchUpRetryTimer = null;
        void catchUp();
      }, 5_000);
    };

    const syncReadStates = async () => {
      try {
        const latestDetail = await chatRoomDetailApi.getRoomDetail(roomId, { size: PAGE_SIZE });
        if (!active) return;
        const readStates = new Map(
          latestDetail.chats.map((message) => [message.chat_id, message.is_read]),
        );
        setMessages((current) => current.map((message) => {
          const isRead = readStates.get(message.chat_id);
          return isRead === undefined ? message : { ...message, is_read: message.is_read || isRead };
        }));
      } catch {
        return;
      }
    };

    const catchUp = async () => {
      if (!active) return;
      if (catchingUp) {
        catchUpAgain = true;
        return;
      }
      if (catchUpRetryTimer !== null) {
        window.clearTimeout(catchUpRetryTimer);
        catchUpRetryTimer = null;
      }
      catchingUp = true;
      setSyncError(false);
      do {
        catchUpAgain = false;
        let afterSequence = sequenceCursorRef.current;
        let hasNext = true;
        try {
          while (active && hasNext) {
            const page = await chatApi.getMessagesAfter(roomId, afterSequence, CATCH_UP_PAGE_SIZE);
            if (!active) return;
            mergeMessages(page.messages.map((message) => toChatMessage(message)));
            const latestMessage = page.messages.at(-1);
            if (
              latestMessage &&
              currentUserId !== undefined &&
              page.messages.some((message) => message.sender_id !== currentUserId)
            ) {
              markRoomReadThrough(latestMessage.message_id);
            }
            const nextSequence = Math.max(afterSequence, page.next_after_message_seq);
            pendingSequencesRef.current.forEach((sequence) => {
              if (sequence <= nextSequence) pendingSequencesRef.current.delete(sequence);
            });
            sequenceCursorRef.current = Math.max(sequenceCursorRef.current, nextSequence);
            advancePendingSequences();
            hasNext = page.has_next;
            if (hasNext && nextSequence <= afterSequence) {
              hasNext = false;
              setSyncError(true);
            }
            afterSequence = nextSequence;
          }
        } catch {
          if (active) {
            setSyncError(true);
            scheduleCatchUpRetry();
          }
        }
      } while (active && catchUpAgain);
      catchingUp = false;
    };

    const handleMessage = (event: ChatRealtimeEvent) => {
      if (event.event_type === 'READ_RECEIPT_UPDATED') {
        if (event.reader_id !== opponentUserId || currentUserId === undefined) return;
        setMessages((current) => current.map((message) => (
          message.sender_id === currentUserId &&
          message.message_seq !== undefined &&
          message.message_seq <= event.read_through_message_seq
            ? { ...message, is_read: true }
            : message
        )));
        return;
      }

      mergeMessages([toChatMessage(event.data)]);
      if (currentUserId !== undefined && event.data.sender_id !== currentUserId) {
        markRoomReadThrough(event.data.message_id);
      }
      const sequence = event.data.message_seq;
      if (sequence <= sequenceCursorRef.current) return;
      pendingSequencesRef.current.add(sequence);
      advancePendingSequences();
      if (sequence > sequenceCursorRef.current) void catchUp();
    };

    let disconnect: (() => void) | null = null;
    void import('@/api/chatRealtime').then(({ connectChatRealtime }) => {
      if (!active) return;
      disconnect = connectChatRealtime(
        roomId,
        handleMessage,
        (connected) => {
          if (active) setRealtimeConnected(connected);
        },
        () => {
          void catchUp();
          void syncReadStates();
        },
      );
    });

    return () => {
      active = false;
      if (catchUpRetryTimer !== null) window.clearTimeout(catchUpRetryTimer);
      disconnect?.();
      setRealtimeConnected(false);
    };
  }, [
    detail?.opponent.user_id,
    detail?.status,
    loading,
    markRoomReadThrough,
    mergeMessages,
    roomId,
    user?.user_id,
    validRoomId,
  ]);

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
      const currentIds = new Set(messages.map((message) => message.chat_id));
      const uniqueOlderMessages = olderPage.chats.filter(
        (message) => !currentIds.has(message.chat_id),
      );
      if (uniqueOlderMessages.length > 0) {
        setMessages((current) => {
          const latestIds = new Set(current.map((message) => message.chat_id));
          const stillUnique = uniqueOlderMessages.filter((message) => !latestIds.has(message.chat_id));
          return [...stillUnique, ...current].sort(compareMessages);
        });
      } else {
        pendingScrollHeightRef.current = null;
      }
      setDetail((current) => current ? { ...current, ...olderPage, chats: [] } : current);
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

  const sendDraft = async () => {
    if (sendingRef.current || !detail || detail.status === 'ENDED') return;
    const content = normalizeMessageContent(draft);
    const characterCount = Array.from(content).length;
    if (characterCount === 0) {
      setSendError('메시지를 입력해 주세요.');
      return;
    }
    if (characterCount > 500) {
      setSendError('앞뒤 공백을 정리한 메시지는 유니코드 문자 기준 500자까지 보낼 수 있어요.');
      return;
    }

    const previousRequest = retryRequestRef.current;
    const clientMessageId = previousRequest?.content === content
      ? previousRequest.clientMessageId
      : createClientMessageId();
    retryRequestRef.current = { content, clientMessageId };
    sendingRef.current = true;
    setSending(true);
    setSendError(null);

    try {
      const response = await chatApi.sendMessage(roomId, {
        client_message_id: clientMessageId,
        content,
      });
      shouldScrollToBottomRef.current = true;
      mergeMessages([toChatMessage(response, user?.user_id ?? response.sender_id)]);
      retryRequestRef.current = null;
      setDraft('');
    } catch (error) {
      if (error instanceof ApiError && error.message === 'chat_room_ended') {
        setDetail((current) => current ? { ...current, status: 'ENDED' } : current);
        setSendError('종료된 채팅방에서는 메시지를 보낼 수 없어요.');
      } else if (error instanceof ApiError && error.status === 404) {
        setSendError('이 채팅방에 참여 중이 아니어서 메시지를 보낼 수 없어요.');
      } else if (error instanceof ApiError && error.status === 429) {
        const waitMessage = error.retryAfterSeconds
          ? `${error.retryAfterSeconds}초 뒤에 다시 시도해 주세요.`
          : '잠시 후 다시 시도해 주세요.';
        setSendError(`메시지 전송이 잠시 제한됐어요. ${waitMessage}`);
      } else if (error instanceof ApiError && error.message === 'idempotency_key_conflict') {
        setSendError('전송 요청을 확인할 수 없어요. 내용을 수정한 뒤 다시 시도해 주세요.');
      } else {
        setSendError('메시지를 전송하지 못했어요. 같은 내용을 다시 보내면 중복 전송을 방지할 수 있어요.');
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const leaveRoom = async () => {
    if (leavingRef.current || !detail || detail.status !== 'ACTIVE') return;

    leavingRef.current = true;
    setLeaving(true);
    try {
      await chatApi.leaveRoom(roomId);
      setLeaveDialogOpen(false);
      toast.show('채팅방에서 나왔어요.');
      navigate('/chat', { replace: true });
    } catch (error) {
      setLeaveDialogOpen(false);
      if (error instanceof ApiError && error.status === 404) {
        toast.show('채팅방을 찾을 수 없거나 이미 나간 상태예요.');
        navigate('/chat', { replace: true });
      } else if (error instanceof ApiError && error.message === 'chat_room_ended') {
        setDetail((current) => current ? { ...current, status: 'ENDED' } : current);
        toast.show('이미 종료된 채팅방이에요.');
      } else {
        toast.show('채팅방에서 나가지 못했어요. 다시 시도해 주세요.');
      }
    } finally {
      leavingRef.current = false;
      setLeaving(false);
    }
  };

  const title = detail?.opponent.chat_name || '채팅방';
  const notFound = errorStatus === 404;

  return (
    <section className="screen chat-detail-screen">
      <Header
        className="chat-detail-header"
        title={title}
        onBack={() => navigate('/chat')}
        right={detail ? (
          <div className="chat-detail-header-actions">
            <span className={`chat-detail-presence${detail.opponent.is_online ? ' online' : ''}`}>
              <span aria-hidden="true" />
              {detail.opponent.is_online ? '온라인' : '오프라인'}
            </span>
            {detail.status === 'ACTIVE' ? (
              <button
                type="button"
                className="chat-detail-leave-button"
                disabled={leaving || sending}
                onClick={() => setLeaveDialogOpen(true)}
              >
                나가기
              </button>
            ) : null}
          </div>
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

      {!loading && !errorStatus && detail ? (
        <>
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

          {detail.status === 'ACTIVE' ? (
            <form
              className="chat-composer"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void sendDraft();
              }}>
              {syncError ? (
                <p className="chat-composer-sync-error" role="status">메시지를 동기화하지 못했어요. 연결이 복구되면 다시 불러옵니다.</p>
              ) : null}
              {sendError ? <p className="chat-composer-error" role="alert">{sendError}</p> : null}
              <div className="chat-composer-row">
                <textarea
                  aria-label="메시지 입력"
                  className="chat-composer-input"
                  rows={2}
                  value={draft}
                  disabled={sending}
                  placeholder="메시지를 입력하세요"
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setSendError(null);
                  }}
                  onKeyDown={handleComposerKeyDown}
                />
                <button
                  type="submit"
                  className="chat-composer-send"
                  disabled={sending || Array.from(normalizeMessageContent(draft)).length === 0 || Array.from(normalizeMessageContent(draft)).length > 500}>
                  {sending ? '전송 중' : '전송'}
                </button>
              </div>
              <div className="chat-composer-footer">
                <span>{realtimeConnected ? '실시간 수신 연결됨' : USE_MOCK ? '목 데이터 모드' : '실시간 연결 중'}</span>
                <span>유니코드 문자 기준 {Array.from(normalizeMessageContent(draft)).length}/500</span>
              </div>
            </form>
          ) : null}
        </>
      ) : null}

      <Modal
        open={leaveDialogOpen}
        title="채팅방에서 나가시겠어요?"
        message="나가면 채팅방이 종료되어 더 이상 메시지를 주고받을 수 없어요."
        confirmLabel="나가기"
        cancelLabel="취소"
        confirmBusy={leaving}
        onClose={() => {
          if (!leaving) setLeaveDialogOpen(false);
        }}
        onConfirm={leaveRoom}
      />
    </section>
  );
}
