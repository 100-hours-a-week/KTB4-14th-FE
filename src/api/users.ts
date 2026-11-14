import { mockMyPage } from '@/mocks/data';
import { apiRequest, USE_MOCK } from '@/api/client';
import type { MyPage } from '@/types';

export const usersApi = {
  /** GET /api/users/me */
  async getMe(signal?: AbortSignal): Promise<MyPage> {
    if (USE_MOCK) return { ...mockMyPage };
    // 내 정보 조회는 액세스 토큰이 만료된 경우에도 403을 받을 수 있다.
    return apiRequest<MyPage>('/api/users/me', { signal, refreshOnForbidden: true });
  },

  /** PATCH /api/users/me/nickname */
  async updateNickname(nickname: string) {
    if (USE_MOCK) return { user_id: 1, nickname };
    return apiRequest<{ user_id: number; nickname: string }>('/api/users/me/nickname', {
      method: 'PATCH',
      body: { nickname },
    });
  },
};
