// src/components/RelatedVideos.tsx - COMPLETE MERGED & ENHANCED VERSION
// Combines all features from both implementations with URL helper integration
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  getBackendURL,
  normalizeURL,
  getThumbnailUrl,
  getVideoUrl,
} from "@/lib/urlHelper";

interface Video {
  _id: string;
  videotitle: string;
  videoUrl?: string;
  videofilename?: string;
  filepath?: string;
  thumbnail?: string;
  videothumbnail?: string;
  videothumb?: string;
  thumbnailUrl?: string;
  duration?: string;
  views?: number;
  videochanel?: string;
  uploadedBy?: {
    _id: string;
    name: string;
    channelname?: string;
    image?: string;
    avatar?: string;
  };
  createdAt?: string;
}

interface RelatedVideosProps {
  videos: Video[];
}

const RelatedVideos: React.FC<RelatedVideosProps> = ({ videos }) => {
  const [imageKeys, setImageKeys] = useState<Record<string, number>>({});
  const [failedThumbnails, setFailedThumbnails] = useState<Set<string>>(
    new Set(),
  );

  // ✅ Refresh on avatar update
  useEffect(() => {
    const handleAvatarUpdate = () => {
      console.log("🔄 Avatar updated, refreshing related videos");
      const updatedKeys: Record<string, number> = {};
      videos.forEach((video) => {
        if (video.uploadedBy?._id) {
          updatedKeys[video.uploadedBy._id] = Date.now();
        }
      });
      setImageKeys(updatedKeys);
    };

    window.addEventListener("avatarUpdated", handleAvatarUpdate);
    return () =>
      window.removeEventListener("avatarUpdated", handleAvatarUpdate);
  }, [videos]);

  // ========== Avatar Cache Management ==========
  useEffect(() => {
    const newKeys: Record<string, number> = {};
    videos.forEach((video) => {
      if (video.uploadedBy?._id) {
        newKeys[video.uploadedBy._id] = Date.now();
      }
    });
    setImageKeys(newKeys);

    const handleAvatarUpdate = () => {
      const updatedKeys: Record<string, number> = {};
      videos.forEach((video) => {
        if (video.uploadedBy?._id) {
          updatedKeys[video.uploadedBy._id] = Date.now();
        }
      });
      setImageKeys(updatedKeys);
    };

    window.addEventListener("avatarUpdated", handleAvatarUpdate);
    return () =>
      window.removeEventListener("avatarUpdated", handleAvatarUpdate);
  }, [videos]);

  // ========== Avatar URL Function ==========
  const getAvatarUrl = (uploadedBy?: any): string => {
    const defaultAvatar =
      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';

    if (!uploadedBy?.image && !uploadedBy?.avatar) {
      console.log("⚠️ No image provided, using default avatar");
      return defaultAvatar;
    }

    const imageUrl = uploadedBy.image || uploadedBy.avatar;
    console.log("🖼️ Processing avatar:", imageUrl);

    // Use urlHelper to normalize all URLs consistently
    const normalizedUrl = normalizeURL(imageUrl);

    if (normalizedUrl) {
      console.log("✅ Normalized avatar URL:", normalizedUrl);
      return normalizedUrl;
    }

    console.log("⚠️ Failed to normalize avatar, using default");
    return defaultAvatar;
  };

  // ========== Enhanced Video URL Function ==========
  const getVideoUrlForPreview = (video: Video): string => {
    const backend = getBackendURL();

    // Try using the urlHelper's getVideoUrl first
    const urlFromHelper = getVideoUrl(video);
    if (urlFromHelper) {
      console.log("✅ Video URL from helper:", urlFromHelper.substring(0, 60));
      return urlFromHelper;
    }

    // Fallback: Manual construction
    if (video?.videofilename) {
      const manualUrl = `${backend}/uploads/videos/${video.videofilename}`;
      console.log(
        "✅ Manual video URL from filename:",
        manualUrl.substring(0, 60),
      );
      return manualUrl;
    } else if (video?.filepath) {
      const normalizedUrl = normalizeURL(video.filepath);
      if (normalizedUrl) {
        console.log(
          "✅ Normalized filepath URL:",
          normalizedUrl.substring(0, 60),
        );
        return normalizedUrl;
      }
    }

    console.log("⚠️ No valid video URL found, using fallback");
    return "/video/vdo.mp4";
  };

const getEnhancedThumbnailUrl = (video: Video): string | null => {
  const backend = getBackendURL();
  
  console.log("🔍 Finding thumbnail for video:", video._id);
  console.log("📦 Video data:", {
    thumbnail: video.thumbnail,
    videothumbnail: video.videothumbnail,
    videothumb: video.videothumb,
    thumbnailUrl: video.thumbnailUrl,
    videofilename: video.videofilename,
    filepath: video.filepath
  });

  // Priority 1: Check all thumbnail fields
  const thumbnailFields = [
    video.thumbnailUrl,      // Most specific
    video.videothumbnail,    // Common field
    video.thumbnail,         // Generic field
    video.videothumb,        // Alternative field
  ];

  for (const field of thumbnailFields) {
    if (field) {
      const fieldStr = String(field).trim();
      
      // Complete Supabase URL
      if (fieldStr.includes("supabase.co/storage/v1/object")) {
        console.log("✅ Using complete Supabase URL:", fieldStr.substring(0, 80));
        return fieldStr;
      }

      // Full HTTP/HTTPS URL
      if (fieldStr.startsWith("http://") || fieldStr.startsWith("https://")) {
        console.log("✅ Using full URL:", fieldStr.substring(0, 80));
        return fieldStr;
      }

      // Cloudinary URL
      if (fieldStr.includes("cloudinary.com")) {
        console.log("✅ Using Cloudinary URL:", fieldStr.substring(0, 80));
        return fieldStr;
      }

      // Relative path starting with /uploads/
      if (fieldStr.startsWith("/uploads/")) {
        const fullUrl = `${backend}${fieldStr}`;
        console.log("✅ Constructed backend URL:", fullUrl.substring(0, 80));
        return fullUrl;
      }

      // Just a filename with extension
      if (fieldStr.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
        // Try Supabase first
        const supabaseUrl = `https://ejzqutnyengdtfxkczu.supabase.co/storage/v1/object/public/youtube-videos/${fieldStr}`;
        console.log("✅ Constructed Supabase URL from filename:", supabaseUrl.substring(0, 80));
        return supabaseUrl;
      }
    }
  }

  // Priority 2: Extract thumbnail from video filename
  if (video.videofilename) {
    const videoFile = String(video.videofilename);
    const thumbFilename = videoFile
      .split("/")
      .pop()
      ?.replace(/\.(mp4|mov|avi|webm|mkv)$/i, ".jpg");

    if (thumbFilename) {
      const supabaseThumbUrl = `https://ejzqutnyengdtfxkczu.supabase.co/storage/v1/object/public/youtube-videos/${thumbFilename}`;
      console.log("🔄 Generated thumbnail from video filename:", supabaseThumbUrl.substring(0, 80));
      return supabaseThumbUrl;
    }
  }

  // Priority 3: Extract from filepath
  if (video.filepath) {
    const filepath = String(video.filepath);
    const thumbFilename = filepath
      .split("/")
      .pop()
      ?.replace(/\.(mp4|mov|avi|webm|mkv)$/i, ".jpg");

    if (thumbFilename) {
      const supabaseThumbUrl = `https://ejzqutnyengdtfxkczu.supabase.co/storage/v1/object/public/youtube-videos/${thumbFilename}`;
      console.log("🔄 Generated thumbnail from filepath:", supabaseThumbUrl.substring(0, 80));
      return supabaseThumbUrl;
    }
  }

  console.log("⚠️ No valid thumbnail URL found for video:", video._id);
  return null;
};
  // ========== Format Views Function ==========
  const formatViews = (views?: number): string => {
    if (!views) return "0 views";
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views} views`;
  };

  // ========== Handle Thumbnail Error ==========
  const handleThumbnailError = (videoId: string, thumbnailUrl: string) => {
    console.error("❌ Thumbnail failed to load:", thumbnailUrl);
    setFailedThumbnails((prev) => new Set(prev).add(videoId));
  };

  // ========== Empty State ==========
  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="text-sm">No related videos available</p>
      </div>
    );
  }

  // ========== Main Render ==========
  return (
    <div className="space-y-2 pb-6 md:pb-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-3 md:px-0 pt-3 md:pt-0 pb-2">
        <div className="w-1 h-5 bg-blue-600 dark:bg-blue-500 rounded-full" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Related Videos
        </h2>
      </div>

      {/* Video List */}
      <div className="space-y-2">
        {videos.slice(0, 20).map((video) => {
          const avatarUrl = getAvatarUrl(video.uploadedBy);
          const thumbnailUrl = getEnhancedThumbnailUrl(video);
          console.log(
            "🔍 Video:",
            video._id,
            "Thumbnail:",
            thumbnailUrl,
            "Raw data:",
            {
              thumbnail: video.thumbnail,
              videothumbnail: video.videothumbnail,
              videothumb: video.videothumb,
              thumbnailUrl: video.thumbnailUrl,
            },
          );
          const videoUrl = getVideoUrlForPreview(video);
          const channelName =
            video.uploadedBy?.channelname ||
            video.uploadedBy?.name ||
            video?.videochanel ||
            "Unknown Channel";
          const channelInitial = channelName[0]?.toUpperCase() || "U";
          const hasThumbnailFailed = failedThumbnails.has(video._id);

          return (
            <Link
              key={video._id}
              href={`/watch/${video._id}`}
              className="flex gap-2 md:gap-3 px-3 md:px-0 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors group"
            >
           {/* ========== Thumbnail Section ========== */}
<div className="relative w-[140px] sm:w-[160px] md:w-[168px] h-[79px] sm:h-[90px] md:h-[94px] bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden flex-shrink-0 shadow-md dark:shadow-gray-900/50">
  {thumbnailUrl && !hasThumbnailFailed ? (
    <>
      {/* Actual Thumbnail Image */}
      <img
        src={thumbnailUrl}
        alt={video?.videotitle || "Video thumbnail"}
        className="w-full h-full object-cover"
        onError={() => handleThumbnailError(video._id, thumbnailUrl)}
        onLoad={() => {
          console.log("✅ Thumbnail loaded:", video._id, thumbnailUrl.substring(0, 60));
        }}
      />
    </>
  ) : (
    /* Fallback Placeholder */
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 dark:from-gray-800 dark:to-gray-900">
      <div className="text-center text-gray-400">
        <svg
          className="w-8 h-8 mx-auto mb-1 opacity-50"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
        <p className="text-[10px] font-medium">No Preview</p>
      </div>
    </div>
  )}

  {/* Duration Badge */}
  {video?.duration && (
    <div className="absolute bottom-1.5 right-1.5 bg-black/90 dark:bg-black/95 backdrop-blur-sm text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
      {video.duration}
    </div>
  )}
</div>

              {/* ========== Video Info Section ========== */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                {/* Title */}
                <h3 className="font-medium text-[14px] md:text-sm leading-[1.4] line-clamp-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">
                  {video?.videotitle || "Untitled Video"}
                </h3>

                {/* Channel Info with Avatar */}
                <Link
                  href={`/channel/${video.uploadedBy?._id || "unknown"}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 mb-1 group/channel"
                >
                  {/* Avatar with Gradient Fallback */}
                  <div className="relative w-5 h-5 flex-shrink-0 rounded-full overflow-hidden ring-2 ring-transparent group-hover/channel:ring-blue-500 dark:group-hover/channel:ring-blue-400 transition-all">
                    {/* Fallback gradient background */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white text-[9px] font-semibold">
                      {channelInitial}
                    </div>
                    {/* Avatar image overlays on top */}
                    <img
                      key={`avatar-${video._id}-${imageKeys[video.uploadedBy?._id || ""] || Date.now()}`}
                      src={avatarUrl}
                      alt={channelName}
                      className="absolute inset-0 w-full h-full object-cover z-10"
                      onError={(e) => {
                        console.error("❌ Avatar failed to load:", avatarUrl);
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = "none";
                      }}
                      onLoad={() => {
                        console.log(
                          "✅ Avatar loaded successfully:",
                          video._id,
                        );
                      }}
                    />
                  </div>

                  {/* Channel Name */}
                  <p className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors truncate">
                    {channelName}
                  </p>
                </Link>

                {/* Views and Date */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400">
                  <span className="font-medium">
                    {formatViews(video?.views)}
                  </span>
                  <span>•</span>
                  <span>
                    {video?.createdAt
                      ? formatDistanceToNow(new Date(video.createdAt), {
                          addSuffix: true,
                        })
                      : "Recently"}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom spacing for mobile navigation */}
      <div className="h-20 md:h-0" />
    </div>
  );
};

export default RelatedVideos;
