import { matchingApi } from '@/api';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { useToast } from '@/context/ToastContext';
import { travelPaceOptions, travelThemeOptions } from '@/lib/options';
import { getJson, storage } from '@/storage';
import type { MatchingCandidate, MatchingCandidatesResponse, TravelPaceType, TravelTheme } from '@/types';
import { useState } from 'react';
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
  const isFailed = searchParams.get('status') === 'failed';
  const state = location.state as { candidatesResponse?: MatchingCandidatesResponse } | null;
  const candidatesResponse =
    state?.candidatesResponse ?? getJson<MatchingCandidatesResponse>(storage.keys.matchingCandidatesResult);
  const candidates = candidatesResponse?.candidates ?? [];

  const retryMatching = () => {
    navigate('/matching');
  };

  const openChatEntry = async (candidate: MatchingCandidate) => {
    if (preparingCandidateUserId !== null) return;

    setPreparingCandidateUserId(candidate.user_id);
    try {
      const connection = await matchingApi.respondCandidate(candidate.user_id);
      const chatRoom = await matchingApi.prepareChatRoom(connection.match_connection_id);
      navigate(`/chat/${chatRoom.chat_room_id}`);
    } catch {
      toast.show('채팅방을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setPreparingCandidateUserId(null);
    }
  };

  if (isFailed || candidates.length === 0) {
    return (
      <section className="screen matching-result-screen">
        <Header title="매칭 실패" onBack={() => navigate('/matching')} showBell />
        <div className="scroll matching-result-fail">
          <div className="matching-result-icon fail" aria-hidden="true">
            !
          </div>
          <h2>매칭에 실패했습니다...</h2>
          <p>조건에 맞는 여행 메이트를 찾지 못했어요.</p>
        </div>
        <div className="footer-bar matching-footer">
          <Button label="매칭 다시하기" variant="ghost" onClick={retryMatching} />
        </div>
      </section>
    );
  }

  return (
    <section className="screen matching-result-screen">
      <Header title="매칭 완료" onBack={() => navigate('/matching')} showBell />
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
      <div className="footer-bar matching-footer">
        <Button label="매칭 다시하기" variant="ghost" onClick={retryMatching} />
      </div>
    </section>
  );
}
