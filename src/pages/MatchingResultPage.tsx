import { matchingApi } from '@/api';
import { ApiError } from '@/api/client';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { useToast } from '@/context/ToastContext';
import { travelPaceOptions, travelThemeOptions } from '@/lib/options';
import { getJson, setJson, storage } from '@/storage';
import type { MatchingCandidate, MatchingCandidatesResponse, TravelPaceType, TravelTheme } from '@/types';
import { useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

const themeLabels = new Map<TravelTheme, string>(travelThemeOptions.map((option) => [option.value, option.label]));
const paceLabels = new Map<TravelPaceType, string>(travelPaceOptions.map((option) => [option.value, option.label]));

function candidateTags(candidate: MatchingCandidate) {
  return [...candidate.theme.map((theme) => themeLabels.get(theme) ?? theme), paceLabels.get(candidate.pace) ?? candidate.pace];
}

export function MatchingResultPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [preparingCandidateUserId, setPreparingCandidateUserId] = useState<number | null>(null);
  const [rematching, setRematching] = useState(false);
  const [resetting, setResetting] = useState(false);
  const preparingCandidateUserIdRef = useRef<number | null>(null);
  const rematchingRef = useRef(false);
  const isFailed = searchParams.get('status') === 'failed';
  const state = location.state as {
    candidatesResponse?: MatchingCandidatesResponse;
    notificationBody?: string;
  } | null;
  const rawMatchConnectionId = searchParams.get('matchConnectionId');
  const matchConnectionId = Number(rawMatchConnectionId);
  const openedFromNotification = rawMatchConnectionId !== null;
  const validMatchConnectionId = Number.isSafeInteger(matchConnectionId) && matchConnectionId > 0;
  const [candidatesResponse, setCandidatesResponse] = useState<MatchingCandidatesResponse | null>(() =>
    state?.candidatesResponse ?? getJson<MatchingCandidatesResponse>(storage.keys.matchingCandidatesResult),
  );
  const candidates = candidatesResponse?.candidates ?? [];
  const canRematch = candidatesResponse?.can_rematch ?? false;
  const remainingRetryCount = candidatesResponse?.remaining_retry_count ?? 0;

  const startWithNewConditions = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      await matchingApi.cancelRequest();
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) {
        toast.show('기존 매칭을 종료하지 못했습니다.');
        setResetting(false);
        return;
      }
    }
    storage.clearMatchingState();
    navigate('/matching', { replace: true, state: { startNew: true } });
  };

  const retryMatching = async () => {
    if (rematchingRef.current) return;
    if (!candidatesResponse) {
      storage.clearMatchingCandidates();
      navigate('/matching');
      return;
    }
    if (!canRematch) return;

    rematchingRef.current = true;
    setRematching(true);
    try {
      const response = await matchingApi.rematchCandidates();
      setJson(storage.keys.matchingCandidatesResult, response);
      setCandidatesResponse(response);
      navigate(response.count > 0 ? '/matching/result' : '/matching/result?status=failed', {
        replace: true,
        state: { candidatesResponse: response },
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.show('재매칭을 처리 중이거나 사용 가능한 횟수를 모두 사용했어요.');
      } else {
        toast.show('재매칭에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      rematchingRef.current = false;
      setRematching(false);
    }
  };

  const renderRematchFooter = () => (
    <div className="footer-bar matching-footer matching-rematch-footer">
      {candidatesResponse ? (
        <p className="matching-rematch-status" aria-live="polite">
          {canRematch ? `재매칭 ${remainingRetryCount}회 남음` : '재매칭 기회를 모두 사용했어요'}
        </p>
      ) : null}
      <Button
        label="매칭 다시하기"
        variant="ghost"
        loading={rematching}
        disabled={Boolean(candidatesResponse) && !canRematch}
        onClick={() => void retryMatching()}
      />
      <Button
        label="새 조건으로 다시 찾기"
        variant="soft"
        loading={resetting}
        disabled={rematching}
        onClick={() => void startWithNewConditions()}
      />
    </div>
  );

  const openMatchedChat = async () => {
    if (!validMatchConnectionId || preparingCandidateUserIdRef.current !== null) return;

    preparingCandidateUserIdRef.current = matchConnectionId;
    setPreparingCandidateUserId(matchConnectionId);
    try {
      const chatRoom = await matchingApi.prepareChatRoom(matchConnectionId);
      if (!Number.isSafeInteger(chatRoom.chat_room_id) || chatRoom.chat_room_id < 1) {
        throw new Error('채팅방 ID가 올바르지 않습니다.');
      }
      navigate(`/chat/${chatRoom.chat_room_id}`);
    } catch {
      toast.show('매칭 정보를 확인하지 못했어요. 다시 시도해 주세요.');
    } finally {
      preparingCandidateUserIdRef.current = null;
      setPreparingCandidateUserId(null);
    }
  };

  const openChatEntry = async (candidate: MatchingCandidate) => {
    if (preparingCandidateUserIdRef.current !== null) return;

    preparingCandidateUserIdRef.current = candidate.user_id;
    setPreparingCandidateUserId(candidate.user_id);
    try {
      const connection = await matchingApi.respondCandidate(candidate.user_id);
      storage.clearMatchingState();
      const chatRoom = await matchingApi.prepareChatRoom(connection.match_connection_id);
      if (!Number.isSafeInteger(chatRoom.chat_room_id) || chatRoom.chat_room_id < 1) {
        throw new Error('채팅방 ID가 올바르지 않습니다.');
      }
      navigate(`/chat/${chatRoom.chat_room_id}`);
    } catch {
      toast.show('채팅방을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      preparingCandidateUserIdRef.current = null;
      setPreparingCandidateUserId(null);
    }
  };

  if (openedFromNotification) {
    if (!validMatchConnectionId) {
      return (
        <section className="screen matching-result-screen">
          <Header title="매칭 결과" onBack={() => navigate('/notifications')} showBell />
          <div className="scroll matching-result-fail" role="alert">
            <div className="matching-result-icon fail" aria-hidden="true">!</div>
            <h2>매칭 정보를 확인할 수 없어요</h2>
            <p>알림에 연결된 매칭 정보가 올바르지 않습니다.</p>
          </div>
        </section>
      );
    }

    return (
      <section className="screen matching-result-screen">
        <Header title="매칭 완료" onBack={() => navigate('/notifications')} showBell />
        <div className="scroll matching-result-scroll">
          <div className="matching-result-icon" aria-hidden="true">✓</div>
          <h2 className="matching-result-title">매칭이 완료됐어요!</h2>
          <p className="matching-result-subtitle">
            {state?.notificationBody ?? '매칭된 여행 메이트와 대화를 시작해 보세요.'}
          </p>
        </div>
        <div className="footer-bar matching-footer">
          <Button
            label="메시지 보내기"
            loading={preparingCandidateUserId === matchConnectionId}
            onClick={() => void openMatchedChat()}
          />
        </div>
      </section>
    );
  }

  if ((isFailed && !candidatesResponse) || candidates.length === 0) {
    return (
      <section className="screen matching-result-screen">
        <Header title="매칭 실패" onBack={() => navigate('/home')} showBell />
        <div className="scroll matching-result-fail">
          <div className="matching-result-icon fail" aria-hidden="true">
            !
          </div>
          <h2>매칭에 실패했습니다...</h2>
          <p>조건에 맞는 여행 메이트를 찾지 못했어요.</p>
        </div>
        {renderRematchFooter()}
      </section>
    );
  }

  return (
    <section className="screen matching-result-screen">
      <Header title="매칭 완료" onBack={() => navigate('/home')} showBell />
      <div className="scroll matching-result-scroll">
        <div className="matching-result-icon" aria-hidden="true">
          ◷
        </div>
        <h2 className="matching-result-title">매칭이 완료됐어요!</h2>
        <p className="matching-result-subtitle">마음에 드는 사람에게 메시지를 보내 인사해보세요.</p>

        <div className="matching-candidate-list">
          {candidates.map((candidate) => (
            <article key={candidate.user_id} className="matching-candidate-card">
              {candidate.profile_image_url ? (
                <img className="matching-candidate-avatar" src={candidate.profile_image_url} alt="" />
              ) : (
                <div className="matching-candidate-avatar" aria-hidden="true">
                  ●
                </div>
              )}
              <div className="matching-candidate-copy">
                <small>최적의 여행 메이트</small>
                <strong>{candidate.nickname}</strong>
                <span>취향 일치 {candidate.match_rate}%</span>
                <p>{candidateTags(candidate).join(' · ')}</p>
              </div>
              <button
                type="button"
                className="matching-candidate-send"
                aria-label={`${candidate.nickname}에게 메시지 보내기`}
                aria-busy={preparingCandidateUserId === candidate.user_id}
                disabled={preparingCandidateUserId !== null}
                onClick={() => void openChatEntry(candidate)}>
                {preparingCandidateUserId === candidate.user_id ? '…' : '➤'}
              </button>
            </article>
          ))}
        </div>
      </div>
      {renderRematchFooter()}
    </section>
  );
}
