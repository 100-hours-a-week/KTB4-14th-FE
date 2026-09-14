import { checklistsApi } from '@/src/api';
import { Screen } from '@/src/components/ui/Screen';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { useToast } from '@/src/context/ToastContext';
import { colors, radius } from '@/src/theme';
import type { Checklist } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function ChecklistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const planId = Number(id);
  const [data, setData] = useState<Checklist | null>(null);
  const [text, setText] = useState('');

  const load = async () => {
    const next = await checklistsApi.getByPlan(planId);
    setData(next);
  };

  useEffect(() => {
    void load();
  }, [planId]);

  return (
    <Screen>
      <ScreenHeader title="체크리스트" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {data?.status === 'GENERATING' ? (
          <Text style={styles.hint}>체크리스트를 만드는 중입니다.</Text>
        ) : null}
        {(data?.items ?? []).length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>아직 체크리스트가 없습니다.</Text>
            <Pressable onPress={async () => setData(await checklistsApi.generate(planId))}>
              <Text style={styles.link}>AI로 생성하기</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {data?.items.map((item) => (
              <Pressable
                key={item.checklist_item_id}
                style={styles.item}
                onPress={async () => {
                  await checklistsApi.updateItem(item.checklist_item_id, { is_checked: !item.is_checked });
                  await load();
                }}>
                <Ionicons
                  name={item.is_checked ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={item.is_checked ? colors.teal : colors.muted}
                />
                <Text style={[styles.itemText, item.is_checked && styles.done]}>{item.content}</Text>
                <Pressable
                  onPress={async () => {
                    await checklistsApi.removeItem(item.checklist_item_id);
                    await load();
                  }}>
                  <Ionicons name="close" size={16} color={colors.muted} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
        <View style={styles.addRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="항목 추가"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Pressable
            style={styles.addBtn}
            onPress={async () => {
              if (!text.trim() || !data) return;
              await checklistsApi.addItem(data.checklist_id, text.trim());
              setText('');
              toast.show('항목이 추가되었습니다.');
              await load();
            }}>
            <Text style={styles.addText}>추가</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  hint: { color: colors.muted, marginBottom: 12 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { color: colors.muted },
  link: { color: colors.primary, fontWeight: '800' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  itemText: { flex: 1, fontWeight: '700', color: colors.navy },
  done: { textDecorationLine: 'line-through', color: colors.muted },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    color: colors.navy,
  },
  addBtn: { backgroundColor: colors.navy, borderRadius: radius.md, paddingHorizontal: 16, justifyContent: 'center' },
  addText: { color: colors.white, fontWeight: '800' },
});
