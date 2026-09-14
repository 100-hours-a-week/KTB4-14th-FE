import { matchingApi } from '@/api';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Header } from '@/components/Header';
import { useToast } from '@/context/ToastContext';
import { companionOptions, regionOptions, styleOptions } from '@/lib/options';
import type { MatchingSettings } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function MatchingSettingsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [settings, setSettings] = useState<MatchingSettings>({ enabled: false });

  useEffect(() => {
    matchingApi.getSettings().then(setSettings);
  }, []);

  return (
    <section className="screen">
      <Header title="매칭 설정" onBack={() => navigate(-1)} />
      <div className="scroll">
        <div className="setting-row">
          <strong>매칭 사용</strong>
          <input type="checkbox" className="switch" checked={settings.enabled} onChange={(e) => setSettings((prev) => ({ ...prev, enabled: e.target.checked }))} />
        </div>
        <span className="field-label">여행 스타일</span>
        <div className="chips">
          {styleOptions.map((item) => (
            <Chip key={item.value} label={item.label} selected={settings.style === item.value} onClick={() => setSettings((prev) => ({ ...prev, style: item.value }))} />
          ))}
        </div>
        <span className="field-label">선호 지역</span>
        <div className="chips">
          {regionOptions.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={settings.region_preference === item.value}
              onClick={() => setSettings((prev) => ({ ...prev, region_preference: item.value }))}
            />
          ))}
        </div>
        <span className="field-label">동행 선호</span>
        <div className="chips">
          {companionOptions.map((item) => (
            <Chip key={item.value} label={item.label} selected={settings.companion === item.value} onClick={() => setSettings((prev) => ({ ...prev, companion: item.value }))} />
          ))}
        </div>
      </div>
      <div className="footer-bar">
        <Button
          label="저장"
          variant="dark"
          onClick={async () => {
            await matchingApi.updateSettings(settings);
            toast.show('매칭 설정이 저장되었습니다.');
            navigate(-1);
          }}
        />
      </div>
    </section>
  );
}
