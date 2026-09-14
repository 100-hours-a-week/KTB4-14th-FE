import { AuthProvider } from '@/src/context/AuthContext';
import { ToastProvider } from '@/src/context/ToastContext';
import { TravelDraftProvider } from '@/src/context/TravelDraftContext';
import { PhoneShell } from '@/src/components/ui/Screen';
import { colors } from '@/src/theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <AuthProvider>
        <TravelDraftProvider>
          <ToastProvider>
            <PhoneShell>
              <View style={{ flex: 1 }}>
                <StatusBar style="dark" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.cream },
                    animation: 'slide_from_right',
                  }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="create-travel" />
                <Stack.Screen name="generating/[id]" />
                <Stack.Screen name="itinerary/[id]" />
                <Stack.Screen name="checklist/[id]" />
                <Stack.Screen name="video/[id]" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="my-trips" />
                <Stack.Screen name="matching-settings" />
                <Stack.Screen name="notification-settings" />
                <Stack.Screen name="policies" />
                <Stack.Screen name="auth/kakao" />
              </Stack>
              </View>
            </PhoneShell>
          </ToastProvider>
        </TravelDraftProvider>
      </AuthProvider>
    </View>
  );
}
