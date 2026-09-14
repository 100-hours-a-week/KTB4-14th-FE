import { notificationsApi } from '@/api';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { useToast } from '@/context/ToastContext';
import type { NotificationSettings } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ITEMS: { key: keyof NotificationSettings; label: string; desc: string }[] = [
  { key: 'travel_ready', label: '여행 추천 완료', desc: 'AI 일정 생성이 끝나면 알려드려요' },
  { key: 'new_chat', label: '새 채팅', desc: '새로운 메시지가 도착하면 알려드려요' },
  { key: 'travel_d1', label: '여행 D-1', desc: '출발 하루 전에 리마인드해요' },
  { key: 'travel_failed', label: '일정 생성 실패', desc: '생성에 실패하면 바로 안내해요' },
];

export function NotificationSettingsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [settings, setSettings] = useState<NotificationSettings>({
    travel_ready: true,
    new_chat: true,
    travel_d1: true,
    travel_failed: true,
  });

  useEffect(() => {
    notificationsApi.getSettings().then(setSettings);
  }, []);

  return (
    <section className="screen">
      <Header title="알림 설정" onBack={() => navigate(-1)} />
      <div className="scroll">
        {ITEMS.map((item) => (
          <div key={item.key} className="setting-row">
            <div>
              <strong>{item.label}</strong>
              <div className="place-addr">{item.desc}</div>
            </div>
            <input
              type="checkbox"
              className="switch"
              checked={settings[item.key]}
              onChange={(e) => setSettings((prev) => ({ ...prev, [item.key]: e.target.checked }))}
            />
          </div>
        ))}
      </div>
      <div className="footer-bar">
        <Button
          label="저장"
          variant="dark"
          onClick={async () => {
            await notificationsApi.updateSettings(settings);
            toast.show('알림 설정이 저장되었습니다.');
            navigate(-1);
          }}
        />
      </div>
    </section>
  );
}
