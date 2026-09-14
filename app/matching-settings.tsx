import { matchingApi } from '@/src/api';
import { Button } from '@/src/components/ui/Button';
import { Chip } from '@/src/components/ui/Chip';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { useToast } from '@/src/context/ToastContext';
import { companionOptions, regionOptions, styleOptions } from '@/src/lib/options';
import { colors, radius } from '@/src/theme';
import type { MatchingSettings } from '@/src/types';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

export default function MatchingSettingsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [settings, setSettings] = useState<MatchingSettings>({ enabled: false });

  useEffect(() => {
    matchingApi.getSettings().then(setSettings);
  }, []);

  return (
    <Screen>
      <ScreenHeader title="매칭 설정" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>매칭 사용</Text>
          <Switch
            value={settings.enabled}
            onValueChange={(enabled) => setSettings((prev) => ({ ...prev, enabled }))}
            trackColor={{ true: colors.navy }}
          />
        </View>
        <Text style={styles.cap}>여행 스타일</Text>
        <View style={styles.wrap}>
          {styleOptions.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={settings.style === item.value}
              onPress={() => setSettings((prev) => ({ ...prev, style: item.value }))}
            />
          ))}
        </View>
        <Text style={styles.cap}>선호 지역</Text>
        <View style={styles.wrap}>
          {regionOptions.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={settings.region_preference === item.value}
              onPress={() => setSettings((prev) => ({ ...prev, region_preference: item.value }))}
            />
          ))}
        </View>
        <Text style={styles.cap}>동행 선호</Text>
        <View style={styles.wrap}>
          {companionOptions.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={settings.companion === item.value}
              onPress={() => setSettings((prev) => ({ ...prev, companion: item.value }))}
            />
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label="저장"
          variant="dark"
          onPress={async () => {
            await matchingApi.updateSettings(settings);
            toast.show('매칭 설정이 저장되었습니다.');
            router.back();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  footer: { padding: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 20,
  },
  label: { fontWeight: '800', color: colors.navy, fontSize: 16 },
  cap: { fontWeight: '800', color: colors.navy, marginBottom: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
});
