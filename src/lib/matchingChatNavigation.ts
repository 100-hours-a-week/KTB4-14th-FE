export type MatchingChatReturn = {
  matchConnectionId: number;
  origin: 'matching' | 'notification';
  notificationBody?: string;
};

export function getMatchingChatReturn(state: unknown): MatchingChatReturn | null {
  if (!state || typeof state !== 'object' || !('matchingReturn' in state)) return null;
  const value = state.matchingReturn;
  if (!value || typeof value !== 'object') return null;
  if (!('matchConnectionId' in value) || typeof value.matchConnectionId !== 'number'
    || !Number.isSafeInteger(value.matchConnectionId) || value.matchConnectionId < 1) return null;
  if (!('origin' in value) || (value.origin !== 'matching' && value.origin !== 'notification')) return null;

  return {
    matchConnectionId: value.matchConnectionId,
    origin: value.origin,
    notificationBody: 'notificationBody' in value && typeof value.notificationBody === 'string'
      ? value.notificationBody : undefined,
  };
}
