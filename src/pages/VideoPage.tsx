import { videosApi } from '@/api';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import type { TravelVideo } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function VideoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const planId = Number(id);
  const [video, setVideo] = useState<TravelVideo | null>(null);

  const load = async () => setVideo(await videosApi.getByPlan(planId));

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 1200);
    return () => window.clearInterval(timer);
  }, [planId]);

  return (
    <section className="screen">
      <Header title="여행 영상" onBack={() => navigate(-1)} />
      <div className="scroll">
        <div className="thumb">{video?.status === 'COMPLETED' ? '▶' : video?.status === 'FAILED' ? '✕' : '…'}</div>
        <p className="hint" style={{ margin: '18px 0' }}>
          {video?.status === 'GENERATING'
            ? '영상을 만들고 있어요'
            : video?.status === 'FAILED'
              ? video.error_message ?? '영상 생성에 실패했습니다.'
              : '여행 영상이 준비되었습니다'}
        </p>
        {video?.status === 'COMPLETED' && video.video_url ? (
          <Button label="영상 재생" onClick={() => window.open(video.video_url!, '_blank')} />
        ) : (
          <Button
            label={video?.status === 'FAILED' ? '다시 생성하기' : '영상 생성 요청'}
            variant="dark"
            onClick={async () => {
              if (video?.status === 'FAILED' && video.video_id) await videosApi.regenerate(video.video_id);
              else await videosApi.generate(planId);
              await load();
            }}
          />
        )}
      </div>
    </section>
  );
}
