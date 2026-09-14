import { ComingSoon } from '@/src/components/ui/ComingSoon';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { Screen } from '@/src/components/ui/Screen';

export default function ChatScreen() {
  return (
    <Screen>
      <ScreenHeader title="채팅" showBell />
      <ComingSoon />
    </Screen>
  );
}
