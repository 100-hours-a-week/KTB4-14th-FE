import { notificationsApi } from '@/api';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { useToast } from '@/context/ToastContext';
import type { NotificationSettings } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ITEMS: { key: keyof NotificationSettings; label: string; desc: string }[] = [
  { key: 'match_success_enabled', label: '매칭 성공', desc: '새로운 매칭이 완료되면 알려드려요' },
  { key: 'chat_enabled', label: '새 채팅', desc: '새로운 메시지가 도착하면 알려드려요' },
  { key: 'travel_before_enabled', label: '여행 D-1', desc: '출발 하루 전에 리마인드해요' },
  { key: 'travel_complete_enabled', label: '여행 생성 결과', desc: 'AI 일정 생성 완료 또는 실패를 알려드려요' },
  { key: 'notification_enabled', label: '전체 알림', desc: '서비스 알림 수신 여부를 설정해요' },
];

export function NotificationSettingsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [settings, setSettings] = useState<NotificationSettings>({
    match_success_enabled: true,
    chat_enabled: true,
    travel_before_enabled: true,
    travel_complete_enabled: true,
    notification_enabled: true,
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
