// server/utils/urlHelper.js - COMPLETE FIXED VERSION

const getBackendURL = () => {
  return (
    process.env.BASE_URL || "https://youtube-clone-project-q3pd.onrender.com"
  );
};

const BASE_URL = getBackendURL();

/**
 * ✅ NEW: Build Cloudinary URL with quality parameter
 */
const buildCloudinaryVideoUrl = (publicId, quality = "auto") => {
  const CLOUDINARY_CLOUD_NAME = "dxuxxk0ss";
  const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload`;

  let transformation = "";

  switch (quality) {
    case "1080p":
      transformation =
        "w_1920,h_1080,c_limit,q_100,br_5m,vc_h264,ac_aac,af_44100";
      break;
    case "720p":
      transformation =
        "w_1280,h_720,c_limit,q_auto:good,br_2500k,vc_h264,ac_aac,af_44100";
      break;
    case "480p":
      transformation =
        "w_854,h_480,c_limit,q_auto:good,br_1m,vc_h264,ac_aac,af_44100";
      break;
    case "360p":
      transformation =
        "w_640,h_360,c_limit,q_auto:low,br_500k,vc_h264,ac_aac,af_44100";
      break;
    case "240p":
      transformation =
        "w_426,h_240,c_limit,q_auto:low,br_300k,vc_h264,ac_aac,af_44100";
      break;
    case "144p":
      transformation =
        "w_256,h_144,c_limit,q_auto:low,br_150k,vc_h264,ac_aac,af_44100";
      break;
    default: // 'auto'
      transformation = "q_auto:good,br_1000k,vc_h264,ac_aac,af_44100";
  }

  return `${CLOUDINARY_BASE}/${transformation}/${publicId}.mp4`;
};

/**
 * ✅ CRITICAL: Get proper Cloudinary video URL
 * Handles broken formats like "file_t1d4kf.mp4" and converts to full Cloudinary URL
 */
// 🔥 CRITICAL FIX: Handle Cloudinary versions (Line 15-80)
export const getVideoURL = (filepath, quality = "auto") => {
  if (!filepath) return null;

  const CLOUDINARY_CLOUD_NAME = "dxuxxk0ss";
  const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload`;

  const fileStr = String(filepath).trim();

  // ✅ Already valid Cloudinary URL
  if (
    fileStr.includes("res.cloudinary.com") &&
    fileStr.includes("/video/upload/")
  ) {
    // ✅ CRITICAL FIX: Clean URL and extract public_id to rebuild with correct transformations
    let cleanUrl = fileStr
      .replace(/^http:\/\//, "https://")
      .replace(/:\d+/, "")
      .replace(/\/v\d+\//g, "/");

    // ✅ Extract public_id and rebuild URL with quality transformations
    const publicIdMatch = cleanUrl.match(/youtube-clone\/videos\/[^.?]+/i);

    if (publicIdMatch) {
      const publicId = publicIdMatch[0];
      const rebuiltUrl = buildCloudinaryVideoUrl(publicId, quality);
      console.log("✅ Rebuilt URL with quality:", rebuiltUrl.substring(0, 80));
      return rebuiltUrl;
    }

    // ✅ Fallback: return cleaned URL
    console.log("✅ Cleaned URL:", cleanUrl.substring(0, 80));
    return cleanUrl;
  }

  // ✅ Extract public_id
  let publicId = null;

  if (fileStr.includes("youtube-clone/videos/")) {
    const match = fileStr.match(/youtube-clone\/videos\/([^.\/]+)/);
    if (match) publicId = `youtube-clone/videos/${match[1]}`;
  } else {
    const fileIdMatch = fileStr.match(/file_[a-z0-9]+/i);
    if (fileIdMatch) publicId = `youtube-clone/videos/${fileIdMatch[0]}`;
  }

  if (publicId) {
    // ✅ Build URL WITH quality transformation
    const cleanUrl = buildCloudinaryVideoUrl(publicId, quality);
    console.log(
      `🔧 Reconstructed video URL (${quality}):`,
      cleanUrl.substring(0, 80)
    );
    return cleanUrl;
  }

  // ✅ Reject invalid URLs
  if (
    fileStr.includes("localhost") ||
    fileStr.includes(":5000") ||
    fileStr.includes("192.168") ||
    fileStr.includes("127.0.0.1")
  ) {
    console.warn("⚠️ Invalid local URL detected:", fileStr);
    return null;
  }

  console.error("❌ Could not process video URL:", fileStr.substring(0, 100));
  return null;
};

export const normalizeURL = (url) => {
  if (!url) return null;

  const urlStr = String(url).trim();

  // Cloudinary URLs - ensure HTTPS
  if (urlStr.includes("res.cloudinary.com")) {
    if (urlStr.startsWith("http://")) {
      return urlStr.replace("http://", "https://");
    }
    return urlStr.startsWith("http") ? urlStr : `https://${urlStr}`;
  }

  // OAuth images (Google, GitHub, Facebook, etc.) - ensure HTTPS
  if (
    urlStr.includes("googleusercontent.com") ||
    urlStr.includes("googleapis.com") ||
    urlStr.includes("github.com") ||
    urlStr.includes("facebook.com")
  ) {
    return urlStr.startsWith("http") ? urlStr : `https://${urlStr}`;
  }

  // ✅ FIX: Remove localhost/local IP addresses FIRST (before port check)
  if (
    urlStr.includes("localhost") ||
    urlStr.includes("192.168.") ||
    urlStr.includes("127.0.0.1")
  ) {
    const pathMatch = urlStr.match(/:\d+(\/.+)$/);
    return pathMatch ? `${BASE_URL}${pathMatch[1]}` : BASE_URL;
  }

  // ✅ FIX: Remove :5000 port from any domain (including Vercel)
  if (urlStr.includes(":5000")) {
    const pathMatch = urlStr.match(/:5000(\/.+)$/);
    return pathMatch
      ? `${BASE_URL}${pathMatch[1]}`
      : urlStr.replace(/:5000/, "");
  }

  // Already absolute production URL
  if (urlStr.startsWith(BASE_URL)) {
    return urlStr;
  }

  // Other absolute HTTPS URLs - return as-is
  if (urlStr.startsWith("https://")) {
    return urlStr;
  }

  // Convert HTTP to HTTPS for any other absolute URLs
  if (urlStr.startsWith("http://")) {
    return urlStr.replace("http://", "https://");
  }

  // Relative path - normalize and make absolute
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
  getVideoURL, // ✅ CRITICAL: Export this!
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
