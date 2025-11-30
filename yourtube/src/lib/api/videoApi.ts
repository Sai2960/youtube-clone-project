import axiosInstance from '@/lib/axiosinstance';
import { normalizeURL } from '@/lib/urlHelper';

// Your existing types...
export interface Video {
  _id: string;
  title: string;
  description?: string;
  videoLink: string;
  thumbnail?: string;
  user: string | {
    _id: string;
    name: string;
    channelName?: string;
    avatar?: string;
  };
  category?: string;
  tags?: string[];
  views?: number;
  likes?: number;
  dislikes?: number;
  visibility?: 'public' | 'unlisted' | 'private';
  createdAt?: string;
  updatedAt?: string;
  channelName?: string;
  channelAvatar?: string;
}

export interface UploadVideoResponse {
  success: boolean;
  message: string;
  videoPath: string;
  publicId?: string;
  size?: number;
  format?: string;
}

export interface UploadThumbnailResponse {
  success: boolean;
  message: string;
  thumbnailPath: string;
  publicId?: string;
}

export interface CreateVideoRequest {
  title: string;
  description?: string;
  videoLink: string;
  thumbnail?: string;
  category?: string;
  tags?: string[];
  videoType?: string;
  visibility?: 'public' | 'unlisted' | 'private';
}

export const videoApi = {
  uploadVideo: async (file: File): Promise<UploadVideoResponse> => {
    const formData = new FormData();
    formData.append('video', file);

    const response = await axiosInstance.post('/video/uploadvideo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadThumbnail: async (file: File): Promise<UploadThumbnailResponse> => {
    const formData = new FormData();
    formData.append('thumbnail', file);

    const response = await axiosInstance.post('/video/uploadthumbnail', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  createVideo: async (data: CreateVideoRequest) => {
    const response = await axiosInstance.post('/video/createvideo', data);
    return response.data;
  },

  getAll: async () => {
    const response = await axiosInstance.get('/video/getallvideos');
    
    // ✅ FIXED - Manual normalization to avoid type errors
    if (response.data.videos && Array.isArray(response.data.videos)) {
      response.data.videos = response.data.videos.map((video: any) => ({
        ...video,
        videoLink: normalizeURL(video.videoLink) ?? video.videoLink,
        thumbnail: normalizeURL(video.thumbnail) ?? video.thumbnail,
        channelAvatar: normalizeURL(video.channelAvatar) ?? video.channelAvatar,
      }));
    }
    
    return response.data;
  },

  getById: async (id: string) => {
    const response = await axiosInstance.get(`/video/getvideo/${id}`);
    
    // ✅ FIXED - Direct assignment with null check
    if (response.data.video) {
      const video = response.data.video;
      video.videoLink = normalizeURL(video.videoLink) ?? video.videoLink;
      video.thumbnail = normalizeURL(video.thumbnail) ?? video.thumbnail;
      video.channelAvatar = normalizeURL(video.channelAvatar) ?? video.channelAvatar;
    }
    
    return response.data;
  },

  updateVideo: async (id: string, data: Partial<CreateVideoRequest>) => {
    const response = await axiosInstance.put(`/video/updatevideo/${id}`, data);
    return response.data;
  },

  deleteVideo: async (id: string) => {
    const response = await axiosInstance.delete(`/video/deletevideo/${id}`);
    return response.data;
  },

  incrementViews: async (id: string) => {
    const response = await axiosInstance.put(`/video/view/${id}`);
    return response.data;
  },

  search: async (query: string) => {
    const response = await axiosInstance.get('/video/search', {
      params: { q: query }
    });
    
    // ✅ FIXED
    if (response.data.videos && Array.isArray(response.data.videos)) {
      response.data.videos = response.data.videos.map((video: any) => ({
        ...video,
        videoLink: normalizeURL(video.videoLink) ?? video.videoLink,
        thumbnail: normalizeURL(video.thumbnail) ?? video.thumbnail,
        channelAvatar: normalizeURL(video.channelAvatar) ?? video.channelAvatar,
      }));
    }
    
    return response.data;
  },

  getByCategory: async (category: string, page = 1, limit = 20) => {
    const response = await axiosInstance.get('/video/category', {
      params: { category, page, limit }
    });
    
    // ✅ FIXED
    if (response.data.videos && Array.isArray(response.data.videos)) {
      response.data.videos = response.data.videos.map((video: any) => ({
        ...video,
        videoLink: normalizeURL(video.videoLink) ?? video.videoLink,
        thumbnail: normalizeURL(video.thumbnail) ?? video.thumbnail,
        channelAvatar: normalizeURL(video.channelAvatar) ?? video.channelAvatar,
      }));
    }
    
    return response.data;
  },

  getByUser: async (userId: string) => {
    const response = await axiosInstance.get(`/video/user/${userId}`);
    
    // ✅ FIXED
    if (response.data.videos && Array.isArray(response.data.videos)) {
      response.data.videos = response.data.videos.map((video: any) => ({
        ...video,
        videoLink: normalizeURL(video.videoLink) ?? video.videoLink,
        thumbnail: normalizeURL(video.thumbnail) ?? video.thumbnail,
        channelAvatar: normalizeURL(video.channelAvatar) ?? video.channelAvatar,
      }));
    }
    
    return response.data;
  },
};

export default videoApi;