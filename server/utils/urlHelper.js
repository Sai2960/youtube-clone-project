// server/utils/urlHelper.js - COMPLETE VERSION

const BASE_URL = process.env.BASE_URL || 'https://youtube-clone-project-q3pd.onrender.com';

/**
 * Normalize any URL to production format
 */
export const normalizeURL = (url) => {
  if (!url) return null;

  const urlStr = String(url);

  // Already a Cloudinary URL - return as-is
  if (urlStr.includes('res.cloudinary.com')) {
    return urlStr;
  }

  // Google/OAuth images - return as-is
  if (urlStr.includes('googleusercontent.com') || 
      urlStr.includes('googleapis.com') ||
      urlStr.includes('github.com') ||
      urlStr.includes('facebook.com')) {
    return urlStr;
  }

  // Fix localhost/local IP URLs
  if (urlStr.includes('192.168.0.181') || urlStr.includes('localhost')) {
    return urlStr.replace(/https?:\/\/(192\.168\.0\.181|localhost):5000/, BASE_URL);
  }

  // Fix wrong Vercel URLs with port
  if (urlStr.includes('vercel.app:5000')) {
    return urlStr.replace(/https:\/\/[^/]+:5000/, BASE_URL);
  }

  // Already absolute production URL
  if (urlStr.startsWith(BASE_URL)) {
    return urlStr;
  }

  // Other absolute URLs
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
    return urlStr;
  }

  // Relative path - make absolute
  const cleanPath = urlStr.startsWith('/') ? urlStr : `/${urlStr}`;
  return `${BASE_URL}${cleanPath}`;
};

/**
 * Convert relative URL to absolute URL
 * Alias for normalizeURL
 */
export const toAbsoluteURL = (url) => {
  return normalizeURL(url);
};

/**
 * Get secure media URL (alias for normalizeURL)
 */
export const getSecureMediaURL = (filepath) => {
  return normalizeURL(filepath);
};

/**
 * Check if URL is a Cloudinary URL
 */
export const isCloudinaryURL = (url) => {
  return url && url.includes('res.cloudinary.com');
};

/**
 * Check if URL is an external OAuth image
 */
export const isOAuthImage = (url) => {
  if (!url) return false;
  return url.includes('googleusercontent.com') ||
         url.includes('googleapis.com') ||
         url.includes('github.com') ||
         url.includes('facebook.com');
};

/**
 * Normalize all media fields in an object
 */
export const normalizeMediaObject = (obj) => {
  if (!obj) return obj;
  
  const normalized = { ...obj };
  const mediaFields = ['videoLink', 'thumbnail', 'avatar', 'channelAvatar', 'image', 'bannerImage', 'url', 'filepath', 'videothumbnail'];
  
  for (const field of mediaFields) {
    if (field in normalized && normalized[field]) {
      normalized[field] = normalizeURL(normalized[field]);
    }
  }
  
  return normalized;
};

/**
 * Normalize array of objects with media fields
 */
export const normalizeMediaArray = (arr) => {
  if (!arr || !Array.isArray(arr)) return arr;
  return arr.map(item => normalizeMediaObject(item));
};

/**
 * Extract public ID from Cloudinary URL
 */
export const extractPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  
  try {
    const parts = url.split('/upload/');
    if (parts.length > 1) {
      const afterUpload = parts[1].split('/').slice(1).join('/');
      return afterUpload.replace(/\.[^/.]+$/, ''); // Remove extension
    }
  } catch (error) {
    console.error('Error extracting public ID:', error);
  }
  
  return null;
};

// Default export with all functions
export default { 
  normalizeURL, 
  toAbsoluteURL,
  getSecureMediaURL, 
  isCloudinaryURL, 
  isOAuthImage,
  normalizeMediaObject,
  normalizeMediaArray,
  extractPublicId
};