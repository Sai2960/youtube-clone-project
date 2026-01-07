// src/components/videocard.tsx - COMPLETE MERGED & ENHANCED VERSION
// Combines all features from both implementations with full URL helper integration

import Link from "next/link";
import { useRouter } from "next/router";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { formatViews, formatTimeAgo } from "@/lib/formatUtils";
import { getImageUrl } from "@/lib/imageUtils";
import { useState, useEffect } from "react";
import { normalizeURL, getVideoUrl, getThumbnailUrl } from "@/lib/urlHelper";

const fallbackVideo = "/video/vdo.mp4";
const fallbackThumbnail = "/placeholder-thumbnail.jpg";

export default function VideoCard({ video }: any) {
  const router = useRouter();
  const [imageKey, setImageKey] = useState(Date.now());
  const [thumbnailError, setThumbnailError] = useState(false);
  const [thumbnailRetryCount, setThumbnailRetryCount] = useState(0);
  // ========== Avatar Cache Management ==========
  useEffect(() => {
    const handleUpdate = () => {
      setImageKey(Date.now());
    };

    window.addEventListener("avatarUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("avatarUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // ========== Get Video URL with Validation ==========
  const videoUrl = getVideoUrl(video);

  const validatedVideoUrl = (() => {
    if (!videoUrl) {
      console.warn("⚠️ No video URL found in card:", video?._id);
      return fallbackVideo;
    }

    // If it's a Cloudinary URL, validate and normalize it
    if (videoUrl.includes("cloudinary.com")) {
      if (videoUrl.includes("/video/upload/")) {
        const normalized = normalizeURL(videoUrl);
        console.log(
          "✅ Valid Cloudinary URL normalized:",
          normalized?.substring(0, 60)
        );
        return normalized || fallbackVideo;
      } else {
        console.warn(
          "⚠️ Invalid Cloudinary URL format (missing /video/upload/):",
          videoUrl
        );
        return fallbackVideo;
      }
    }

    // For non-Cloudinary URLs, normalize them
    const normalized = normalizeURL(videoUrl);
    if (normalized) {
      console.log(
        "✅ Non-Cloudinary URL normalized:",
        normalized.substring(0, 60)
      );
      return normalized;
    }

    console.warn("⚠️ Could not normalize video URL:", videoUrl);
    return fallbackVideo;
  })();

  // ========== Get Thumbnail URL ==========
  // ========== Get Thumbnail URL with Supabase Support ==========
  const thumbnailUrl = (() => {
    // ✅ Priority 1: Check explicit thumbnail fields
    const explicitThumbnail =
      video?.thumbnailUrl ||
      video?.thumbnail ||
      video?.videothumbnail ||
      video?.videothumb;

    if (explicitThumbnail?.startsWith("http")) {
      console.log(
        "✅ Using explicit thumbnail:",
        explicitThumbnail.substring(0, 60)
      );
      return explicitThumbnail;
    }

    // ✅ Priority 2: Check if video is from Supabase
    const videoUrl = video?.filepath || video?.videofile || video?.videoLink;

    if (videoUrl?.includes("supabase.co")) {
      console.log("📦 Supabase video detected - using video URL as thumbnail");
      return videoUrl; // Supabase doesn't generate thumbnails, use video URL
    }

    // ✅ Priority 3: Generate from Cloudinary (legacy videos)
    if (
      videoUrl?.includes("cloudinary.com") &&
      videoUrl.includes("/video/upload/")
    ) {
      try {
        const match = videoUrl.match(
          /https:\/\/res\.cloudinary\.com\/([^/]+)\/video\/upload\/(.+)/
        );

        if (match) {
          const cloudName = match[1];
          let publicId = match[2];

          // Remove transformations
          publicId = publicId
            .split("/")
            .filter(
              (segment) =>
                !segment.match(/^(f_|vc_|ac_|af_|br_|q_|w_|h_|c_|so_|t_)/)
            )
            .join("/");

          publicId = publicId.replace(/\.(mp4|mov|avi|mkv|webm)$/i, "");

          const thumbnail = `https://res.cloudinary.com/${cloudName}/video/upload/so_0,w_640,h_360,c_fill,q_auto:good/${publicId}.jpg`;
          console.log(
            "🖼️ Generated Cloudinary thumbnail:",
            thumbnail.substring(0, 80)
          );
          return thumbnail;
        }
      } catch (error) {
        console.error("❌ Thumbnail generation error:", error);
      }
    }

    // ✅ Fallback
    console.warn("⚠️ No thumbnail available, using fallback");
    return fallbackThumbnail;
  })();

  // ========== Channel Navigation Handler ==========
  const handleChannelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const channelId = video?.uploadedBy?._id || video?.uploadedBy;
    if (channelId) {
      console.log("📺 Navigating to channel from card:", channelId);
      router.push(`/channel/${channelId}`);
    } else {
      console.warn("⚠️ No channel ID available for navigation");
    }
  };

  // ========== Get Channel Image ==========
  // Check multiple possible sources for channel image
  const channelImage =
    video?.uploadedBy?.image ||
    video?.uploadedBy?.avatar ||
    video?.videoowner?.image ||
    video?.videoowner?.avatar ||
    video?.channelImage;

  const channelImageUrl = getImageUrl(channelImage, true);

  // ========== Get Channel Name ==========
  const channelName =
    video?.uploadedBy?.channelname ||
    video?.uploadedBy?.name ||
    video?.videochanel ||
    video?.videoowner?.name ||
    "Unknown Channel";

  const channelInitial = channelName?.[0]?.toUpperCase() || "U";

  // ========== Thumbnail Error Handler ==========
  // Get thumbnail with retry logic
  const validatedThumbnailUrl = (() => {
    if (!thumbnailUrl) {
      console.warn("⚠️ No thumbnail URL for video:", video?._id);
      return fallbackThumbnail;
    }

    console.log("✅ Using thumbnail:", thumbnailUrl.substring(0, 60));
    return thumbnailUrl;
  })();

  const handleThumbnailError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    console.error("❌ Thumbnail failed:", validatedThumbnailUrl);

    if (thumbnailRetryCount < 2) {
      setThumbnailRetryCount((prev) => prev + 1);
      setThumbnailError(true);
    } else {
      e.currentTarget.src = fallbackThumbnail;
    }
  };

  const handleThumbnailLoad = () => {
    if (thumbnailUrl) {
      console.log("✅ Thumbnail loaded successfully:", video?._id);
    }
  };

  // ========== Main Render ==========
  return (
    <Link href={`/watch/${video?._id}`} className="block group cursor-pointer">
      <div className="w-full">
        {/* ========== Thumbnail Container ========== */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-youtube-secondary mb-3 shadow-sm hover:shadow-md transition-shadow">
          {validatedThumbnailUrl && !thumbnailError ? (
            <img
              src={validatedThumbnailUrl}
              alt={video?.videotitle || "Video thumbnail"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
              onError={handleThumbnailError}
              onLoad={handleThumbnailLoad}
            />
          ) : (
            // Fallback placeholder with better styling
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-900 dark:to-black text-white">
              <div className="text-center">
                <svg
                  className="w-12 h-12 mx-auto mb-2 opacity-50"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
                <p className="text-xs font-medium opacity-75">No Thumbnail</p>
              </div>
            </div>
          )}

          {/* Duration Badge */}
          {video?.duration && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/90 backdrop-blur-sm text-white text-xs font-semibold px-1.5 py-0.5 rounded shadow-lg">
              {video.duration}
            </div>
          )}
        </div>

        {/* ========== Video Info Section ========== */}
        <div className="flex gap-3">
          {/* ========== Clickable Channel Avatar ========== */}
          <div
            onClick={handleChannelClick}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            role="button"
            tabIndex={0}
            aria-label={`Go to ${channelName} channel`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleChannelClick(e as any);
              }
            }}
          >
            <Avatar className="w-9 h-9 flex-shrink-0 mt-0.5 ring-2 ring-transparent hover:ring-blue-500 dark:hover:ring-blue-400 transition-all">
              <AvatarImage
                key={`video-avatar-${imageKey}`}
                src={channelImageUrl}
                alt={channelName}
                onError={() => {
                  console.error(
                    "❌ Channel avatar failed to load:",
                    channelImageUrl
                  );
                }}
                onLoad={() => {
                  console.log("✅ Channel avatar loaded:", video?._id);
                }}
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
                {channelInitial}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* ========== Text Content ========== */}
          <div className="flex-1 min-w-0">
            {/* Video Title */}
            <h3 className="font-medium text-sm leading-5 line-clamp-2 mb-1 text-youtube-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {video?.videotitle || "Untitled Video"}
            </h3>

            {/* ========== Clickable Channel Name ========== */}
            <p
              onClick={handleChannelClick}
              className="text-xs text-youtube-secondary hover:text-youtube-primary dark:hover:text-white transition-colors cursor-pointer line-clamp-1 w-fit mb-1"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleChannelClick(e as any);
                }
              }}
            >
              {channelName}
            </p>

            {/* ========== Video Stats ========== */}
            <div className="flex items-center gap-1 text-xs text-youtube-secondary">
              <span className="font-medium">
                {formatViews(video?.views || 0)}
              </span>
              <span>•</span>
              <span>
                {video?.createdAt
                  ? formatTimeAgo(video.createdAt)
                  : "Recently uploaded"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
<style jsx>{`
  video[poster] {
    object-fit: cover;
    background: #000;
  }
  
  /* Show first frame for videos without poster */
  video:not([poster]) {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
`}</style>