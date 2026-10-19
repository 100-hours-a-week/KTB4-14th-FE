export const MAX_TRAVEL_DAYS = 7;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDate(value?: string) {
  if (!value) return null;

  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidIsoDate(value?: string): value is string {
  return parseIsoDate(value) !== null;
}

export function addCalendarDays(value: string, days: number) {
  const date = parseIsoDate(value);
  if (!date) return undefined;

  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
}

export function subtractCalendarDays(value: string, days: number) {
  return addCalendarDays(value, -days);
}

function utcDayNumber(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

export function isTravelDateRangeValid(start?: string, end?: string) {
  if (!start || !end) return true;

  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  if (!startDate || !endDate) return false;

  const calendarDayDifference = utcDayNumber(endDate) - utcDayNumber(startDate);
  return calendarDayDifference >= 0 && calendarDayDifference < MAX_TRAVEL_DAYS;
}
