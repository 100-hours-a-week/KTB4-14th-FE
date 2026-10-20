import { ComingSoon } from '@/components/ComingSoon';
import { Header } from '@/components/Header';

export function MatchingPage() {
  return (
    <section className="screen">
      <Header title="매칭" showBell />
      <ComingSoon />
    </section>
  );
}

export function ChatPage() {
  return (
    <section className="screen">
      <Header title="채팅" showBell />
      <ComingSoon />
    </section>
  );
}
