import { policiesApi } from '@/api';
import { Header } from '@/components/Header';
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
    <section className="screen">
      <Header title="이용약관 및 개인정보" onBack={() => navigate(-1)} />
      <div className="tabs" style={{ margin: '0 20px' }}>
        <button type="button" className={type === 'TERMS_OF_SERVICE' ? 'on' : ''} onClick={() => setType('TERMS_OF_SERVICE')}>
          이용약관
        </button>
        <button type="button" className={type === 'PRIVACY_POLICY' ? 'on' : ''} onClick={() => setType('PRIVACY_POLICY')}>
          개인정보
        </button>
      </div>
      <div className="scroll">
        <h2 className="page-title">{policy.title}</h2>
        <p className="hello">
          {loading ? '불러오는 중...' : `v${policy.version} · ${policy.effective_date}`}
        </p>
        <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{policy.content}</p>
      </div>
    </section>
  );
}
