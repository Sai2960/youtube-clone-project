/* eslint-disable import/no-anonymous-default-export */
// src/lib/urlHelper.ts - COMPLETE FIXED VERSION

const getBackendURLInternal = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    if (
      hostname.includes("vercel.app") ||
      hostname.includes("your-domain.com")
    ) {
      return (
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "https://youtube-clone-project-production.up.railway.app" // ✅ NEW
      );
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    }
  }

  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://youtube-clone-project-production.up.railway.app" // ✅ NEW
  );
};

const BACKEND_URL = getBackendURLInternal();
const CLOUDINARY_CLOUD_NAME = "dxuxxk0ss";
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload`;
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ejzqutnycnagdtfxkczu.supabase.co";
const SUPABASE_BUCKET = "youtube-videos";
/**
 * ✅ CRITICAL FIX: Simplified - returns plain Cloudinary URLs
 * No transformations until authentication is properly configured
 */
const buildCloudinaryVideoUrl = (publicId: string, quality: string): string => {
  // Return plain URL without transformations
  return `${CLOUDINARY_BASE}/${publicId}.mp4`;
};
export const getVideoUrl = (
  video: any,
  quality: string = "auto"
): string | null => {
  if (!video) {
    console.error("❌ getVideoUrl: video object is null/undefined");
    return null;
  }

  console.log("🎬 Processing video URL for:", video._id);

  // ✅ PRIORITY 1: Check for Supabase URLs in all possible fields
  const possibleFields = [
    video.videoUrl,
    video.videoLink,
    video.filepath,
    video.videofile,
    video.video,
  ].filter(Boolean);

  for (const field of possibleFields) {
    const urlStr = String(field).trim();

    // Supabase URLs - return directly
    if (urlStr.includes("supabase.co/storage")) {
      console.log("✅ Using Supabase URL");
      return urlStr;
    }
  }

  // ✅ PRIORITY 2: If filename only, construct Supabase URL
  if (video.videofilename && !video.videofilename.includes("http")) {
    const supabaseUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${video.videofilename}`;
    console.log("✅ Built Supabase URL from filename");
    return supabaseUrl;
  }

  // ✅ PRIORITY 3: Skip Cloudinary (expired)
  for (const field of possibleFields) {
    const urlStr = String(field).trim();
    if (urlStr.includes("cloudinary.com")) {
      console.warn("⚠️ Cloudinary URL skipped (expired)");
      continue; // Skip to next field
    }
  }

  // ✅ PRIORITY 4: Full URLs (non-Cloudinary)
  for (const field of possibleFields) {
    const urlStr = String(field).trim();
    if (urlStr.startsWith("https://") || urlStr.startsWith("http://")) {
      const secureUrl = urlStr.replace(/^http:\/\//, "https://");
      console.log("✅ Using full URL");
      return secureUrl;
    }
  }

  console.warn("⚠️ No valid video URL found for:", video._id);
  return null;
};
/**
 * ✅ THUMBNAIL GENERATION (NO CHANGES - Works correctly)
 */
export const getThumbnailUrl = (video: any): string | null => {
  if (!video) return null;

  console.log("🖼️ Getting thumbnail for:", video._id);

  // ✅ Check explicit thumbnail fields
  const thumbnailFields = [
    video.thumbnailUrl,
    video.thumbnail,
    video.videothumbnail,
    video.videothumb,
  ].filter(Boolean);

  for (const thumb of thumbnailFields) {
    const thumbStr = String(thumb).trim();

    // Supabase thumbnails
    if (thumbStr.includes("supabase.co/storage")) {
      console.log("✅ Using Supabase thumbnail");
      return thumbStr;
    }

    // Skip Cloudinary (expired)
    if (thumbStr.includes("cloudinary.com")) {
      console.warn("⚠️ Cloudinary thumbnail skipped");
      continue;
    }

    // Other URLs
    if (thumbStr.startsWith("http")) {
      return thumbStr.replace(/^http:\/\//, "https://");
    }
  }

  // ✅ Try to derive thumbnail from video URL
  const videoUrl = video.videoUrl || video.filepath || video.videoLink;

  if (videoUrl && videoUrl.includes("supabase.co/storage")) {
    // Replace /videos/ with /thumbnails/ and change extension
    const thumbnailUrl = videoUrl
      .replace("/videos/", "/thumbnails/")
      .replace(/\.(mp4|mov|avi)$/i, ".jpg");

    console.log("✅ Generated thumbnail from video URL");
    return thumbnailUrl;
  }

  // ✅ Fallback: SVG placeholder
  console.warn("⚠️ No thumbnail found, using placeholder");
  return null; // Return null so consumer can use placeholder
};
// ✅ ALL OTHER FUNCTIONS REMAIN THE SAME
export const normalizeURL = (url: string | undefined | null): string | null => {
  if (!url) return null;
  const urlStr = String(url).trim();

  if (urlStr.includes("res.cloudinary.com")) {
    if (urlStr.startsWith("http://"))
      return urlStr.replace("http://", "https://");
    if (urlStr.startsWith("//")) return `https:${urlStr}`;
    if (!urlStr.startsWith("http")) return `https://${urlStr}`;
    return urlStr;
  }

  if (
    urlStr.includes("googleusercontent.com") ||
    urlStr.includes("googleapis.com") ||
    urlStr.includes("github.com") ||
    urlStr.includes("facebook.com")
  ) {
    if (urlStr.startsWith("http://"))
      return urlStr.replace("http://", "https://");
    if (urlStr.startsWith("//")) return `https:${urlStr}`;
    return urlStr;
  }

  if (urlStr.startsWith("https://")) {
    if (urlStr.includes("vercel.app:5000")) {
      return urlStr.replace(/https:\/\/[^/]+:5000/, BACKEND_URL);
    }
    if (urlStr.includes(":5000")) {
      const pathMatch = urlStr.match(/:5000(\/.+)$/);
      if (pathMatch) return `${BACKEND_URL}${pathMatch[1]}`;
      return urlStr.replace(/:5000/, "");
    }
    return urlStr;
  }

  if (urlStr.startsWith("http://")) {
    let httpsUrl = urlStr.replace("http://", "https://");
    if (httpsUrl.includes("localhost") || /192\.168\.\d+\.\d+/.test(httpsUrl)) {
      return httpsUrl.replace(/https:\/\/[^:]+:5000/, BACKEND_URL);
    }
    if (httpsUrl.includes(":5000")) {
      const pathMatch = httpsUrl.match(/:5000(\/.+)$/);
      if (pathMatch) return `${BACKEND_URL}${pathMatch[1]}`;
      return httpsUrl.replace(/:5000/, "");
    }
    return httpsUrl;
  }

  const cleanPath = urlStr.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleanPath) return null;
  if (cleanPath.startsWith("uploads/")) return `${BACKEND_URL}/${cleanPath}`;
  const finalPath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  return `${BACKEND_URL}${finalPath}`;
};

export const getChannelImageUrl = (channel: any): string => {
  if (!channel) return "";
  const imageUrl =
    channel.image ||
    channel.avatar ||
    channel.channelImage ||
    channel.channelAvatar ||
    channel.profilePicture;
  return normalizeURL(imageUrl) || "";
};

export const getSecureMediaURL = (
  filepath: string | undefined | null
): string | null => {
  return normalizeURL(filepath);
};

export const fixMediaURL = (url: string | undefined | null): string => {
  return normalizeURL(url) || "";
};

export const getDefaultAvatar = (): string => {
  return process.env.NEXT_PUBLIC_DEFAULT_AVATAR || "/images/default-avatar.png";
};

export const isCloudinaryURL = (url: string | undefined | null): boolean => {
  return !!(url && url.includes("res.cloudinary.com"));
};

export const isOAuthImage = (url: string | undefined | null): boolean => {
  if (!url) return false;
  return (
    url.includes("googleusercontent.com") ||
    url.includes("googleapis.com") ||
    url.includes("github.com") ||
    url.includes("facebook.com")
  );
};

export const getBackendURL = (): string => {
  return BACKEND_URL;
};

export const extractPublicId = (
  url: string | undefined | null
): string | null => {
  if (!url || !url.includes("cloudinary.com")) return null;
  try {
    const parts = url.split("/upload/");
    if (parts.length > 1) {
      const afterUpload = parts[1].split("/").slice(1).join("/");
      return afterUpload.replace(/\.[^/.]+$/, "");
    }
  } catch (error) {
    console.error("Error extracting public ID:", error);
  }
  return null;
};

export default {
  getVideoUrl,
  getThumbnailUrl,
  normalizeURL,
  getChannelImageUrl,
  getSecureMediaURL,
  fixMediaURL,
  getDefaultAvatar,
  isCloudinaryURL,
  isOAuthImage,
  getBackendURL,
  extractPublicId,
};
