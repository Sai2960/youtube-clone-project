// src/lib/imageUtils.ts - COMPLETE MERGED & FIXED VERSION
// Combines all features from both implementations

import { fixMediaURL, normalizeURL, getBackendURL } from './urlHelper';

// ==========================================
// CONSTANTS & DEFAULT VALUES
// ==========================================

const DEFAULT_AVATAR = process.env.NEXT_PUBLIC_DEFAULT_AVATAR || '/images/default-avatar.png';
const DEFAULT_AVATAR_SVG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';

// ==========================================
// BACKEND URL CONFIGURATION
// ==========================================

/**
 * Get backend URL - uses urlHelper's getBackendURL for consistency
 */
const getBackendUrl = (): string => {
  return getBackendURL();
};

// ==========================================
// HELPER: Check if URL needs proxying
// ==========================================

const needsProxy = (url: string | undefined | null): boolean => {
  if (!url) return false;
  
  const proxyDomains = [
    'graph.facebook.com',
    'platform-lookaside.fbsbx.com',
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
// HELPER: Clean malformed URLs
// ==========================================

const cleanMalformedUrl = (url: string): string => {
  // Use urlHelper's normalizeURL for consistent handling
  const normalized = normalizeURL(url);
  if (!normalized) return url;
  
  // Remove duplicate protocols
  let cleaned = normalized.replace(/https?:\/\/https?:\/\//, 'https://');
  
  // Remove double slashes EXCEPT after protocol
  cleaned = cleaned.replace(/([^:]\/)\/+/g, '$1');
  
  return cleaned;
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

/**
 * ✅ ENHANCED: Get properly formatted image URL with optional cache-busting
 * Combines urlHelper normalization with image-specific logic
 */
export const getImageUrl = (
  imagePath: string | undefined | null, 
  isAvatar: boolean = false,
  bustCache: boolean = false,
  forceRefresh: boolean = false
): string => {
  const defaultImage = isAvatar ? DEFAULT_AVATAR_SVG : '';
  
  if (!imagePath || imagePath.trim() === '') {
    return defaultImage;
  }

  const urlStr = String(imagePath).trim();

  // ✅ Cloudinary URLs
  if (urlStr.includes('res.cloudinary.com')) {
    let finalUrl = urlStr.replace(/^http:\/\//, 'https://');
    if (bustCache || forceRefresh) {
      finalUrl = addTimestamp(finalUrl);
    }
    return finalUrl;
  }
  
  // ✅ OAuth images (Google, GitHub) - keep original
  if (urlStr.includes('googleusercontent.com') || 
      urlStr.includes('googleapis.com') ||
      urlStr.includes('github.com')) {
    return urlStr.replace(/^http:\/\//, 'https://');
  }
  
  // ✅ Proxy other external OAuth images if needed
  if (needsProxy(urlStr)) {
    return proxyImage(urlStr);
  }
  
  // ✅ Full URLs - normalize
  if (urlStr.startsWith('http')) {
    let finalUrl = urlStr.replace(/^http:\/\//, 'https://');
    finalUrl = cleanMalformedUrl(finalUrl);
    if (bustCache || forceRefresh) {
      finalUrl = addTimestamp(finalUrl);
    }
    return finalUrl;
  }
  
  // ✅ Relative paths - use urlHelper
  const normalized = normalizeURL(urlStr);
  if (normalized) {
    let finalUrl = normalized;
    if (bustCache || forceRefresh) {
      finalUrl = addTimestamp(finalUrl);
    }
    return finalUrl;
  }

  return defaultImage;
};

/**
 * Get image URL with custom fallback
 */
export const getImageUrlWithFallback = (
  imagePath: string | undefined | null,
  fallbackPath: string = DEFAULT_AVATAR_SVG,
  forceRefresh: boolean = false
): string => {
  const primary = getImageUrl(imagePath, false, forceRefresh);
  return primary || fallbackPath;
};

/**
 * Preload image for better UX
 */
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

/**
 * Validate if image URL is accessible
 */
export const validateImageUrl = async (imageUrl: string): Promise<boolean> => {
  try {
    await preloadImage(imageUrl);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get multiple image URLs at once
 */
export const getBatchImageUrls = (
  imagePaths: (string | undefined | null)[],
  bustCache: boolean = false
): string[] => {
  return imagePaths.map(path => getImageUrl(path, false, bustCache));
};

/**
 * Extract filename from image path
 */
export const getImageFilename = (imagePath: string | undefined | null): string => {
  if (!imagePath) return '';
  const parts = imagePath.split('/');
  const filename = parts[parts.length - 1];
  return filename.split('.')[0];
};

// ==========================================
// AVATAR-SPECIFIC UTILITIES
// ==========================================

/**
 * Check if image URL is valid and not a placeholder
 */
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

/**
 * ✅ ENHANCED: Normalize avatar URL with comprehensive fallback logic
 */
export const normalizeAvatarUrl = (avatar: string | undefined | null): string => {
  if (!avatar || avatar.trim() === '' || avatar.includes('placeholder') || avatar.includes('null')) {
    return DEFAULT_AVATAR_SVG;
  }

  // Google/OAuth avatars - keep original
  if (avatar.includes('googleusercontent.com') || 
      avatar.includes('googleapis.com') ||
      avatar.includes('github.com')) {
    return avatar.replace(/^http:\/\//, 'https://');
  }

  // Proxy other external OAuth images
  if (needsProxy(avatar)) {
    return proxyImage(avatar);
  }

  // Cloudinary URLs
  if (avatar.includes('res.cloudinary.com')) {
    return avatar.replace(/^http:\/\//, 'https://');
  }

  // Clean malformed URLs
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return cleanMalformedUrl(avatar);
  }

  // Use urlHelper for normalization
  const normalized = normalizeURL(avatar);
  if (normalized) {
    return normalized;
  }

  return DEFAULT_AVATAR_SVG;
};

/**
 * ✅ ENHANCED: Get user avatar with multiple field fallbacks
 */
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

/**
 * ✅ ENHANCED: Get short avatar with comprehensive fallback
 */
export const getShortAvatar = (short: {
  channelAvatar?: string | null;
  uploadedBy?: {
    image?: string | null;
    avatar?: string | null;
    channelAvatar?: string | null;
  };
  userId?: {
    avatar?: string | null;
    image?: string | null;
    channelAvatar?: string | null;
  };
} | null | undefined): string => {
  if (!short) return DEFAULT_AVATAR_SVG;

  // Check all possible avatar sources
  const possibleAvatars = [
    short.channelAvatar,
    short.userId?.image,
    short.userId?.avatar,
    short.userId?.channelAvatar,
    short.uploadedBy?.image,
    short.uploadedBy?.avatar,
    short.uploadedBy?.channelAvatar,
  ];

  for (const avatar of possibleAvatars) {
    if (isValidImageUrl(avatar)) {
      const processed = getImageUrl(avatar, true);
      if (processed !== DEFAULT_AVATAR_SVG) {
        return processed;
      }
    }
  }

  return DEFAULT_AVATAR_SVG;
};

// ==========================================
// TEXT FORMATTING UTILITIES
// ==========================================

/**
 * Get channel name with fallbacks
 */
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

/**
 * ✅ ENHANCED: Get short channel name with comprehensive fallback
 */
export const getShortChannelName = (short: {
  channelName?: string;
  uploadedBy?: {
    channelName?: string;
    channelname?: string;
    name?: string;
  };
  userId?: {
    channelName?: string;
    channelname?: string;
    name?: string;
  };
} | null | undefined): string => {
  if (!short) return 'Unknown Channel';

  // Check all possible channel name sources
  const possibleNames = [
    short.channelName,
    short.userId?.channelName,
    short.userId?.channelname,
    short.userId?.name,
    short.uploadedBy?.channelName,
    short.uploadedBy?.channelname,
    short.uploadedBy?.name,
  ];

  for (const name of possibleNames) {
    if (name && name.trim()) {
      return name.trim();
    }
  }

  return 'Unknown Channel';
};

/**
 * Format view count to human-readable string
 */
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

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
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

/**
 * Force reload of all images (triggers event)
 */
export const forceImageReload = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('avatarUpdated'));
    console.log('🔄 Force image reload triggered');
  }
};

/**
 * Clear image cache (triggers event)
 */
export const clearImageCache = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('clearImageCache'));
    console.log('🗑️ Image cache cleared');
  }
};

// ==========================================
// DEBUG UTILITIES
// ==========================================

/**
 * Debug image URL processing
 */
export const debugImageUrl = (url: string | undefined | null): void => {
  console.group('🔍 Image URL Debug');
  console.log('Original:', url);
  console.log('Processed:', getImageUrl(url));
  console.log('Backend URL:', getBackendUrl());
  console.log('Needs Proxy:', needsProxy(url));
  console.log('Is Valid:', isValidImageUrl(url));
  console.groupEnd();
};

// ==========================================
// EXPORTS
// ==========================================

export { 
  DEFAULT_AVATAR,
  DEFAULT_AVATAR_SVG, 
  addTimestamp, 
  removeTimestamp,
  getBackendUrl,
  needsProxy,
  proxyImage,
  cleanMalformedUrl
};

// Default export for convenience
export default { 
  getImageUrl, 
  getShortAvatar, 
  getShortChannelName,
  getUserAvatar,
  getChannelName,
  normalizeAvatarUrl,
  isValidImageUrl,
  formatViewCount,
  formatDuration,
  getImageUrlWithFallback,
  preloadImage,
  validateImageUrl,
  getBatchImageUrls,
  getImageFilename,
  forceImageReload,
  clearImageCache,
  debugImageUrl,
  DEFAULT_AVATAR,
  DEFAULT_AVATAR_SVG,
};