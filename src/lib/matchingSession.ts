import { matchingApi } from '@/api';
import type { MatchingCandidatesResponse, MatchingRequestResponse } from '@/types';

export function matchingResultDestination(response: MatchingCandidatesResponse) {
  return {
    to: response.count > 0 ? '/matching/result' : '/matching/result?status=empty',
    state: { candidatesResponse: response },
  };
}

export async function restoreMatchingSession(request: MatchingRequestResponse) {
  if (request.latest_attempt_status === 'PROCESSING' || request.latest_attempt_status === null) {
    return { to: '/matching/progress', state: undefined };
  }

  if (request.latest_attempt_status === 'FAILED' && !request.has_result) {
    return {
      to: '/matching/result?status=error',
      state: { candidatesResponse: null },
    };
  }

  const response = await matchingApi.getCandidates();
  const destination = matchingResultDestination(response);
  return request.latest_attempt_status === 'FAILED'
    ? { ...destination, to: '/matching/result?status=error' }
    : destination;
}
