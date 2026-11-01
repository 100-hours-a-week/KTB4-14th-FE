import { policiesApi } from '@/api';
import { DocIcon, UsersIcon } from '@/components/Icons';
import { PlannerHeader } from '@/components/PlannerHeader';
import { defaultPolicies } from '@/data/policies';
import type { Policy, PolicyType } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function PoliciesPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<PolicyType>('TERMS_OF_SERVICE');
  const [policy, setPolicy] = useState<Policy>(defaultPolicies.TERMS_OF_SERVICE);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    policiesApi.getLatest(type)
      .then((next) => {
        if (!alive) return;
        setPolicy(next.content?.trim() ? next : defaultPolicies[type]);
      })
      .catch(() => {
        if (alive) setPolicy(defaultPolicies[type]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [type]);

  return (
    <section className="screen jn-screen policies-screen">
      <PlannerHeader title="이용약관 및 개인정보" onBack={() => navigate(-1)} showBell={false} />
      <div className="tabs jn-tabs">
        <button type="button" className={type === 'TERMS_OF_SERVICE' ? 'on' : ''} onClick={() => setType('TERMS_OF_SERVICE')}>
          <DocIcon size={15} />
          이용약관
        </button>
        <button type="button" className={type === 'PRIVACY_POLICY' ? 'on' : ''} onClick={() => setType('PRIVACY_POLICY')}>
          <UsersIcon size={15} />
          개인정보
        </button>
      </div>
      <div className="scroll">
        <h2 className="page-title">{policy.title}</h2>
        <p className="hello jn-version">
          {loading ? '불러오는 중...' : (
            <>
              <b>v{policy.version}</b> · 시행일 {policy.effective_date}
            </>
          )}
        </p>
        <div className="jn-doc">{policy.content}</div>
      </div>
    </section>
  );
}
