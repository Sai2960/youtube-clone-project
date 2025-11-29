import axiosInstance from '@/lib/axiosinstance';

export const videoApi = {
  // Get all videos
  getAll: async () => {
    const response = await axiosInstance.get('/video/getall');
    return response.data;
  },

  // Get video by ID
  getById: async (id: string) => {
    const response = await axiosInstance.get(`/video/${id}`);
    return response.data;
  },

  // Get related videos
  getRelated: async (id: string, limit = 20) => {
    const response = await axiosInstance.get(`/video/${id}/related`, {
      params: { limit }
    });
    return response.data;
  },

  // Get videos by channel
  getByChannel: async (channelId: string, page = 1, limit = 50) => {
    const response = await axiosInstance.get(`/video/channel/${channelId}`, {
      params: { page, limit }
    });
    return response.data;
  },

  // Track share
  trackShare: async (videoId: string, platform?: string) => {
    const response = await axiosInstance.post('/video/share/track', {
      videoId,
      platform
    });
    return response.data;
  }
};