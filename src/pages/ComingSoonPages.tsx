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
