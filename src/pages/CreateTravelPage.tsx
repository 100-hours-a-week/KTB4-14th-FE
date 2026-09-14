import { Button } from '@/components/Button';
import { CalendarSheet, TimeSheet, toDateLabel } from '@/components/DateTime';
import { Chip } from '@/components/Chip';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import { Progress } from '@/components/Progress';
import { useTravelDraft } from '@/context/TravelDraftContext';
import { companionOptions, transportOptions } from '@/lib/options';
import { destinations } from '@/mocks/data';
import type { CompanionType, TransportType } from '@/types';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export function CreateTravelPage() {
  const navigate = useNavigate();
  const { draft, update } = useTravelDraft();
  const [picker, setPicker] = useState<null | 'dest' | 'startDate' | 'endDate' | 'startTime' | 'endTime'>(null);

  return (
    <section className="screen">
      <Header title="여행 생성하기" onBack={() => navigate(-1)} showBell />
      <div className="scroll">
        <Progress step={1} />
        <Field label="목적지">
          <button type="button" className="select-box" onClick={() => setPicker('dest')}>
            {draft.destination ?? '도시를 선택해 주세요'}
          </button>
        </Field>
        <Field label="나와 함께할 사람은?">
          <div className="chips">
            {companionOptions.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                selected={draft.companion === item.value}
                onClick={() => update({ companion: item.value as CompanionType })}
              />
            ))}
          </div>
        </Field>
        <Field label="여행 기간">
          <div className="row">
            <button type="button" className="select-box" onClick={() => setPicker('startDate')}>
              {toDateLabel(draft.start_date)}
            </button>
            <button type="button" className="select-box" style={{ width: 110 }} onClick={() => setPicker('startTime')}>
              {draft.start_time ?? '시작 시간'}
            </button>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" className="select-box" onClick={() => setPicker('endDate')}>
              {toDateLabel(draft.end_date)}
            </button>
            <button type="button" className="select-box" style={{ width: 110 }} onClick={() => setPicker('endTime')}>
              {draft.end_time ?? '종료 시간'}
            </button>
          </div>
        </Field>
        <Field label="이동 수단">
          <div className="chips">
            {transportOptions.map((item) => (
              <Chip
                key={item.value}
                label={item.label}
                selected={draft.transport === item.value}
                onClick={() => update({ transport: item.value as TransportType })}
              />
            ))}
          </div>
        </Field>
      </div>
      <div className="footer-bar">
        <Button
          label="다음: 여행 취향"
          variant="dark"
          onClick={() => {
            // TODO(backend-guard): 목적지/동행/기간/이동수단 미입력 시 다음 단계 진입을 막는다.
            navigate('/create-travel/preference');
          }}
        />
      </div>
      <Modal open={picker === 'dest'} title="목적지 선택" confirmLabel="닫기" onClose={() => setPicker(null)} onConfirm={() => setPicker(null)}>
        <div className="chips" style={{ marginTop: 12 }}>
          {destinations.map((city) => (
            <Chip
              key={city}
              label={city}
              selected={draft.destination === city}
              onClick={() => {
                update({ destination: city });
                setPicker(null);
              }}
            />
          ))}
        </div>
      </Modal>
      <Modal open={picker === 'startDate'} title="시작 날짜" onClose={() => setPicker(null)} onConfirm={() => setPicker(null)}>
        <CalendarSheet value={draft.start_date} onSelect={(value) => update({ start_date: value })} />
      </Modal>
      <Modal open={picker === 'endDate'} title="종료 날짜" onClose={() => setPicker(null)} onConfirm={() => setPicker(null)}>
        <CalendarSheet value={draft.end_date} onSelect={(value) => update({ end_date: value })} />
      </Modal>
      <Modal open={picker === 'startTime'} title="시작 시간" onClose={() => setPicker(null)} onConfirm={() => setPicker(null)}>
        <TimeSheet value={draft.start_time} onSelect={(value) => update({ start_time: value })} />
      </Modal>
      <Modal open={picker === 'endTime'} title="종료 시간" onClose={() => setPicker(null)} onConfirm={() => setPicker(null)}>
        <TimeSheet value={draft.end_time} onSelect={(value) => update({ end_time: value })} />
      </Modal>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
    </div>
  );
}
