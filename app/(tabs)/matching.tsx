import { ComingSoon } from '@/src/components/ui/ComingSoon';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { Screen } from '@/src/components/ui/Screen';

export default function MatchingScreen() {
  return (
    <Screen>
      <ScreenHeader title="매칭" showBell />
      <ComingSoon />
    </Screen>
  );
}
