// server/utils/urlHelper.js - PRODUCTION FIX

const BASE_URL = process.env.BASE_URL || 'https://youtube-clone-project-q3pd.onrender.com';

/**
 * Convert relative paths to absolute URLs
 */
export const toAbsoluteURL = (relativePath) => {
  // Handle null/undefined
  if (!relativePath) {
    return null;
  }

  const path = String(relativePath);

  // Already absolute URL - return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // Fix localhost URLs
    if (path.includes('192.168.0.181') || path.includes('localhost')) {
      return path.replace(/https?:\/\/(192\.168\.0\.181|localhost):5000/, BASE_URL);
    }
    return path;
  }

  // Cloudinary URLs
  if (path.includes('cloudinary.com')) {
    return path;
  }

  // Relative path - make absolute
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${cleanPath}`;
};

/**
 * Get secure video URL
 */
export const getVideoURL = (filepath) => {
  if (!filepath) return null;
  
  // If Cloudinary URL, return directly
  if (filepath.includes('res.cloudinary.com')) {
    return filepath;
  }
  
  return toAbsoluteURL(filepath);
};

/**
 * Get secure image URL
 */
export const getImageURL = (imagePath) => {
  if (!imagePath) return null;
  
  // External images (Google, Facebook, etc.)
  if (imagePath.includes('googleusercontent.com') || 
      imagePath.includes('googleapis.com') ||
      imagePath.includes('facebook.com')) {
    return imagePath;
  }
  
  // Cloudinary
  if (imagePath.includes('res.cloudinary.com')) {
    return imagePath;
  }
  
  return toAbsoluteURL(imagePath);
};

export default {
  toAbsoluteURL,
  getVideoURL,
  getImageURL
};