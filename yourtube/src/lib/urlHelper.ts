const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://youtube-clone-project-q3pd.onrender.com';

export const fixMediaURL = (url: string | undefined | null): string => {
  if (!url) return '';
  
  // Already a full Render URL - perfect!
  if (url.startsWith('https://youtube-clone-project-q3pd.onrender.com')) {
    return url;
  }
  
  // Google profile images - use directly
  if (url.includes('googleusercontent.com') || url.includes('googleapis.com')) {
    return url;
  }
  
  // Wrong Vercel URL with :5000
  if (url.includes('vercel.app:5000')) {
    return url.replace(/https:\/\/[^/]+:5000/, BACKEND_URL);
  }
  
  // Local IP addresses
  if (url.includes('192.168.0.181:5000') || url.includes('localhost:5000')) {
    return url.replace(/https?:\/\/(192\.168\.0\.181|localhost):5000/, BACKEND_URL);
  }
  
  // Relative path - make absolute
  if (url.startsWith('/uploads') || url.startsWith('uploads')) {
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${BACKEND_URL}${cleanPath}`;
  }
  
  // Already absolute HTTPS
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url;
  }
  
  // Default: treat as relative path
  return `${BACKEND_URL}/${url}`;
};

// Export for easy use
export default fixMediaURL;