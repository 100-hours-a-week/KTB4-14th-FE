const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function toDateLabel(value?: string) {
  return value ? value.replaceAll('-', '.') : '날짜 선택';
}

export function CalendarSheet({ value, onSelect }: { value?: string; onSelect: (iso: string) => void }) {
  const base = value ? new Date(`${value}T00:00:00`) : new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const startPad = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: startPad + daysInMonth }, (_, i) => (i < startPad ? null : i - startPad + 1));

  return (
    <div>
      <p className="modal-title" style={{ marginBottom: 12 }}>
        {year}년 {month + 1}월
      </p>
      <div className="week-row">
        {WEEK.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((day, index) => {
          const iso = day ? `${year}-${pad(month + 1)}-${pad(day)}` : '';
          return (
            <button
              key={`${iso}-${index}`}
              type="button"
              className={`cal-cell${iso === value ? ' selected' : ''}`}
              disabled={!day}
              onClick={() => day && onSelect(iso)}>
              {day ?? ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TimeSheet({ value, onSelect }: { value?: string; onSelect: (hhmm: string) => void }) {
  const [h, m] = (value ?? '10:00').split(':').map(Number);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 10, 20, 30, 40, 50];
  return (
    <div className="row" style={{ maxHeight: 280, overflow: 'auto' }}>
      <div style={{ flex: 1 }}>
        <strong>시</strong>
        <div className="time-grid">
          {hours.map((hour) => (
            <button
              key={hour}
              type="button"
              className={`time-chip${hour === h ? ' selected' : ''}`}
              onClick={() => onSelect(`${pad(hour)}:${pad(m || 0)}`)}>
              {pad(hour)}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <strong>분</strong>
        <div className="time-grid">
          {minutes.map((minute) => (
            <button
              key={minute}
              type="button"
              className={`time-chip${minute === m ? ' selected' : ''}`}
              onClick={() => onSelect(`${pad(h || 0)}:${pad(minute)}`)}>
              {pad(minute)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
