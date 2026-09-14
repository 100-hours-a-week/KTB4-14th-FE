import { checklistsApi } from '@/api';
import { Header } from '@/components/Header';
import { useToast } from '@/context/ToastContext';
import type { Checklist } from '@/types';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function ChecklistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const planId = Number(id);
  const [data, setData] = useState<Checklist | null>(null);
  const [text, setText] = useState('');

  const load = async () => setData(await checklistsApi.getByPlan(planId));

  useEffect(() => {
    void load();
  }, [planId]);

  return (
    <section className="screen">
      <Header title="체크리스트" onBack={() => navigate(-1)} />
      <div className="scroll">
        {data?.status === 'GENERATING' ? <p className="hello">체크리스트를 만드는 중입니다.</p> : null}
        {(data?.items ?? []).length === 0 ? (
          <div className="empty-box">
            아직 체크리스트가 없습니다.
            <button type="button" className="logout" style={{ color: 'var(--primary)' }} onClick={async () => setData(await checklistsApi.generate(planId))}>
              AI로 생성하기
            </button>
          </div>
        ) : (
          data?.items.map((item) => (
            <div key={item.checklist_item_id} className="row">
              <button
                type="button"
                className={`check-item${item.is_checked ? ' done' : ''}`}
                onClick={async () => {
                  await checklistsApi.updateItem(item.checklist_item_id, { is_checked: !item.is_checked });
                  await load();
                }}>
                {item.is_checked ? '☑' : '☐'} <span>{item.content}</span>
              </button>
              <button
                type="button"
                className="ghost-icon"
                onClick={async () => {
                  await checklistsApi.removeItem(item.checklist_item_id);
                  await load();
                }}>
                ✕
              </button>
            </div>
          ))
        )}
        <div className="add-row">
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="항목 추가" />
          <button
            type="button"
            className="btn btn-dark"
            style={{ width: 'auto', minHeight: 48, padding: '0 16px' }}
            onClick={async () => {
              if (!text.trim() || !data) return;
              await checklistsApi.addItem(data.checklist_id, text.trim());
              setText('');
              toast.show('항목이 추가되었습니다.');
              await load();
            }}>
            추가
          </button>
        </div>
      </div>
    </section>
  );
}
