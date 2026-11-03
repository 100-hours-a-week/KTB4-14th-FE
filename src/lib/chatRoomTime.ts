const TIME_ZONE = 'Asia/Seoul';
const UTC_WITHOUT_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/;
const calendarFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit',
});

function calendarParts(date: Date) {
  return Object.fromEntries(calendarFormat.formatToParts(date).map(({ type, value }) => [type, value]));
}

/** The room-list API currently returns UTC without an offset. Keep API/cursor values unchanged. */
export function formatChatRoomTime(value: string, now = new Date()) {
  const input = value.trim();
  const sentAt = new Date(UTC_WITHOUT_ZONE.test(input) ? `${input}Z` : input);
  if (Number.isNaN(sentAt.getTime())) return '';

  const sent = calendarParts(sentAt);
  const today = calendarParts(now);
  if (sent.year === today.year && sent.month === today.month && sent.day === today.day) {
    return timeFormat.format(sentAt);
  }
  if (sent.year === today.year) return `${sent.month}월 ${sent.day}일`;
  return `${sent.year}. ${sent.month}. ${sent.day}.`;
}
