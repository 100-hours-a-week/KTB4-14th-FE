import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { useToast } from '@/context/ToastContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

type MatchCandidate = {
  user_id: number;
  nickname: string;
  match_rate: number;
  description: string;
  tags: string[];
};

const mockCandidates: MatchCandidate[] = [
  {
    user_id: 201,
    nickname: '닉네임1',
    match_rate: 89,
    description: '취향 일치 89%',
    tags: ['자연', '맛집', '여유로운 일정'],
  },
  {
    user_id: 202,
    nickname: '닉네임2',
    match_rate: 76,
    description: '취향 일치 76%',
    tags: ['자연', '미식', '균형있는 일정'],
  },
  {
    user_id: 203,
    nickname: '닉네임3',
    match_rate: 49,
    description: '취향 일치 49%',
    tags: ['문화', 'SNS', '알찬 일정'],
  },
];

export function MatchingResultPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const isFailed = searchParams.get('status') === 'failed';

  const retryMatching = () => {
    navigate('/matching');
  };

  if (isFailed) {
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
          {mockCandidates.map((candidate) => (
            <article key={candidate.user_id} className="matching-candidate-card">
              <div className="matching-candidate-avatar" aria-hidden="true">
                ●
              </div>
              <div className="matching-candidate-copy">
                <small>최적의 여행 메이트</small>
                <strong>{candidate.nickname}</strong>
                <span>{candidate.description}</span>
                <p>{candidate.tags.join(' · ')}</p>
              </div>
              <button
                type="button"
                className="matching-candidate-send"
                aria-label={`${candidate.nickname}에게 메시지 보내기`}
                onClick={() => toast.show('채팅 연결은 준비 중입니다.')}>
                ➤
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
