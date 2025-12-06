// src/api/videoApi.ts - COMPLETE MERGED & ENHANCED VERSION
// Combines all features from both implementations with comprehensive validation
import axiosInstance from '@/lib/axiosinstance';
import { normalizeURL } from '@/lib/urlHelper';

// ========== TypeScript Interface ==========
export interface Video {
  _id: string;
  title: string;
  videotitle?: string;
  description?: string;
  videodescription?: string;
  videoLink: string;
  videofile?: string;
  filepath?: string;
  thumbnail?: string;
  videothumbnail?: string;
  videothumb?: string;
  thumbnailUrl?: string;
  user: string | {
    _id: string;
    name: string;
    channelName?: string;
    channelname?: string;
    avatar?: string;
    image?: string;
  };
  uploadedBy?: string | {
    _id: string;
    name: string;
    channelName?: string;
    channelname?: string;
    avatar?: string;
    image?: string;
  };
  category?: string;
  tags?: string[];
  views?: number;
  likes?: number;
  Like?: number;
  dislikes?: number;
  Dislike?: number;
  visibility?: 'public' | 'unlisted' | 'private';
  createdAt?: string;
  updatedAt?: string;
  channelName?: string;
  videochanel?: string;
  channelAvatar?: string;
}

// ========== Response Caching System ==========
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data if still valid
 */
const getCached = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('✅ Using cached data for:', key);
    return cached.data;
  }
  // Remove expired cache
  cache.delete(key);
  return null;
};

/**
 * Set cache with automatic cleanup of old entries
 */
const setCache = (key: string, data: any) => {
  cache.set(key, { data, timestamp: Date.now() });
  
  // Keep cache size manageable (max 50 entries)
  if (cache.size > 50) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
    console.log('🗑️ Removed oldest cache entry:', firstKey);
  }
};

// ========== Video Normalization Function ==========
/**
 * Normalize video object to ensure consistent field names
 * Does NOT modify URLs - lets urlHelper handle URL processing
 */
const normalizeVideo = (video: any): Video => {
  if (!video) {
    console.warn('⚠️ Attempted to normalize null/undefined video');
    return video;
  }
  
  // Get user from either uploadedBy or user field
  const user = video.uploadedBy || video.user;
  const userImage = user?.image || user?.avatar;
  
  // Normalize user object
  const normalizedUser = user && typeof user === 'object' ? {
    ...user,
    image: user.image || user.avatar,
    avatar: user.avatar || user.image,
    channelname: user.channelname || user.channelName || user.name
  } : user;
  
  console.log('🔄 Normalizing video:', {
    id: video._id,
    title: video.videotitle || video.title,
    hasVideoLink: !!video.videoLink,
    hasVideofile: !!video.videofile,
    hasFilepath: !!video.filepath,
    hasThumbnail: !!(video.thumbnail || video.videothumbnail)
  });
  
  return {
    ...video,
    // Keep original URLs - urlHelper will process them when needed
    videoLink: video.videoLink || video.videofile || video.filepath || video.url,
    thumbnail: video.thumbnail || video.videothumbnail || video.videothumb || video.thumbnailUrl,
    channelAvatar: userImage,
    uploadedBy: normalizedUser,
    user: normalizedUser,
    // Ensure consistent naming
    videotitle: video.videotitle || video.title,
    videodescription: video.videodescription || video.description,
    videochanel: video.videochanel || video.channelName || normalizedUser?.channelname || normalizedUser?.name
  };
};

// ========== Video API Functions ==========
export const videoApi = {
  /**
   * Get all videos with optional caching
   */
  getAll: async (useCache = true) => {
    const cacheKey = 'all-videos';
    
    // Check cache first
    if (useCache) {
      const cached = getCached(cacheKey);
      if (cached) return cached;
    }
    
    console.log('🌐 Fetching all videos from API');
    const response = await axiosInstance.get('/video/getallvideos');
    
    // Normalize all videos if array exists
    if (response.data.videos && Array.isArray(response.data.videos)) {
      console.log(`✅ Normalizing ${response.data.videos.length} videos`);
      response.data.videos = response.data.videos.map(normalizeVideo);
    }
    
    // Cache the response
    setCache(cacheKey, response.data);
    return response.data;
  },

  /**
   * Get video by ID with enhanced validation and caching
   */
  getById: async (id: string, useCache = true) => {
    const cacheKey = `video-${id}`;
    
    // Check cache first
    if (useCache) {
      const cached = getCached(cacheKey);
      if (cached) {
        console.log('✅ Using cached video:', id);
        return cached;
      }
    }
    
    console.log('🌐 Fetching video from API:', id);
    const response = await axiosInstance.get(`/video/${id}`);
    
    // ✅ Validate response structure
    if (!response.data.success || !response.data.video) {
      console.error('❌ Invalid API response structure:', response.data);
      throw new Error('Invalid video response from API');
    }

    const video = response.data.video;
    
    // ✅ CRITICAL: Validate video has at least ONE URL field with content
    const videoUrl = video.videoLink || video.videofile || video.filepath || video.url;
    
    if (!videoUrl) {
      console.error('❌ Video has NO URLs at all:', {
        id,
        title: video.videotitle || video.title,
        allFields: Object.keys(video)
      });
      throw new Error('Video data is missing - no URL found');
    }
    
    console.log('✅ Video has URL field:', {
      id,
      urlLength: videoUrl.length,
      urlPreview: videoUrl.substring(0, 60)
    });
    
    // ✅ Optional: Validate and log Cloudinary URLs
    try {
      const normalizedUrl = normalizeURL(videoUrl);
      if (normalizedUrl) {
        if (normalizedUrl.includes('cloudinary.com')) {
          console.log('✅ Valid Cloudinary URL detected:', normalizedUrl.substring(0, 80));
        } else {
          console.log('ℹ️ Non-Cloudinary URL (backend or other):', normalizedUrl.substring(0, 80));
        }
      } else {
        console.warn('⚠️ URL normalization returned null, but URL exists:', videoUrl.substring(0, 60));
        // Don't throw - let frontend urlHelper try to reconstruct
      }
    } catch (urlError) {
      console.warn('⚠️ URL validation error (non-fatal):', urlError);
      // Don't throw - let frontend handle URL processing
    }
    
    // Normalize video object
    console.log('🔄 Normalizing video data for:', id);
    response.data.video = normalizeVideo(video);
    
    // Cache the normalized response
    setCache(cacheKey, response.data);
    
    console.log('✅ Video fetched and cached successfully:', {
      id,
      title: response.data.video.videotitle
    });
    
    return response.data;
  },

  /**
   * Clear all cached data
   */
  clearCache: () => {
    const size = cache.size;
    cache.clear();
    console.log(`🗑️ Video cache cleared (${size} entries removed)`);
  },

  /**
   * Upload video file
   */
  uploadVideo: async (file: File) => {
    console.log('📤 Uploading video file:', file.name);
    const formData = new FormData();
    formData.append('video', file);
    
    const response = await axiosInstance.post('/video/uploadvideo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    console.log('✅ Video uploaded successfully');
    return response.data;
  },

  /**
   * Upload thumbnail file
   */
  uploadThumbnail: async (file: File) => {
    console.log('📤 Uploading thumbnail file:', file.name);
    const formData = new FormData();
    formData.append('thumbnail', file);
    
    const response = await axiosInstance.post('/video/uploadthumbnail', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    console.log('✅ Thumbnail uploaded successfully');
    return response.data;
  },

  /**
   * Create new video
   */
  createVideo: async (data: any) => {
    console.log('📝 Creating new video:', data.videotitle || data.title);
    const response = await axiosInstance.post('/video/createvideo', data);
    
    // Clear cache to ensure fresh data
    videoApi.clearCache();
    console.log('✅ Video created successfully');
    
    return response.data;
  },

  /**
   * Update existing video
   */
  updateVideo: async (id: string, data: any) => {
    console.log('✏️ Updating video:', id);
    const response = await axiosInstance.put(`/video/updatevideo/${id}`, data);
    
    // Clear cache to ensure fresh data
    videoApi.clearCache();
    console.log('✅ Video updated successfully');
    
    return response.data;
  },

  /**
   * Delete video
   */
  deleteVideo: async (id: string) => {
    console.log('🗑️ Deleting video:', id);
    const response = await axiosInstance.delete(`/video/deletevideo/${id}`);
    
    // Clear cache to ensure fresh data
    videoApi.clearCache();
    console.log('✅ Video deleted successfully');
    
    return response.data;
  },

  /**
   * Increment video view count (fire-and-forget)
   */
  incrementViews: async (id: string) => {
    console.log('👁️ Incrementing views for:', id);
    axiosInstance.put(`/video/view/${id}`)
      .then(() => console.log('✅ View count incremented'))
      .catch((error) => console.error('❌ Failed to increment views:', error));
  },
};

// Default export
export default videoApi;