import { matchingApi } from '@/api';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import { useToast } from '@/context/ToastContext';
import { travelPaceOptions, travelThemeOptions } from '@/lib/options';
import type { TravelPaceType, TravelTheme, UpdateMatchingSettingsRequest } from '@/types';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_SETTINGS: UpdateMatchingSettingsRequest = {
  is_active: false,
  pace: 'BALANCED',
  themes: [],
};

function sameSettings(a: UpdateMatchingSettingsRequest, b: UpdateMatchingSettingsRequest) {
  return a.is_active === b.is_active && a.pace === b.pace && a.themes.join('|') === b.themes.join('|');
}

function normalizeThemes(themes: TravelTheme[]) {
  return travelThemeOptions
    .map((option) => option.value)
    .filter((theme): theme is TravelTheme => themes.includes(theme));
}

export function MatchingSettingsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [settings, setSettings] = useState<UpdateMatchingSettingsRequest>(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<UpdateMatchingSettingsRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    matchingApi
      .getSettings()
      .then((next) => {
        if (!alive) return;
        const form = {
          is_active: next.is_active,
          pace: next.pace ?? 'BALANCED',
          themes: normalizeThemes(next.themes),
        };
        setSettings(form);
        setInitialSettings(form);
      })
      .catch(() => {
        if (alive) toast.show('매칭 설정을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [toast]);

  const hasChanges = useMemo(() => {
    if (!initialSettings) return false;
    return !sameSettings(initialSettings, settings);
  }, [initialSettings, settings]);

  const canSave = !loading && !saving && (!settings.is_active || settings.themes.length > 0);

  const handleBack = () => {
    if (hasChanges) {
      setLeaveConfirmOpen(true);
      return;
    }
    navigate(-1);
  };

  const toggleTheme = (theme: TravelTheme) => {
    setSettings((prev) => {
      const hasTheme = prev.themes.includes(theme);
      if (!hasTheme && prev.themes.length >= 4) {
        toast.show('선호 여행은 최대 4개까지 선택할 수 있어요.');
        return prev;
      }

      const nextThemes = hasTheme ? prev.themes.filter((item) => item !== theme) : [...prev.themes, theme];
      return { ...prev, themes: normalizeThemes(nextThemes) };
    });
  };

  const saveSettings = async () => {
    if (settings.is_active && settings.themes.length === 0) {
      toast.show('선호 여행을 최소 1개 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      const saved = await matchingApi.updateSettings(settings);
      const form = {
        is_active: saved.is_active,
        pace: saved.pace ?? settings.pace,
        themes: normalizeThemes(saved.themes),
      };
      setSettings(form);
      setInitialSettings(form);
      toast.show('매칭 설정이 저장되었습니다.');
    } catch {
      toast.show('매칭 설정을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="screen matching-settings-screen">
      <Header title="매칭 설정" onBack={handleBack} showBell />
      <div className="scroll matching-settings-scroll">
        <div className="matching-settings-card">
          <div className="matching-settings-copy">
            <strong>매칭 대상으로 설정하기</strong>
            <p>끄면 다른 사용자에게 노출되지 않아요.</p>
          </div>
          <input
            type="checkbox"
            className="switch"
            checked={settings.is_active}
            disabled={loading}
            aria-label="매칭 대상으로 설정하기"
            onChange={(e) => setSettings((prev) => ({ ...prev, is_active: e.target.checked }))}
          />
        </div>

        <h2 className="matching-settings-section-title">매칭 프로필</h2>

        <fieldset className="matching-settings-fieldset">
          <legend>여행 스타일</legend>
          <div className="matching-choice-grid three">
            {travelPaceOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`matching-choice${settings.pace === option.value ? ' selected' : ''}`}
                disabled={loading}
                onClick={() => setSettings((prev) => ({ ...prev, pace: option.value as TravelPaceType }))}>
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="matching-settings-fieldset">
          <legend>
            선호 여행
            <small>{settings.themes.length} / 4</small>
          </legend>
          <div className="matching-choice-grid">
            {travelThemeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`matching-choice${settings.themes.includes(option.value) ? ' selected' : ''}`}
                disabled={loading}
                onClick={() => toggleTheme(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
          <p className={`matching-help${settings.is_active && settings.themes.length === 0 ? ' error' : ''}`}>
            {settings.is_active && settings.themes.length === 0
              ? '매칭 대상으로 설정하려면 선호 여행을 최소 1개 선택해주세요.'
              : '관심 있는 여행 테마를 최대 4개까지 선택할 수 있어요.'}
          </p>
        </fieldset>

        {hasChanges ? <p className="matching-unsaved">저장하지 않은 변경사항이 있습니다.</p> : null}
      </div>
      <div className="footer-bar matching-settings-footer">
        <Button label="설정 저장" variant="dark" loading={saving} disabled={!canSave} onClick={saveSettings} />
      </div>
      <Modal
        open={leaveConfirmOpen}
        title="변경사항이 있습니다."
        message="저장하지 않고 나가면 변경한 매칭 설정이 반영되지 않습니다."
        confirmLabel="나가기"
        cancelLabel="계속 수정"
        onClose={() => setLeaveConfirmOpen(false)}
        onConfirm={() => navigate(-1)}
      />
    </section>
  );
}
