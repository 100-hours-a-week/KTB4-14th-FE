import { colors } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  matching: 'sparkles',
  chat: 'chatbubbles',
  my: 'person',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: '#A39B93',
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
        tabBarLabel: ({ focused, children }) => (
          <Text style={[styles.label, focused && styles.labelOn]}>{children}</Text>
        ),
        tabBarIcon: ({ color, focused }) => (
          <View style={[styles.iconWrap, focused && styles.iconOn]}>
            <Ionicons name={ICONS[route.name] ?? 'ellipse'} size={20} color={focused ? colors.white : color} />
          </View>
        ),
      })}>
      <Tabs.Screen name="index" options={{ title: '홈' }} />
      <Tabs.Screen name="matching" options={{ title: '매칭' }} />
      <Tabs.Screen name="chat" options={{ title: '채팅' }} />
      <Tabs.Screen name="my" options={{ title: '마이' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 78,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.paper,
    borderTopColor: colors.line,
    borderTopWidth: 1,
  },
  item: { gap: 2 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOn: { backgroundColor: colors.navy },
  label: { fontSize: 11, fontWeight: '700', color: '#A39B93' },
  labelOn: { color: colors.navy },
});
