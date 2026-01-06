// server/utils/urlHelper.js - COMPLETE FIXED VERSION

// ✅ FIXED: Railway-compatible URL detection
const getBackendURL = () => {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  return "http://localhost:5000";
};

const BASE_URL = getBackendURL();
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://ejzqutnycnagdtfxkczu.supabase.co";
const SUPABASE_BUCKET = "youtube-videos";

/**
 * ✅ NEW: Build Cloudinary URL with quality parameter
 */
const buildCloudinaryVideoUrl = (publicId, quality = "auto") => {
  const CLOUDINARY_CLOUD_NAME = "dxuxxk0ss";
  const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload`;

  // ✅ CRITICAL FIX: Use ONLY Cloudinary-supported transformations
  let transformation = "";

  switch (quality) {
    case "1080p":
      transformation = "q_auto:good,vc_h264,ac_aac";
      break;
    case "720p":
      transformation = "q_auto:good,vc_h264,ac_aac";
      break;
    case "480p":
      transformation = "q_auto:good,vc_h264,ac_aac";
      break;
    case "360p":
      transformation = "q_auto:low,vc_h264,ac_aac";
      break;
    case "240p":
      transformation = "q_auto:low,vc_h264,ac_aac";
      break;
    case "144p":
      transformation = "q_auto:low,vc_h264,ac_aac";
      break;
    default: // 'auto'
      transformation = "q_auto:good,vc_h264,ac_aac";
  }

  return `${CLOUDINARY_BASE}/${transformation}/${publicId}.mp4`;
};

/**
 * ✅ CRITICAL: Get proper Cloudinary video URL
 * Handles broken formats like "file_t1d4kf.mp4" and converts to full Cloudinary URL
 */
// 🔥 CRITICAL FIX: Handle Cloudinary versions (Line 15-80)
export const getVideoURL = (filepath) => {
  if (!filepath) return null;

  const fileStr = String(filepath).trim();

  // ✅ PRIORITY 1: Supabase URLs
  if (fileStr.includes("supabase.co/storage")) {
    console.log("✅ Using Supabase URL");
    return fileStr;
  }

  // ✅ PRIORITY 2: If it's a filename, construct Supabase URL
  if (!fileStr.startsWith("http")) {
    const filename = fileStr.split(/[\\/]/).pop();
    const supabaseUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${filename}`;
    console.log("✅ Built Supabase URL:", supabaseUrl);
    return supabaseUrl;
  }

  // ✅ PRIORITY 3: Legacy Cloudinary URLs (skip - expired)
  if (fileStr.includes("cloudinary.com")) {
    console.warn(
      "⚠️ Cloudinary URL detected but free tier expired - returning null"
    );
    return null;
  }

  // ✅ PRIORITY 4: Other full URLs
  if (fileStr.startsWith("http://") || fileStr.startsWith("https://")) {
    return fileStr.replace("http://", "https://");
  }

  console.error("❌ Could not process video URL:", fileStr);
  return null;
};
export const getThumbnailURL = (filepath) => {
  if (!filepath) return null;

  const fileStr = String(filepath).trim();

  // ✅ Check if it's already a Supabase thumbnail URL
  if (
    fileStr.includes("supabase.co/storage") &&
    fileStr.includes("/thumbnails/")
  ) {
    return fileStr;
  }

  // ✅ If it's a video URL, try to get corresponding thumbnail
  if (fileStr.includes("supabase.co/storage") && fileStr.includes("/videos/")) {
    const thumbnailUrl = fileStr
      .replace("/videos/", "/thumbnails/")
      .replace(/\.(mp4|mov|avi)$/i, ".jpg");
    console.log("✅ Generated thumbnail URL:", thumbnailUrl);
    return thumbnailUrl;
  }

  // ✅ Skip Cloudinary (expired)
  if (fileStr.includes("cloudinary.com")) {
    console.warn("⚠️ Cloudinary thumbnail skipped");
    return null;
  }

  // ✅ Fallback: placeholder SVG
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"%3E%3Crect width="640" height="360" fill="%231F2937"/%3E%3Cpath d="M280 150L360 180L280 210V150Z" fill="%23EF4444"/%3E%3Ctext x="320" y="240" text-anchor="middle" fill="%239CA3AF" font-family="Arial" font-size="16"%3ENo Thumbnail%3C/text%3E%3C/svg%3E';
};

export const normalizeURL = (url) => {
  if (!url) return null;

  const urlStr = String(url).trim();

  // Supabase URLs - ensure HTTPS
  if (urlStr.includes("supabase.co/storage")) {
    return urlStr.replace("http://", "https://");
  }

  // OAuth images - ensure HTTPS
  if (
    urlStr.includes("googleusercontent.com") ||
    urlStr.includes("googleapis.com") ||
    urlStr.includes("github.com") ||
    urlStr.includes("facebook.com")
  ) {
    return urlStr.startsWith("http") ? urlStr : `https://${urlStr}`;
  }

  // Remove localhost/local IPs
  if (
    urlStr.includes("localhost") ||
    urlStr.includes("192.168.") ||
    urlStr.includes("127.0.0.1")
  ) {
    const pathMatch = urlStr.match(/:\d+(\/.+)$/);
    return pathMatch ? `${BASE_URL}${pathMatch[1]}` : BASE_URL;
  }

  // Remove :5000 port
  if (urlStr.includes(":5000")) {
    const pathMatch = urlStr.match(/:5000(\/.+)$/);
    return pathMatch
      ? `${BASE_URL}${pathMatch[1]}`
      : urlStr.replace(/:5000/, "");
  }

  // Already absolute URL
  if (urlStr.startsWith(BASE_URL)) {
    return urlStr;
  }

  // Other HTTPS URLs
  if (urlStr.startsWith("https://")) {
    return urlStr;
  }

  // Convert HTTP to HTTPS
  if (urlStr.startsWith("http://")) {
    return urlStr.replace("http://", "https://");
  }

  // Relative path
  const cleanPath = urlStr.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${BASE_URL}/${cleanPath}`;
};

/**
 * Convert relative URL to absolute URL
 */
export const toAbsoluteURL = (url) => {
  // ✅ For video files, use getVideoURL instead
  if (url && (url.includes("file_") || url.includes("uploads/videos/"))) {
    return getVideoURL(url);
  }
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
  return url && url.includes("res.cloudinary.com");
};

/**
 * Check if URL is an external OAuth image
 */
export const isOAuthImage = (url) => {
  if (!url) return false;
  return (
    url.includes("googleusercontent.com") ||
    url.includes("googleapis.com") ||
    url.includes("github.com") ||
    url.includes("facebook.com")
  );
};

/**
 * Normalize all media fields in an object
 */
export const normalizeMediaObject = (obj) => {
  if (!obj) return obj;

  const normalized = { ...obj };
  const mediaFields = [
    "videoLink",
    "thumbnail",
    "avatar",
    "channelAvatar",
    "image",
    "bannerImage",
    "url",
    "filepath",
    "videothumbnail",
    "videofile",
    "videothumb",
  ];

  for (const field of mediaFields) {
    if (field in normalized && normalized[field]) {
      // ✅ Use getVideoURL for video fields
      if (["videoLink", "filepath", "videofile"].includes(field)) {
        normalized[field] = getVideoURL(normalized[field]);
      } else {
        normalized[field] = normalizeURL(normalized[field]);
      }
    }
  }

  return normalized;
};

/**
 * Normalize array of objects with media fields
 */
export const normalizeMediaArray = (arr) => {
  if (!arr || !Array.isArray(arr)) return arr;
  return arr.map((item) => normalizeMediaObject(item));
};

/**
 * Extract public ID from Cloudinary URL
 */
export const extractPublicId = (url) => {
  if (!url || !url.includes("cloudinary.com")) return null;

  try {
    const parts = url.split("/upload/");
    if (parts.length > 1) {
      const afterUpload = parts[1].split("/").slice(1).join("/");
      return afterUpload.replace(/\.[^/.]+$/, ""); // Remove extension
    }
  } catch (error) {
    console.error("Error extracting public ID:", error);
  }

  return null;
};

/**
 * Get the base URL for the application
 */
export const getBaseURL = () => {
  return BASE_URL;
};

/**
 * Validate if a URL is properly formatted
 */
export const isValidURL = (url) => {
  if (!url) return false;
  try {
    const urlStr = String(url).trim();
    return (
      /^(https?:\/\/|\/uploads\/)/.test(urlStr) ||
      urlStr.includes("cloudinary.com") ||
      urlStr.includes("googleusercontent.com")
    );
  } catch (error) {
    return false;
  }
};

/**
 * Clean path separators for cross-platform compatibility
 */
export const cleanPath = (path) => {
  if (!path) return "";
  return String(path).replace(/\\/g, "/").replace(/^\/+/, "");
};

// Export BASE_URL as well
export { BASE_URL };

// Default export for compatibility
export default {
  getVideoURL,
  getThumbnailURL, // ✅ CRITICAL: Export this!
  normalizeURL,
  toAbsoluteURL,
  getSecureMediaURL,
  isCloudinaryURL,
  isOAuthImage,
  normalizeMediaObject,
  normalizeMediaArray,
  extractPublicId,
  getBaseURL,
  isValidURL,
  cleanPath,
  BASE_URL,
};
