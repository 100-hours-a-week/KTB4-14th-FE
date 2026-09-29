import { ComingSoon } from '@/components/ComingSoon';
import { Header } from '@/components/Header';
import { useNavigate } from 'react-router-dom';

export function MatchingSettingsPage() {
  const navigate = useNavigate();

  return (
    <section className="screen">
      <Header title="매칭 설정" onBack={() => navigate(-1)} />
      <ComingSoon />
    </section>
  );
}
