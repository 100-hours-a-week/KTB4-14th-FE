import { mockVideo } from '@/mocks/data';
import { apiRequest, USE_MOCK } from '@/api/client';
import type { TravelVideo } from '@/types';

let localVideo: TravelVideo = { ...mockVideo };

export const videosApi = {
  /** POST /api/travel-plans/:id/videos */
  async generate(travelPlanId: number) {
    if (USE_MOCK) {
      localVideo = { ...localVideo, travel_plan_id: travelPlanId, status: 'GENERATING' };
      setTimeout(() => {
        localVideo = { ...localVideo, status: 'COMPLETED', video_url: mockVideo.video_url };
      }, 1600);
      return localVideo;
    }
    return apiRequest<TravelVideo>(`/api/travel-plans/${travelPlanId}/videos`, { method: 'POST' });
  },

  /** GET /api/travel-plans/:id/videos */
  async getByPlan(travelPlanId: number) {
    if (USE_MOCK) return { ...localVideo, travel_plan_id: travelPlanId };
    return apiRequest<TravelVideo>(`/api/travel-plans/${travelPlanId}/videos`);
  },

  /** POST /api/videos/:id/regenerate */
  async regenerate(videoId: number) {
    if (USE_MOCK) {
      localVideo = { ...localVideo, video_id: videoId, status: 'GENERATING', error_message: null };
      setTimeout(() => {
        localVideo = { ...localVideo, status: 'COMPLETED' };
      }, 1600);
      return localVideo;
    }
    return apiRequest<TravelVideo>(`/api/videos/${videoId}/regenerate`, { method: 'POST' });
  },
};
