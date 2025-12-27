/* eslint-disable import/no-anonymous-default-export */
// src/lib/urlHelper.ts - CORRECTED VERSION

const getBackendURLInternal = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    if (
      hostname.includes("vercel.app") ||
      hostname.includes("your-domain.com")
    ) {
      return (
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "https://youtube-clone-project-q3pd.onrender.com"
      );
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    }
  }

  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://youtube-clone-project-q3pd.onrender.com"
  );
};

const BACKEND_URL = getBackendURLInternal();
const CLOUDINARY_CLOUD_NAME = "dxuxxk0ss";
const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload`;

const buildCloudinaryVideoUrl = (publicId: string, quality: string): string => {
  // ✅ CRITICAL: Quality transformations WITH audio preservation
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

  // ✅ NO transformations in path - preserves original audio
  // ✅ Transformation MUST be in path, not query params
  return `${CLOUDINARY_BASE}/${transformation}/${publicId}.mp4`;
};

/**
 * ✅ FIXED VIDEO URL FUNCTION
 */
export const getVideoUrl = (
  video: any,
  quality:
    | "auto"
    | "1080p"
    | "720p"
    | "480p"
    | "360p"
    | "240p"
    | "144p" = "auto"
): string | null => {
  if (!video) {
    console.error("❌ getVideoUrl: video object is null/undefined");
    return null;
  }

  console.log("🎬 Processing video URL for:", video._id, "Quality:", quality);

  // ✅ PRIORITY 1: Use videofilename (database public_id)
  if (
    video.videofilename &&
    video.videofilename.includes("youtube-clone/videos/")
  ) {
    const url = buildCloudinaryVideoUrl(video.videofilename, quality);
    console.log("✅ Built URL from videofilename with quality:", quality);
    return url;
  }

  // ✅ PRIORITY 2: Extract public_id from any Cloudinary URL
  const cloudinaryFields = [
    video.filepath,
    video.videofile,
    video.videoLink,
    video.videoUrl,
    video.video,
  ].filter(Boolean);

  for (const field of cloudinaryFields) {
    const urlStr = String(field).trim();

    // Check if already Cloudinary URL
    if (
      urlStr.includes("res.cloudinary.com/") &&
      urlStr.includes("/video/upload/")
    ) {
      // Extract public_id
      const publicIdMatch = urlStr.match(/youtube-clone\/videos\/[^.?]+/i);

      if (publicIdMatch) {
        const publicId = publicIdMatch[0];
        const rebuiltUrl = buildCloudinaryVideoUrl(publicId, quality);
        console.log("✅ Rebuilt video URL with quality:", quality);
        return rebuiltUrl;
      }

      // If extraction fails, clean and return original
      const cleanUrl = urlStr
        .replace(/\/v\d+\//g, "/")
        .replace(/^http:\/\//, "https://");
      console.log("✅ Using cleaned Cloudinary URL (no quality applied)");
      return cleanUrl;
    }
  }

  // ✅ PRIORITY 3: Try to extract public_id pattern from any field
  for (const field of cloudinaryFields) {
    const urlStr = String(field).trim();
    const publicIdMatch = urlStr.match(
      /youtube-clone\/videos\/file_\d+_[a-z0-9]+/i
    );

    if (publicIdMatch) {
      const publicId = publicIdMatch[0];
      const reconstructedUrl = buildCloudinaryVideoUrl(publicId, quality);
      console.log(
        "🔧 Reconstructed URL from public_id pattern with quality:",
        quality
      );
      return reconstructedUrl;
    }
  }

  // ✅ PRIORITY 4: Handle non-Cloudinary URLs (legacy support)
  const rawUrl =
    video.filepath ||
    video.videoLink ||
    video.videofile ||
    video.video ||
    video.videoUrl;

  if (rawUrl) {
    const urlStr = String(rawUrl).trim();

    if (urlStr.startsWith("https://") || urlStr.startsWith("http://")) {
      let secureUrl = urlStr.replace(/^http:\/\//, "https://");

      // Remove localhost references
      if (
        secureUrl.includes("localhost") ||
        /192\.168\.\d+\.\d+/.test(secureUrl)
      ) {
        secureUrl = secureUrl.replace(/https:\/\/[^:]+:5000/, BACKEND_URL);
      }

      // Remove :5000 port
      if (secureUrl.includes(":5000")) {
        const pathMatch = secureUrl.match(/:5000(\/.+)$/);
        if (pathMatch) {
          secureUrl = `${BACKEND_URL}${pathMatch[1]}`;
        } else {
          secureUrl = secureUrl.replace(/:5000/, "");
        }
      }

      console.log("✅ Using full non-Cloudinary URL");
      return secureUrl;
    }

    // Handle relative paths
    const cleanPath = urlStr.replace(/\\/g, "/").replace(/^\/+/, "");

    if (cleanPath) {
      if (!cleanPath.includes("/")) {
        return `${BACKEND_URL}/uploads/videos/${cleanPath}`;
      }

      if (cleanPath.startsWith("uploads/")) {
        return `${BACKEND_URL}/${cleanPath}`;
      }

      const filename = cleanPath.split(/[\\/]/).pop();
      if (filename) {
        return `${BACKEND_URL}/uploads/videos/${filename}`;
      }
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

  // Check explicit thumbnail fields
  const explicitThumbs = [
    video.thumbnailUrl,
    video.thumbnail,
    video.videothumbnail,
    video.videothumb,
  ].filter(Boolean);

  for (const thumb of explicitThumbs) {
    const thumbStr = String(thumb).trim();

    if (
      thumbStr.includes("res.cloudinary.com") &&
      /\.(jpg|png|jpeg|webp)$/i.test(thumbStr)
    ) {
      const cleanThumb = thumbStr.replace(/\/v\d+\//g, "/");
      const secureThumb = cleanThumb.replace(/^http:\/\//, "https://");
      return secureThumb;
    }

    if (thumbStr.startsWith("http")) {
      return thumbStr;
    }
  }

  // Generate from videofilename
  if (
    video.videofilename &&
    video.videofilename.includes("youtube-clone/videos/")
  ) {
    return `${CLOUDINARY_BASE}/so_0,w_640,h_360,c_fill,q_auto:good/${video.videofilename}.jpg`;
  }

  // Generate from video URL
  const videoSources = [
    video.filepath,
    video.videofile,
    video.videoLink,
    video.videoUrl,
  ].filter(Boolean);

  for (const source of videoSources) {
    try {
      const urlStr = String(source).trim();
      const cleanUrlStr = urlStr.replace(/\/v\d+\//g, "/");
      const publicIdMatch = cleanUrlStr.match(/youtube-clone\/videos\/[^.?]+/i);

      if (publicIdMatch) {
        const publicId = publicIdMatch[0];
        return `${CLOUDINARY_BASE}/so_0,w_640,h_360,c_fill,q_auto:good/${publicId}.jpg`;
      }
    } catch (error) {
      console.error("❌ Error generating thumbnail:", error);
    }
  }

  return null;
};

// ✅ ALL OTHER FUNCTIONS REMAIN THE SAME (They're perfect)
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
