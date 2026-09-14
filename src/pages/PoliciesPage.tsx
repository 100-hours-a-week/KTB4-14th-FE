import { policiesApi } from '@/api';
import { Header } from '@/components/Header';
import type { Policy, PolicyType } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function PoliciesPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<PolicyType>('TERMS_OF_SERVICE');
  const [policy, setPolicy] = useState<Policy | null>(null);

  useEffect(() => {
    policiesApi.getLatest(type).then(setPolicy);
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
        <h2 className="page-title">{policy?.title}</h2>
        <p className="hello">
          v{policy?.version} · {policy?.effective_date}
        </p>
        <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{policy?.content}</p>
      </div>
    </section>
  );
}
