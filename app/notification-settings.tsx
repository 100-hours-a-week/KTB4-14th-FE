import { notificationsApi } from '@/src/api';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { useToast } from '@/src/context/ToastContext';
import { colors, radius } from '@/src/theme';
import type { NotificationSettings } from '@/src/types';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

const ITEMS: { key: keyof NotificationSettings; label: string; desc: string }[] = [
  { key: 'travel_ready', label: '여행 추천 완료', desc: 'AI 일정 생성이 끝나면 알려드려요' },
  { key: 'new_chat', label: '새 채팅', desc: '새로운 메시지가 도착하면 알려드려요' },
  { key: 'travel_d1', label: '여행 D-1', desc: '출발 하루 전에 리마인드해요' },
  { key: 'travel_failed', label: '일정 생성 실패', desc: '생성에 실패하면 바로 안내해요' },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
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
    <Screen>
      <ScreenHeader title="알림 설정" onBack={() => router.back()} />
      <View style={styles.content}>
        {ITEMS.map((item) => (
          <View key={item.key} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.desc}>{item.desc}</Text>
            </View>
            <Switch
              value={settings[item.key]}
              onValueChange={(value) => setSettings((prev) => ({ ...prev, [item.key]: value }))}
              trackColor={{ true: colors.navy }}
            />
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Button
          label="저장"
          variant="dark"
          onPress={async () => {
            await notificationsApi.updateSettings(settings);
            toast.show('알림 설정이 저장되었습니다.');
            router.back();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 8, flex: 1 },
  footer: { padding: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 12,
  },
  label: { fontWeight: '800', color: colors.navy, fontSize: 15 },
  desc: { marginTop: 4, color: colors.muted, fontSize: 12 },
});
