// src/lib/imageUtils.ts - COMPLETE CORRECTED VERSION

// ==========================================
// DYNAMIC BACKEND URL
// ==========================================
// ==========================================
// DYNAMIC BACKEND URL
// ==========================================
const getBackendUrl = (): string => {
  // Server-side rendering
  if (typeof window === 'undefined') {
    return "https://youtube-clone-project-q3pd.onrender.com";
  }
  
  // Client-side: use dynamic hostname
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:5000`;
  }
  
  return "https://youtube-clone-project-q3pd.onrender.com";
};

const DEFAULT_AVATAR_SVG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';

// ==========================================
// HELPER: Check if URL needs proxying
// ==========================================

const needsProxy = (url: string | undefined | null): boolean => {
  if (!url) return false;
  
  const proxyDomains = [
    'lh3.googleusercontent.com',
    'graph.facebook.com',
    'platform-lookaside.fbsbx.com'
  ];
  
  try {
    const urlObj = new URL(url);
    return proxyDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
};

// ==========================================
// HELPER: Proxy external images
// ==========================================

const proxyImage = (url: string): string => {
  const BACKEND_URL = getBackendUrl();
  return `${BACKEND_URL}/api/proxy-image?url=${encodeURIComponent(url)}`;
};

// ==========================================
// TIMESTAMP UTILITIES
// ==========================================

const addTimestamp = (url: string): string => {
  if (url.includes('?t=') || url.includes('&t=')) {
    return url;
  }
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
};

const removeTimestamp = (url: string): string => {
  return url.replace(/[?&]t=\d+/, '').replace(/\?$/, '');
};

// ==========================================
// CORE IMAGE URL UTILITIES
// ==========================================

export const getImageUrl = (
  imagePath: string | undefined | null, 
  forceRefresh: boolean = false
): string => {
  const defaultImage = 'https://github.com/shadcn.png';
  const BACKEND_URL = getBackendUrl(); // ✅ Get dynamic URL
  
  if (!imagePath || imagePath.trim() === '') {
    return defaultImage;
  }

  let finalUrl: string;

  // ✅ Check if it's a Google/OAuth image that needs proxying
  if (needsProxy(imagePath)) {
    finalUrl = proxyImage(imagePath);
    return forceRefresh ? addTimestamp(finalUrl) : finalUrl;
  }

  // Handle regular URLs
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    finalUrl = imagePath;
  }
  else if (imagePath.startsWith('/uploads')) {
    finalUrl = `${BACKEND_URL}${imagePath}`;
  }
  else {
    const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    finalUrl = `${BACKEND_URL}/uploads${cleanPath}`;
  }

  return forceRefresh ? addTimestamp(finalUrl) : finalUrl;
};

export const getImageUrlWithFallback = (
  imagePath: string | undefined | null,
  fallbackPath: string = 'https://github.com/shadcn.png',
  forceRefresh: boolean = false
): string => {
  const primary = getImageUrl(imagePath, forceRefresh);
  return primary !== 'https://github.com/shadcn.png' ? primary : fallbackPath;
};

export const preloadImage = (imageUrl: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      console.log('✅ Image preloaded:', imageUrl);
      resolve();
    };
    img.onerror = () => {
      console.error('❌ Failed to preload:', imageUrl);
      reject(new Error(`Failed to preload image: ${imageUrl}`));
    };
    img.src = imageUrl;
  });
};

export const validateImageUrl = async (imageUrl: string): Promise<boolean> => {
  try {
    await preloadImage(imageUrl);
    return true;
  } catch {
    return false;
  }
};

export const getBatchImageUrls = (
  imagePaths: (string | undefined | null)[],
  forceRefresh: boolean = false
): string[] => {
  return imagePaths.map(path => getImageUrl(path, forceRefresh));
};

export const getImageFilename = (imagePath: string | undefined | null): string => {
  if (!imagePath) return '';
  const parts = imagePath.split('/');
  const filename = parts[parts.length - 1];
  return filename.split('.')[0];
};

// ==========================================
// AVATAR-SPECIFIC UTILITIES
// ==========================================
// In src/lib/imageUtils.ts - UPDATE THIS FUNCTION ONLY

export const normalizeAvatarUrl = (avatar: string | undefined | null): string => {
  const BACKEND_URL = getBackendUrl();
  
  if (!avatar || avatar.trim() === '' || avatar.includes('placeholder') || avatar.includes('null')) {
    return DEFAULT_AVATAR_SVG;
  }

  // ✅ Proxy Google/OAuth avatars
  if (needsProxy(avatar)) {
    return proxyImage(avatar);
  }

  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }

  if (avatar.startsWith('/uploads')) {
    return `${BACKEND_URL}${avatar}`;
  }

  // ✅ CRITICAL FIX: Use channel-images directory
  const cleanPath = avatar.startsWith('/') ? avatar.slice(1) : avatar;
  return `${BACKEND_URL}/uploads/channel-images/${cleanPath}`;
};

export const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }

  const invalidPatterns = [
    'placeholder.com',
    'via.placeholder',
    'placeholde',
    'example.com',
    'default-avatar',
    'no-avatar',
    'null',
    'undefined',
  ];

  const lowerUrl = url.toLowerCase();
  return !invalidPatterns.some(pattern => lowerUrl.includes(pattern));
};

export const getUserAvatar = (user: {
  channelAvatar?: string | null;
  avatar?: string | null;
  image?: string | null;
} | null | undefined): string => {
  if (!user) return DEFAULT_AVATAR_SVG;

  const avatarFields = [
    user.channelAvatar,
    user.avatar,
    user.image,
  ];

  for (const field of avatarFields) {
    if (isValidImageUrl(field)) {
      const normalized = normalizeAvatarUrl(field);
      if (normalized !== DEFAULT_AVATAR_SVG) {
        return normalized;
      }
    }
  }

  return DEFAULT_AVATAR_SVG;
};

export const getShortAvatar = (short: {
  channelAvatar?: string | null;
  userId?: {
    avatar?: string | null;
    image?: string | null;
  };
}): string => {
  return getUserAvatar({
    channelAvatar: short.channelAvatar,
    avatar: short.userId?.avatar,
    image: short.userId?.image,
  });
};

// ==========================================
// TEXT FORMATTING UTILITIES
// ==========================================

export const getChannelName = (user: {
  channelName?: string;
  channelname?: string;
  name?: string;
} | null | undefined): string => {
  if (!user) return 'Unknown Channel';

  return user.channelName?.trim() || 
         user.channelname?.trim() || 
         user.name?.trim() || 
         'Unknown Channel';
};

export const getShortChannelName = (short: {
  channelName?: string;
  userId?: {
    channelName?: string;
    channelname?: string;
    name?: string;
  };
}): string => {
  return short.channelName?.trim() ||
         short.userId?.channelName?.trim() ||
         short.userId?.channelname?.trim() ||
         short.userId?.name?.trim() ||
         'Unknown Channel';
};

export const formatViewCount = (views: number): string => {
  if (!views || views < 0) return '0';
  
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
};

export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ==========================================
// CACHE MANAGEMENT
// ==========================================

export const forceImageReload = (): void => {
  window.dispatchEvent(new Event('avatarUpdated'));
  console.log('🔄 Force image reload triggered');
};

export const clearImageCache = (): void => {
  window.dispatchEvent(new Event('clearImageCache'));
  console.log('🗑️ Image cache cleared');
};

// ==========================================
// EXPORTS
// ==========================================

export { 
  DEFAULT_AVATAR_SVG, 
  addTimestamp, 
  removeTimestamp 
};