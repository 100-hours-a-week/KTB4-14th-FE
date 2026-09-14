import { notificationsApi } from '@/src/api';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { colors, radius } from '@/src/theme';
import type { AppNotification, NotificationType } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  TRAVEL_READY: 'sparkles',
  NEW_CHAT: 'chatbubble-ellipses-outline',
  TRAVEL_D1: 'calendar-outline',
  TRAVEL_FAILED: 'alert-circle-outline',
};

function timeLabel(value: string) {
  const date = new Date(value);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = async () => setItems(await notificationsApi.list());
  useEffect(() => {
    void load();
  }, []);

  return (
    <Screen>
      <ScreenHeader
        title="알림"
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={async () => {
              await notificationsApi.markAllRead();
              await load();
            }}
            style={{ paddingRight: 8 }}>
            <Text style={styles.readAll}>모두 읽음</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>알림이 없습니다.</Text>
          </View>
        ) : (
          items.map((item) => (
            <Pressable
              key={item.notification_id}
              style={[styles.row, !item.is_read && styles.unread]}
              onPress={async () => {
                await notificationsApi.markRead(item.notification_id);
                await load();
                if (item.travel_plan_id) router.push(`/itinerary/${item.travel_plan_id}`);
              }}>
              <View style={styles.icon}>
                <Ionicons name={ICONS[item.type]} size={16} color={colors.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
              </View>
              <Text style={styles.time}>{timeLabel(item.created_at)}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  readAll: { color: colors.muted, fontWeight: '800', fontSize: 12 },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyText: { color: colors.muted, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 8,
  },
  unread: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '800', color: colors.navy },
  body: { marginTop: 4, color: colors.muted, fontSize: 13 },
  time: { color: colors.muted, fontSize: 11 },
});
