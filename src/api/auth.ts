import { mockUser } from '@/mocks/data';
import { apiRequest, USE_MOCK } from '@/api/client';
import type { AuthUser } from '@/types';

export type LoginResult = AuthUser;

export const authApi = {
  /**
   * POST /users/login
   * 카카오 authorization_code 로 AUDIGO 토큰을 발급한다.
   */
  async loginWithKakao(authorizationCode: string): Promise<LoginResult> {
    if (USE_MOCK) {
      return mockUser;
    }
    return apiRequest<LoginResult>('/users/login', {
      method: 'POST',
      auth: false,
      body: { provider: 'KAKAO', authorization_code: authorizationCode },
    });
  },

  /** POST /users/refresh */
  async refresh() {
    if (USE_MOCK) return;
    return apiRequest<void>('/users/refresh', {
      method: 'POST',
      auth: false,
    });
  },

  /** POST /users/logout */
  async logout() {
    if (USE_MOCK) return;
    await apiRequest<void>('/users/logout', {
      method: 'POST',
    });
  },
};
