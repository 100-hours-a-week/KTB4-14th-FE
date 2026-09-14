import { mockUser } from '@/src/mocks/data';
import { apiRequest, USE_MOCK } from '@/src/api/client';
import type { AuthTokens, AuthUser } from '@/src/types';

export type LoginResult = AuthTokens & { user: AuthUser };

export const authApi = {
  /**
   * POST /users/login
   * 카카오 authorization_code 로 AUDIGO 토큰을 발급한다.
   */
  async loginWithKakao(authorizationCode: string): Promise<LoginResult> {
    if (USE_MOCK) {
      return {
        access_token: 'MOCK_AUDIGO_ACCESS_JWT',
        refresh_token: 'MOCK_AUDIGO_REFRESH_TOKEN',
        token_type: 'Bearer',
        access_token_expires_in: 3600,
        refresh_token_expires_in: 1209600,
        user: mockUser,
      };
    }
    return apiRequest<LoginResult>('/users/login', {
      method: 'POST',
      auth: false,
      body: { provider: 'KAKAO', authorization_code: authorizationCode },
    });
  },

  /** POST /users/refresh */
  async refresh(refreshToken: string) {
    if (USE_MOCK) {
      return {
        access_token: 'MOCK_AUDIGO_ACCESS_JWT',
        refresh_token: refreshToken,
        token_type: 'Bearer' as const,
        access_token_expires_in: 3600,
        refresh_token_expires_in: 1209600,
      };
    }
    return apiRequest<AuthTokens>('/users/refresh', {
      method: 'POST',
      auth: false,
      body: { refresh_token: refreshToken },
    });
  },

  /** POST /users/logout */
  async logout(refreshToken: string) {
    if (USE_MOCK) return;
    await apiRequest<void>('/users/logout', {
      method: 'POST',
      body: { refresh_token: refreshToken },
    });
  },
};
