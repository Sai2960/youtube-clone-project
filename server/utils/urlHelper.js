const BASE_URL = process.env.BASE_URL || 'https://youtube-clone-project-q3pd.onrender.com';

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
  if (urlStr.startsWith('https://youtube-clone-project-q3pd.onrender.com')) {
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

export const getSecureMediaURL = (filepath) => {
  return normalizeURL(filepath);
};

export const isCloudinaryURL = (url) => {
  return url && url.includes('res.cloudinary.com');
};

export const isOAuthImage = (url) => {
  if (!url) return false;
  return url.includes('googleusercontent.com') ||
         url.includes('googleapis.com') ||
         url.includes('github.com') ||
         url.includes('facebook.com');
};

export default { normalizeURL, getSecureMediaURL, isCloudinaryURL, isOAuthImage };
