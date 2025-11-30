const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://youtube-clone-project-q3pd.onrender.com';

/**
 * Normalize any media URL to production format
 */
export const normalizeURL = (url: string | undefined | null): string | null => {
  if (!url) return null;

  const urlStr = String(url);

  // Already a Cloudinary URL
  if (urlStr.includes('res.cloudinary.com')) {
    return urlStr;
  }

  // Google/OAuth images
  if (urlStr.includes('googleusercontent.com') || 
      urlStr.includes('googleapis.com') ||
      urlStr.includes('github.com') ||
      urlStr.includes('facebook.com')) {
    return urlStr;
  }

  // Fix localhost/local IP URLs
  if (urlStr.includes('192.168.0.181') || urlStr.includes('localhost')) {
    return urlStr.replace(/https?:\/\/(192\.168\.0\.181|localhost):5000/, BACKEND_URL);
  }

  // Fix wrong Vercel URLs with port
  if (urlStr.includes('vercel.app:5000')) {
    return urlStr.replace(/https:\/\/[^/]+:5000/, BACKEND_URL);
  }

  // Already correct production URL
  if (urlStr.startsWith(BACKEND_URL)) {
    return urlStr;
  }

  // Other absolute URLs
  if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
    return urlStr;
  }

  // Relative path
  if (urlStr.startsWith('/uploads') || urlStr.startsWith('uploads')) {
    const cleanPath = urlStr.startsWith('/') ? urlStr : `/${urlStr}`;
    return `${BACKEND_URL}${cleanPath}`;
  }

  // Default: treat as relative path
  const cleanPath = urlStr.startsWith('/') ? urlStr : `/${urlStr}`;
  return `${BACKEND_URL}${cleanPath}`;
};

/**
 * Alias for normalizeURL
 */
export const getSecureMediaURL = (filepath: string | undefined | null): string | null => {
  return normalizeURL(filepath);
};

/**
 * Alias for backward compatibility - returns empty string instead of null
 */
export const fixMediaURL = (url: string | undefined | null): string => {
  return normalizeURL(url) || '';
};

/**
 * Check if URL is a Cloudinary URL
 */
export const isCloudinaryURL = (url: string | undefined | null): boolean => {
  return !!(url && url.includes('res.cloudinary.com'));
};

/**
 * Check if URL is an external OAuth image
 */
export const isOAuthImage = (url: string | undefined | null): boolean => {
  if (!url) return false;
  return url.includes('googleusercontent.com') ||
         url.includes('googleapis.com') ||
         url.includes('github.com') ||
         url.includes('facebook.com');
};

/**
 * Normalize all media fields in an object
 * ✅ FIXED - Proper type handling
 */
export const normalizeMediaObject = <T extends Record<string, any>>(obj: T): T => {
  if (!obj) return obj;
  
  // Create a new object to avoid mutation
  const normalized = { ...obj } as T;
  
  // Media fields to normalize
  const mediaFields: (keyof T)[] = ['videoLink', 'thumbnail', 'avatar', 'channelAvatar', 'image', 'url'] as (keyof T)[];
  
  // Normalize each field if it exists
  for (const field of mediaFields) {
    if (field in normalized && normalized[field]) {
      const value = normalized[field];
      if (typeof value === 'string') {
        // Type assertion to fix the error
        (normalized[field] as any) = normalizeURL(value);
      }
    }
  }
  
  return normalized;
};

/**
 * Normalize array of objects with media fields
 */
export const normalizeMediaArray = <T extends Record<string, any>>(arr: T[]): T[] => {
  if (!arr || !Array.isArray(arr)) return arr;
  return arr.map(item => normalizeMediaObject(item));
};

// Default export
export default { 
  normalizeURL, 
  getSecureMediaURL, 
  fixMediaURL,
  isCloudinaryURL, 
  isOAuthImage,
  normalizeMediaObject,
  normalizeMediaArray
};