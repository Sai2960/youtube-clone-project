/* eslint-disable import/no-anonymous-default-export */
// src/lib/urlHelper.ts - COMPLETE PRODUCTION VERSION
// ✅ All features merged with security hardening for GitHub deployment

/**
 * Internal helper to get backend URL dynamically
 * Handles production, development, and various deployment scenarios
 */
const getBackendURLInternal = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Production (Vercel or custom domain)
    if (hostname.includes('vercel.app') || hostname.includes('your-domain.com')) {
      return process.env.NEXT_PUBLIC_BACKEND_URL || 'https://your-backend.onrender.com';
    }
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    }
  }
  
  // Fallback to environment variables or production URL
  return process.env.NEXT_PUBLIC_API_URL || 
         process.env.NEXT_PUBLIC_BACKEND_URL || 
         'https://your-backend.onrender.com';
};

const BACKEND_URL = getBackendURLInternal();
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name';
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload`;

/**
 * ✅ ENHANCED VIDEO URL FUNCTION
 * Handles Cloudinary URLs with proper public_id extraction and cleaning
 * Supports: videofilename (priority), filepath, videofile, videoLink, videoUrl
 */
export const getVideoUrl = (video: any): string | null => {
  if (!video) {
    console.error('❌ getVideoUrl: video object is null/undefined');
    return null;
  }
  
  console.log('🎬 Processing video URL for:', video._id);
  
  // ✅ PRIORITY 1: Use videofilename (the exact public_id from database)
  if (video.videofilename && video.videofilename.includes('youtube-clone/videos/')) {
    const url = `${CLOUDINARY_BASE}/f_mp4,vc_h264,ac_aac,af_44100,br_1000k,q_auto:good/${video.videofilename}.mp4`;
    console.log('✅ Built URL from videofilename');
    return url;
  }
  
  // ✅ PRIORITY 2: Check existing Cloudinary URLs
  const cloudinaryFields = [
    video.filepath,
    video.videofile, 
    video.videoLink,
    video.videoUrl,
    video.video
  ].filter(Boolean);
  
  for (const field of cloudinaryFields) {
    const urlStr = String(field).trim();
    
    // If already a complete Cloudinary URL
    if (urlStr.includes('res.cloudinary.com/') && urlStr.includes('/video/upload/')) {
      // ✅ Remove version numbers that cause 404s
      const cleanUrl = urlStr.replace(/\/v\d+\//g, '/');
      
      // Extract and rebuild for consistency
      const publicIdMatch = cleanUrl.match(/youtube-clone\/videos\/file_\d+_[a-z0-9]+/i);
      if (publicIdMatch) {
        const publicId = publicIdMatch[0];
        const rebuiltUrl = `${CLOUDINARY_BASE}/f_mp4,vc_h264,ac_aac,af_44100,br_1000k,q_auto:good/${publicId}.mp4`;
        console.log('✅ Rebuilt clean video URL');
        return rebuiltUrl;
      }
      
      // Use cleaned URL as-is
      const secureUrl = cleanUrl.replace(/^http:\/\//, 'https://');
      console.log('✅ Using cleaned Cloudinary URL');
      return secureUrl;
    }
  }
  
  // ✅ PRIORITY 3: Extract public_id from any field and reconstruct
  for (const field of cloudinaryFields) {
    const urlStr = String(field).trim();
    const publicIdMatch = urlStr.match(/youtube-clone\/videos\/file_\d+_[a-z0-9]+/i);
    
    if (publicIdMatch) {
      const publicId = publicIdMatch[0];
      const reconstructedUrl = `${CLOUDINARY_BASE}/f_mp4,vc_h264,ac_aac,af_44100,br_1000k,q_auto:good/${publicId}.mp4`;
      console.log('🔧 Reconstructed URL from public_id pattern');
      return reconstructedUrl;
    }
  }
  
  // ✅ PRIORITY 4: Handle non-Cloudinary URLs (legacy support)
  const rawUrl = video.filepath || video.videoLink || video.videofile || video.video || video.videoUrl;
  
  if (rawUrl) {
    const urlStr = String(rawUrl).trim();
    
    // Full HTTPS/HTTP URL
    if (urlStr.startsWith('https://') || urlStr.startsWith('http://')) {
      let secureUrl = urlStr.replace(/^http:\/\//, 'https://');
      
      // Fix localhost/development URLs
      if (secureUrl.includes('localhost') || /192\.168\.\d+\.\d+/.test(secureUrl)) {
        secureUrl = secureUrl.replace(/https:\/\/[^:]+:5000/, BACKEND_URL);
      }
      
      // Fix Vercel URLs with port
      if (secureUrl.includes('vercel.app:5000')) {
        secureUrl = secureUrl.replace(/https:\/\/[^/]+:5000/, BACKEND_URL);
      }
      
      // Remove standalone port numbers
      if (secureUrl.includes(':5000')) {
        const pathMatch = secureUrl.match(/:5000(\/.+)$/);
        if (pathMatch) {
          secureUrl = `${BACKEND_URL}${pathMatch[1]}`;
        } else {
          secureUrl = secureUrl.replace(/:5000/, '');
        }
      }
      
      console.log('✅ Using full non-Cloudinary URL');
      return secureUrl;
    }
    
    // Relative path or filename
    const cleanPath = urlStr.replace(/\\/g, '/').replace(/^\/+/, '');
    
    if (cleanPath) {
      if (!cleanPath.includes('/')) {
        return `${BACKEND_URL}/uploads/videos/${cleanPath}`;
      }
      
      if (cleanPath.startsWith('uploads/')) {
        return `${BACKEND_URL}/${cleanPath}`;
      }
      
      const filename = cleanPath.split(/[\\/]/).pop();
      if (filename) {
        return `${BACKEND_URL}/uploads/videos/${filename}`;
      }
    }
  }
  
  console.warn('⚠️ No valid video URL found for:', video._id);
  return null;
};

/**
 * ✅ CRITICAL: ENHANCED THUMBNAIL GENERATION
 * Generates clean thumbnails from video public_id
 * Prevents version number issues and nested transformations
 */
export const getThumbnailUrl = (video: any): string | null => {
  if (!video) return null;
  
  console.log('📸 Generating thumbnail for:', video._id);
  
  // ✅ PRIORITY 1: Use existing thumbnail if valid
  const explicitThumbs = [
    video.thumbnailUrl,
    video.thumbnail,
    video.videothumbnail,
    video.videothumb
  ].filter(Boolean);
  
  for (const thumb of explicitThumbs) {
    const thumbStr = String(thumb).trim();
    
    if (thumbStr.includes('res.cloudinary.com') && /\.(jpg|png|jpeg|webp)$/i.test(thumbStr)) {
      // Remove version numbers
      const cleanThumb = thumbStr.replace(/\/v\d+\//g, '/');
      const secureThumb = cleanThumb.replace(/^http:\/\//, 'https://');
      console.log('✅ Using existing Cloudinary thumbnail');
      return secureThumb;
    }
    
    if (thumbStr.startsWith('http')) {
      console.log('✅ Using external thumbnail URL');
      return thumbStr;
    }
  }
  
  // ✅ PRIORITY 2: Generate from videofilename (exact public_id)
  if (video.videofilename && video.videofilename.includes('youtube-clone/videos/')) {
    const thumbnailUrl = `${CLOUDINARY_BASE}/so_0,w_640,h_360,c_fill,q_auto:good/${video.videofilename}.jpg`;
    console.log('✅ Generated thumbnail from videofilename');
    return thumbnailUrl;
  }
  
  // ✅ PRIORITY 3: Extract public_id from video URL
  const videoSources = [
    video.filepath,
    video.videofile,
    video.videoLink,
    video.videoUrl
  ].filter(Boolean);
  
  for (const source of videoSources) {
    try {
      const urlStr = String(source).trim();
      
      // Remove version numbers first
      const cleanUrlStr = urlStr.replace(/\/v\d+\//g, '/');
      
      // Extract public_id pattern
      const publicIdMatch = cleanUrlStr.match(/youtube-clone\/videos\/file_\d+_[a-z0-9]+/i);
      
      if (publicIdMatch) {
        const publicId = publicIdMatch[0];
        const thumbnailUrl = `${CLOUDINARY_BASE}/so_0,w_640,h_360,c_fill,q_auto:good/${publicId}.jpg`;
        console.log('✅ Generated thumbnail from video URL');
        return thumbnailUrl;
      }
    } catch (error) {
      console.error('❌ Error generating thumbnail:', error);
    }
  }
  
  console.warn('⚠️ No thumbnail available for:', video._id);
  return null;
};

/**
 * ✅ COMPREHENSIVE URL NORMALIZER
 * Handles Cloudinary, OAuth, backend, and relative paths
 */
export const normalizeURL = (url: string | undefined | null): string | null => {
  if (!url) return null;

  const urlStr = String(url).trim();

  // ========== CLOUDINARY URLs ==========
  if (urlStr.includes('res.cloudinary.com')) {
    if (urlStr.startsWith('http://')) {
      return urlStr.replace('http://', 'https://');
    }
    if (urlStr.startsWith('//')) {
      return `https:${urlStr}`;
    }
    if (!urlStr.startsWith('http')) {
      return `https://${urlStr}`;
    }
    return urlStr;
  }

  // ========== OAuth/External Images ==========
  if (urlStr.includes('googleusercontent.com') || 
      urlStr.includes('googleapis.com') ||
      urlStr.includes('github.com') ||
      urlStr.includes('facebook.com')) {
    if (urlStr.startsWith('http://')) {
      return urlStr.replace('http://', 'https://');
    }
    if (urlStr.startsWith('//')) {
      return `https:${urlStr}`;
    }
    return urlStr;
  }

  // ========== Complete HTTPS URLs ==========
  if (urlStr.startsWith('https://')) {
    if (urlStr.includes('vercel.app:5000')) {
      return urlStr.replace(/https:\/\/[^/]+:5000/, BACKEND_URL);
    }
    
    if (urlStr.includes(':5000')) {
      const pathMatch = urlStr.match(/:5000(\/.+)$/);
      if (pathMatch) {
        return `${BACKEND_URL}${pathMatch[1]}`;
      }
      return urlStr.replace(/:5000/, '');
    }
    
    if (urlStr.startsWith(BACKEND_URL)) {
      return urlStr;
    }
    
    return urlStr;
  }

  // ========== HTTP to HTTPS Conversion ==========
  if (urlStr.startsWith('http://')) {
    let httpsUrl = urlStr.replace('http://', 'https://');
    
    if (httpsUrl.includes('localhost') || /192\.168\.\d+\.\d+/.test(httpsUrl)) {
      return httpsUrl.replace(/https:\/\/[^:]+:5000/, BACKEND_URL);
    }
    
    if (httpsUrl.includes(':5000')) {
      const pathMatch = httpsUrl.match(/:5000(\/.+)$/);
      if (pathMatch) {
        return `${BACKEND_URL}${pathMatch[1]}`;
      }
      return httpsUrl.replace(/:5000/, '');
    }
    
    return httpsUrl;
  }

  // ========== Relative Paths ==========
  const cleanPath = urlStr
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  if (!cleanPath) return null;

  if (cleanPath.startsWith('uploads/')) {
    return `${BACKEND_URL}/${cleanPath}`;
  }

  const finalPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  return `${BACKEND_URL}${finalPath}`;
};

/**
 * ✅ GET CHANNEL/USER AVATAR URL
 */
export const getChannelImageUrl = (channel: any): string => {
  if (!channel) return '';
  
  const imageUrl = channel.image || 
                   channel.avatar || 
                   channel.channelImage ||
                   channel.channelAvatar ||
                   channel.profilePicture;
  
  return normalizeURL(imageUrl) || '';
};

/**
 * ✅ UTILITY FUNCTIONS
 */

// Alias for normalizeURL
export const getSecureMediaURL = (filepath: string | undefined | null): string | null => {
  return normalizeURL(filepath);
};

// Alias for normalizeURL (returns empty string instead of null)
export const fixMediaURL = (url: string | undefined | null): string => {
  return normalizeURL(url) || '';
};

// Get default avatar image
export const getDefaultAvatar = (): string => {
  return process.env.NEXT_PUBLIC_DEFAULT_AVATAR || '/images/default-avatar.png';
};

// Check if URL is a Cloudinary URL
export const isCloudinaryURL = (url: string | undefined | null): boolean => {
  return !!(url && url.includes('res.cloudinary.com'));
};

// Check if URL is an OAuth provider image
export const isOAuthImage = (url: string | undefined | null): boolean => {
  if (!url) return false;
  return url.includes('googleusercontent.com') ||
         url.includes('googleapis.com') ||
         url.includes('github.com') ||
         url.includes('facebook.com');
};

// Get the backend URL
export const getBackendURL = (): string => {
  return BACKEND_URL;
};

// Extract Cloudinary public ID from URL
export const extractPublicId = (url: string | undefined | null): string | null => {
  if (!url || !url.includes('cloudinary.com')) return null;
  
  try {
    const parts = url.split('/upload/');
    if (parts.length > 1) {
      const afterUpload = parts[1].split('/').slice(1).join('/');
      return afterUpload.replace(/\.[^/.]+$/, '');
    }
  } catch (error) {
    console.error('Error extracting public ID:', error);
  }
  
  return null;
};

// ========== DEFAULT EXPORT ==========
export default {
  getVideoUrl,
  getThumbnailUrl,
  normalizeURL,
  getChannelImageUrl,
  getSecureMediaURL,
  fixMediaURL,
  getDefaultAvatar,
  isCloudinaryURL,
  isOAuthImage,
  getBackendURL,
  extractPublicId,
};