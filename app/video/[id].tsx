import { videosApi } from '@/src/api';
import { Button } from '@/src/components/ui/Button';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { colors, radius } from '@/src/theme';
import type { TravelVideo } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

export default function VideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const planId = Number(id);
  const [video, setVideo] = useState<TravelVideo | null>(null);

  const load = async () => setVideo(await videosApi.getByPlan(planId));

  useEffect(() => {
    void load();
    const timer = setInterval(load, 1200);
    return () => clearInterval(timer);
  }, [planId]);

  return (
    <Screen>
      <ScreenHeader title="여행 영상" onBack={() => router.back()} />
      <View style={styles.body}>
        <View style={styles.thumb}>
          <Ionicons
            name={video?.status === 'COMPLETED' ? 'play' : video?.status === 'FAILED' ? 'close' : 'hourglass-outline'}
            size={36}
            color={colors.white}
          />
        </View>
        <Text style={styles.status}>
          {video?.status === 'GENERATING'
            ? '영상을 만들고 있어요'
            : video?.status === 'FAILED'
              ? video.error_message ?? '영상 생성에 실패했습니다.'
              : '여행 영상이 준비되었습니다'}
        </Text>
        {video?.status === 'COMPLETED' && video.video_url ? (
          <Button label="영상 재생" onPress={() => Linking.openURL(video.video_url!)} />
        ) : (
          <Button
            label={video?.status === 'FAILED' ? '다시 생성하기' : '영상 생성 요청'}
            variant="dark"
            onPress={async () => {
              if (video?.status === 'FAILED' && video.video_id) await videosApi.regenerate(video.video_id);
              else await videosApi.generate(planId);
              await load();
            }}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, padding: 24, gap: 18 },
  thumb: {
    height: 210,
    borderRadius: radius.xl,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: { textAlign: 'center', color: colors.muted, fontWeight: '700' },
});
