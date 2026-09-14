import { mockMyPage } from '@/mocks/data';
import { apiRequest, USE_MOCK } from '@/api/client';
import type { MyPage } from '@/types';

export const usersApi = {
  /** GET /api/users/me */
  async getMe(): Promise<MyPage> {
    if (USE_MOCK) return { ...mockMyPage };
    return apiRequest<MyPage>('/api/users/me');
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
