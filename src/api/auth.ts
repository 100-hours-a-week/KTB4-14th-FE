import { mockUser } from '@/mocks/data';
import { ApiError, apiRequest, refreshAccessToken, USE_MOCK } from '@/api/client';
import type { AuthUser } from '@/types';

export type LoginResult = AuthUser;

export const authApi = {
  /**
   * POST /users/login
   * 카카오 authorization_code 로 AUDIGO 토큰을 발급한다.
   */
  async loginWithKakao(authorizationCode: string, signal?: AbortSignal): Promise<LoginResult> {
    if (USE_MOCK) {
      return mockUser;
    }
    return apiRequest<LoginResult>('/users/login', {
      method: 'POST',
      auth: false,
      signal,
      body: { provider: 'KAKAO', authorization_code: authorizationCode },
    });
  },

  /** POST /users/refresh */
  async refresh() {
    if (USE_MOCK) return;
    if (!await refreshAccessToken()) throw new ApiError(401, '로그인이 만료되었습니다.');
  },

  /** POST /users/logout */
  async logout(signal?: AbortSignal) {
    if (USE_MOCK) return;
    await apiRequest<void>('/users/logout', {
      method: 'POST',
      signal,
    });
  },
};
