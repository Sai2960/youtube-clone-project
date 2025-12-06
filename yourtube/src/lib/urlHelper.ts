// src/lib/urlHelper.ts - COMPLETE MERGED & ENHANCED VERSION
// Combines all features from both implementations

/**
 * Internal helper to get backend URL dynamically
 * Handles production, development, and various deployment scenarios
 */
const getBackendURLInternal = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Production (Vercel or custom domain)
    if (hostname.includes('vercel.app') || hostname.includes('your-domain.com')) {
      return 'https://youtube-clone-project-q3pd.onrender.com';
    }
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    }
  }
  
  // Fallback to environment variables or production URL
  return process.env.NEXT_PUBLIC_API_URL || 
         process.env.NEXT_PUBLIC_BACKEND_URL || 
         'https://youtube-clone-project-q3pd.onrender.com';
};

const BACKEND_URL = getBackendURLInternal();
const CLOUDINARY_CLOUD_NAME = 'dxuxxk0ss'; // Your Cloudinary cloud name
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}`;

/**
 * ✅ ENHANCED VIDEO URL FUNCTION
 * Handles Cloudinary URLs, backend URLs, relative paths, and file IDs
 */
export const getVideoUrl = (video: any): string => {
  if (!video) {
    console.error('❌ getVideoUrl: video object is null/undefined');
    return '';
  }
  
  // Try all possible video URL fields
  const rawUrl = video.filepath ||
                 video.videoLink || 
                 video.videofile || 
                 video.video ||
                 video.videoUrl ||
                 video.url;
  
  if (!rawUrl) {
    console.error('❌ No video URL found for video:', video._id);
    return '';
  }
  
  const urlStr = String(rawUrl).trim();
  
  console.log('🎥 Processing video URL:', {
    videoId: video._id,
    input: urlStr.substring(0, 100)
  });
  
  // ✅ CASE 1: Already a complete valid Cloudinary URL
  if (urlStr.includes('res.cloudinary.com/') && urlStr.includes('/video/upload/')) {
    const cleanUrl = urlStr
      .replace(/^http:\/\//, 'https://')
      .replace(/:\d+/, ''); // Remove port if present
    console.log('✅ Valid Cloudinary URL:', cleanUrl.substring(0, 80));
    return cleanUrl;
  }
  
  // ✅ CASE 2: Contains Cloudinary file ID - reconstruct full URL
  const fileIdMatch = urlStr.match(/file_[a-z0-9]+/i);
  if (fileIdMatch) {
    const fileId = fileIdMatch[0];
    const reconstructed = `${CLOUDINARY_BASE}/video/upload/youtube-clone/videos/${fileId}.mp4`;
    console.log('✅ Reconstructed from file ID:', reconstructed);
    return reconstructed;
  }
  
  // ✅ CASE 3: Already a full HTTPS/HTTP URL (non-Cloudinary)
  if (urlStr.startsWith('https://') || urlStr.startsWith('http://')) {
    // Convert HTTP to HTTPS for security
    let secureUrl = urlStr.replace(/^http:\/\//, 'https://');
    
    // Fix localhost/development URLs pointing to backend
    if (secureUrl.includes('192.168.0.181') || secureUrl.includes('localhost')) {
      secureUrl = secureUrl.replace(/https:\/\/(192\.168\.0\.181|localhost):5000/, BACKEND_URL);
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
    
    console.log('✅ Using full URL:', secureUrl.substring(0, 60));
    return secureUrl;
  }
  
  // ✅ CASE 4: Relative path or filename
  // Remove leading slashes and backslashes
  const cleanPath = urlStr
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  
  // If it's just a filename (no directory separators)
  if (!cleanPath.includes('/')) {
    const fullUrl = `${BACKEND_URL}/uploads/videos/${cleanPath}`;
    console.log('✅ Built URL from filename:', fullUrl.substring(0, 60));
    return fullUrl;
  }
  
  // If it's a path starting with "uploads/"
  if (cleanPath.startsWith('uploads/')) {
    const fullUrl = `${BACKEND_URL}/${cleanPath}`;
    console.log('✅ Built URL from uploads path:', fullUrl.substring(0, 60));
    return fullUrl;
  }
  
  // ✅ CASE 5: Extract filename from complex path
  const filename = cleanPath.split(/[\\/]/).pop();
  if (filename) {
    const fullUrl = `${BACKEND_URL}/uploads/videos/${filename}`;
    console.log('✅ Built URL from extracted filename:', fullUrl.substring(0, 60));
    return fullUrl;
  }
  
  // ❌ Could not process URL
  console.error('⚠️ Could not process video URL:', {
    input: urlStr.substring(0, 100),
    videoId: video._id
  });
  
  return '';
};

/**
 * ✅ ENHANCED THUMBNAIL URL FUNCTION
 * Generates thumbnail from video URL or uses explicit thumbnail
 */
export const getThumbnailUrl = (video: any): string => {
  console.log('🖼️ getThumbnailUrl called for:', video?._id);
  
  // Priority 1: Check explicit thumbnail fields
  const explicitThumbnail = 
    video?.thumbnailUrl || 
    video?.thumbnail || 
    video?.videothumbnail || 
    video?.videothumb;
  
  if (explicitThumbnail) {
    const thumbStr = String(explicitThumbnail).trim();
    
    // If it's already a Cloudinary image URL, use it
    if (thumbStr.includes('res.cloudinary.com') && thumbStr.includes('/image/upload/')) {
      console.log('✅ Using explicit Cloudinary image thumbnail');
      return normalizeURL(thumbStr) || '';
    }
    
    // If it's a full URL but not Cloudinary
    if (thumbStr.startsWith('http')) {
      console.log('✅ Using external thumbnail URL');
      return thumbStr;
    }
  }
  
  // Priority 2: Generate thumbnail from video URL
  const videoUrl = 
    video?.filepath || 
    video?.videofile || 
    video?.videoLink || 
    video?.videoUrl;
  
  if (videoUrl && videoUrl.includes('res.cloudinary.com')) {
    try {
      const urlStr = String(videoUrl).trim();
      
      // ✅ Extract the base Cloudinary URL and file path (BEFORE any transformations)
      const cloudinaryMatch = urlStr.match(/https:\/\/res\.cloudinary\.com\/([^/]+)\/video\/upload\/(.+)/);
      
      if (cloudinaryMatch) {
        const cloudName = cloudinaryMatch[1];
        let videoPath = cloudinaryMatch[2];
        
        // ✅ CRITICAL: Remove ALL transformation parameters from the path
        // These look like: f_mp4,vc_h264,ac_aac,af_44100,br_1000k,q_auto:good/
        videoPath = videoPath
          .split('/')
          .filter(segment => {
            // Keep only segments that don't contain transformation parameters
            return !segment.includes('f_') && 
                   !segment.includes('vc_') && 
                   !segment.includes('ac_') && 
                   !segment.includes('af_') && 
                   !segment.includes('br_') && 
                   !segment.includes('q_') &&
                   !segment.includes('w_') &&
                   !segment.includes('h_') &&
                   !segment.includes('c_') &&
                   !segment.includes('so_');
          })
          .join('/');
        
        // Build clean thumbnail URL with proper transformations
        const thumbnailUrl = `https://res.cloudinary.com/${cloudName}/video/upload/so_0,w_640,h_360,c_fill,q_auto:good/${videoPath}`
          .replace(/\.(mp4|mov|avi|mkv|webm)$/i, '.jpg');
        
        console.log('🖼️ Generated clean thumbnail:', thumbnailUrl.substring(0, 100));
        return thumbnailUrl;
      }
    } catch (error) {
      console.error('❌ Error generating thumbnail from video URL:', error);
    }
  }
  
  console.warn('⚠️ No valid thumbnail source, using fallback');
  return '';
};
/**
 * ✅ COMPREHENSIVE URL NORMALIZER
 * Handles all types of URLs: Cloudinary, OAuth, backend, relative paths
 */
export const normalizeURL = (url: string | undefined | null): string | null => {
  if (!url) return null;

  const urlStr = String(url).trim();

  // ========== CLOUDINARY URLs ==========
  if (urlStr.includes('res.cloudinary.com')) {
    // Ensure HTTPS
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
    // Ensure HTTPS
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
    // Fix Vercel URLs with port
    if (urlStr.includes('vercel.app:5000')) {
      return urlStr.replace(/https:\/\/[^/]+:5000/, BACKEND_URL);
    }
    
    // Fix port issues
    if (urlStr.includes(':5000')) {
      const pathMatch = urlStr.match(/:5000(\/.+)$/);
      if (pathMatch) {
        return `${BACKEND_URL}${pathMatch[1]}`;
      }
      return urlStr.replace(/:5000/, '');
    }
    
    // Already correct
    if (urlStr.startsWith(BACKEND_URL)) {
      return urlStr;
    }
    
    return urlStr;
  }

  // ========== HTTP to HTTPS Conversion ==========
  if (urlStr.startsWith('http://')) {
    let httpsUrl = urlStr.replace('http://', 'https://');
    
    // Fix localhost/development URLs
    if (httpsUrl.includes('192.168.0.181') || httpsUrl.includes('localhost')) {
      return httpsUrl.replace(/https:\/\/(192\.168\.0\.181|localhost):5000/, BACKEND_URL);
    }
    
    // Fix port issues
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

  // Path starting with "uploads/"
  if (cleanPath.startsWith('uploads/')) {
    return `${BACKEND_URL}/${cleanPath}`;
  }

  // Any other relative path
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
      return afterUpload.replace(/\.[^/.]+$/, ''); // Remove file extension
    }
  } catch (error) {
    console.error('Error extracting public ID:', error);
  }
  
  return null;
};

// ========== DEFAULT EXPORT ==========
export default {
  getVideoUrl,
  normalizeURL,
  getThumbnailUrl,
  getChannelImageUrl,
  getSecureMediaURL,
  fixMediaURL,
  getDefaultAvatar,
  isCloudinaryURL,
  isOAuthImage,
  getBackendURL,
  extractPublicId,
};