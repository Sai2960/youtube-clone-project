export const getBaseURL = () => {
  return process.env.BACKEND_URL || 
         process.env.RENDER_EXTERNAL_URL || 
         'https://youtube-clone-project-q3pd.onrender.com';
};

export const toAbsoluteURL = (relativePath) => {
  if (!relativePath) return '';
  
  // Already absolute
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    // Fix local IPs
    if (relativePath.includes('192.168.0.181:5000') || relativePath.includes('localhost:5000')) {
      return relativePath.replace(/http:\/\/(192\.168\.0\.181|localhost):5000/, getBaseURL());
    }
    return relativePath;
  }
  
  const baseURL = getBaseURL();
  const path = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  
  return `${baseURL}/${path}`;
};