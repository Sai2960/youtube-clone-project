/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/index.tsx - COMPLETE FIXED VERSION (NO NESTED LINKS)

import { NextPage } from "next";
import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Play, ChevronRight } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import MobileBottomNav from "@/components/ui/MobileBottomNav";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  getImageUrl,
  getShortAvatar,
  getShortChannelName,
} from "@/lib/imageUtils";
import { VideoGridSkeleton } from "@/components/VideoSkeleton";
// Line ~10 - ADD this import
import { getThumbnailUrl as getThumbnailUrlHelper } from "@/lib/urlHelper";

interface Video {
  videoLink: string;
  videofile: string;
  videothumbnail: string;
  videothumb: any;
  thumbnailUrl: string;
  _id: string;
  videotitle: string;
  videoUrl?: string;
  videofilename?: string;
  filepath?: string;
  thumbnail?: string;
  duration?: string;
  views?: number;
  videochanel?: string;
  uploadedBy?: {
    _id: string;
    name: string;
    channelname?: string;
    image?: string;
  };
  createdAt?: string;
}

interface Short {
  _id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  views: number;
  channelName?: string;
  channelAvatar?: string;
  userId: {
    [x: string]: string;
    _id: string;
    name: string;
    channelName?: string;
    image?: string;
    avatar?: string;
  };
}

// Dynamic API URL based on hostname
const getApiUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `http://${hostname}:5000`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://192.168.0.181:5000";
};

// Dynamic backend URL based on hostname
const getBackendUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `http://${hostname}:5000`;
    }
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://192.168.0.181:5000";
};

const Home: NextPage = () => {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [loadingShorts, setLoadingShorts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [imageKeys, setImageKeys] = useState<Record<string, number>>({});
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const shortsScrollRef = useRef<HTMLDivElement>(null);

  // Touch scroll states
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    fetchVideos();
    fetchShorts();

    // ✅ CRITICAL FIX: Refresh on window focus
    const handleFocus = () => {
      console.log("🔄 Window focused - refreshing data");
      fetchVideos();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);

    // Listen for avatar updates
    const handleAvatarUpdate = () => {
      const newKeys: Record<string, number> = {};
      videos.forEach((video) => {
        if (video.uploadedBy?._id) {
          newKeys[video.uploadedBy._id] = Date.now();
        }
      });
      setImageKeys(newKeys);
    };

    window.addEventListener("avatarUpdated", handleAvatarUpdate);
    return () =>
      window.removeEventListener("avatarUpdated", handleAvatarUpdate);
  }, []);

  const fetchVideos = async () => {
    try {
      setLoadingVideos(true);
      console.log("📹 Fetching videos...");

      // ✅ CRITICAL FIX: Add timestamp to prevent caching
      const res = await axiosInstance.get("/video/getall", {
        params: { _t: Date.now() },
      });
      if (res.data.success && Array.isArray(res.data.videos)) {
        setVideos(res.data.videos);
        console.log("✅ Loaded", res.data.videos.length, "videos");

        // Initialize image keys
        const newKeys: Record<string, number> = {};
        res.data.videos.forEach((video: Video) => {
          if (video.uploadedBy?._id) {
            newKeys[video.uploadedBy._id] = Date.now();
          }
        });
        setImageKeys(newKeys);
      } else {
        console.warn("⚠️ Unexpected video response format:", res.data);
      }
    } catch (error: any) {
      console.error("❌ Error fetching videos:", error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const fetchShorts = async () => {
    try {
      setLoadingShorts(true);
      console.log("🎬 Fetching shorts...");

      const response = await axiosInstance.get("/api/shorts", {
        params: { limit: 20 },
      });

      if (response.data.success && Array.isArray(response.data.data)) {
        setShorts(response.data.data);
        console.log("✅ Loaded", response.data.data.length, "shorts");
      } else {
        setShorts([]);
      }
    } catch (error: any) {
      console.error("❌ Error fetching shorts:", error);
      setShorts([]);
    } finally {
      setLoadingShorts(false);
    }
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (window.scrollY === 0 && startY.current > 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - startY.current);
      setPullDistance(Math.min(distance, 100));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 80) {
      setRefreshing(true);
      setTimeout(() => {
        fetchVideos();
        fetchShorts();
        setRefreshing(false);
        setPullDistance(0);
      }, 1000);
    } else {
      setPullDistance(0);
    }
    startY.current = 0;
  };

  useEffect(() => {
    const loadVideos = async () => {
      try {
        const response = await axiosInstance.get("/video/getall");
        console.log("📊 Videos loaded:", {
          total: response.data.videos?.length,
          success: response.data.success,
          firstVideo: response.data.videos?.[0],
        });

        if (response.data.success && response.data.videos) {
          setVideos(response.data.videos);
        }
      } catch (error) {
        console.error("❌ Load videos error:", error);
      }
    };

    loadVideos();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("touchstart", handleTouchStart as any);
      container.addEventListener("touchmove", handleTouchMove as any);
      container.addEventListener("touchend", handleTouchEnd);

      return () => {
        container.removeEventListener("touchstart", handleTouchStart as any);
        container.removeEventListener("touchmove", handleTouchMove as any);
        container.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [pullDistance]);

  const formatViews = (views?: number): string => {
    if (!views) return "0 views";
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views} views`;
  };

  const formatViewsShort = (views?: number): string => {
    if (!views) return "0";
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return `${views}`;
  };

  const formatTimeAgo = (date?: string): string => {
    if (!date) return "Recently";
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000
    );

    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval !== 1 ? "s" : ""} ago`;
      }
    }
    return "Just now";
  };

  // REPLACE lines 54-68 (the getVideoUrl function) with:
  const getVideoUrl = (video: Video) => {
    const backend = "https://youtube-clone-project-q3pd.onrender.com";

    // Priority order for video URL
    if (video?.videofilename) {
      return `${backend}/uploads/videos/${video.videofilename}`;
    }
    if (video?.filepath) {
      // If filepath is already a full URL, return it
      if (video.filepath.startsWith("http")) {
        return video.filepath;
      }
      // Otherwise, construct the URL
      const filename = video.filepath.split(/[\\/]/).pop();
      return `${backend}/uploads/videos/${filename}`;
    }
    if (video?.videoUrl) {
      return video.videoUrl.startsWith("http")
        ? video.videoUrl
        : `${backend}${video.videoUrl}`;
    }

    return "/video/vdo.mp4";
  };
  const getThumbnailUrl = (video: Video) => {
    // ✅ Priority 1: Use helper function first
    const helperThumbnail = getThumbnailUrlHelper(video);
    if (helperThumbnail && !helperThumbnail.includes("placeholder")) {
      console.log(
        "✅ Thumbnail from helper:",
        helperThumbnail.substring(0, 60)
      );
      return helperThumbnail;
    }

    // ✅ Priority 2: Check explicit thumbnail fields
    if (video?.thumbnailUrl) {
      if (video.thumbnailUrl.startsWith("http")) {
        console.log(
          "✅ Using video.thumbnailUrl:",
          video.thumbnailUrl.substring(0, 60)
        );
        return video.thumbnailUrl;
      }
      const backend = "https://youtube-clone-project-q3pd.onrender.com";
      return `${backend}${video.thumbnailUrl}`;
    }

    if (video?.thumbnail) {
      if (video.thumbnail.startsWith("http")) {
        console.log(
          "✅ Using video.thumbnail:",
          video.thumbnail.substring(0, 60)
        );
        return video.thumbnail;
      }
      const backend = "https://youtube-clone-project-q3pd.onrender.com";
      return `${backend}${video.thumbnail}`;
    }

    if (video?.videothumbnail) {
      if (video.videothumbnail.startsWith("http")) {
        return video.videothumbnail;
      }
      const backend = "https://youtube-clone-project-q3pd.onrender.com";
      return `${backend}${video.videothumbnail}`;
    }

    if (video?.videothumb) {
      if (video.videothumb.startsWith("http")) {
        return video.videothumb;
      }
      const backend = "https://youtube-clone-project-q3pd.onrender.com";
      return `${backend}${video.videothumb}`;
    }

    // ✅ Priority 3: Generate from video URL
    const videoUrl = video?.filepath || video?.videofile || video?.videoLink;

    if (
      videoUrl &&
      videoUrl.includes("res.cloudinary.com") &&
      videoUrl.includes("/video/upload/")
    ) {
      try {
        const parts = videoUrl.split("/video/upload/");
        if (parts.length === 2) {
          const pathAfterUpload = parts[1]
            .split("/")
            .filter(
              (part) =>
                !part.includes("f_") &&
                !part.includes("vc_") &&
                !part.includes("ac_")
            )
            .join("/");

          const generatedThumbnail =
            `https://res.cloudinary.com/dxuxxk0ss/video/upload/so_0,w_640,h_360,c_fill,q_auto:good/${pathAfterUpload}`.replace(
              /\.(mp4|mov|avi|mkv|webm)$/i,
              ".jpg"
            );

          console.log(
            "🖼️ Generated thumbnail from video:",
            generatedThumbnail.substring(0, 80)
          );
          return generatedThumbnail;
        }
      } catch (error) {
        console.error("❌ Error generating thumbnail:", error);
      }
    }

    // ✅ Fallback
    console.warn("⚠️ No thumbnail available for video:", video?._id);
    return "/placeholder-thumbnail.jpg";
  };

  const scrollShorts = (direction: "left" | "right") => {
    if (shortsScrollRef.current) {
      const scrollAmount = 300;
      shortsScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleShortsScrollTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = false;
  };

  const handleShortsScrollTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    if (Math.abs(touchStartX.current - touchEndX.current) > 5) {
      isDragging.current = true;
    }
  };

  const handleShortsScrollTouchEnd = () => {
    if (!isDragging.current) return;

    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold && shortsScrollRef.current) {
      const scrollAmount = 250;
      shortsScrollRef.current.scrollBy({
        left: diff > 0 ? scrollAmount : -scrollAmount,
        behavior: "smooth",
      });
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
    isDragging.current = false;
  };

  const handleShortClick = (
    e: React.MouseEvent,
    shortId: string,
    index: number
  ) => {
    if (isDragging.current) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    router.push({
      pathname: "/shorts",
      query: { start: index.toString() },
    });
  };

  return (
    <>
      <Head>
        <title>YourTube - Home</title>
      </Head>

      <div
        ref={containerRef}
        className="w-full bg-white dark:bg-gray-900 min-h-screen pb-16 lg:pb-0"
      >
        {/* Pull to Refresh Indicator */}
        {pullDistance > 0 && (
          <div
            className="fixed top-0 left-0 right-0 flex justify-center items-center z-50 transition-all"
            style={{ height: `${pullDistance}px` }}
          >
            <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-3">
              {refreshing ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500" />
              ) : (
                <svg
                  className="w-6 h-6 text-gray-900 dark:text-white transition-transform"
                  style={{ transform: `rotate(${pullDistance * 3.6}deg)` }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
            </div>
          </div>
        )}

       {/* Shorts Section - YouTube Style */}
{shorts.length > 0 && (
  <section className="py-4 border-b-8 border-gray-100 dark:border-gray-800 lg:border-b lg:border-gray-200 dark:lg:border-gray-700 lg:py-6">
    {/* Header */}
    <div className="flex items-center gap-3 px-4 mb-4 lg:px-6">
      <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0 lg:w-10 lg:h-10 lg:rounded-xl">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white lg:w-5 lg:h-5">
          <path d="M10 14.65v-5.3L15 12l-5 2.65zm7.77-4.33c-.77-.32-1.2-.5-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white lg:text-2xl">
        Shorts
      </h2>
    </div>

    {loadingShorts ? (
      <div 
        className="overflow-x-hidden px-4 lg:px-6"
        style={{ display: 'flex', gap: '12px' }}
      >
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            style={{ 
              flex: '0 0 160px',
              width: '160px',
              minWidth: '160px'
            }}
          >
            <div 
              className="bg-gray-200 dark:bg-gray-800 rounded-xl skeleton mb-2"
              style={{ width: '160px', height: '284px' }}
            />
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded skeleton mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded skeleton w-3/4" />
          </div>
        ))}
      </div>
    ) : (
      <div className="relative group/container">
        {/* Desktop Navigation Buttons */}
        <button
          onClick={() => scrollShorts("left")}
          className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/95 dark:bg-gray-800/95 hover:bg-white dark:hover:bg-gray-800 rounded-full items-center justify-center opacity-0 group-hover/container:opacity-100 transition-opacity shadow-lg backdrop-blur-sm"
          aria-label="Scroll left"
        >
          <ChevronRight size={20} className="rotate-180 text-gray-900 dark:text-white" />
        </button>

        <button
          onClick={() => scrollShorts("right")}
          className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/95 dark:bg-gray-800/95 hover:bg-white dark:hover:bg-gray-800 rounded-full items-center justify-center opacity-0 group-hover/container:opacity-100 transition-opacity shadow-lg backdrop-blur-sm"
          aria-label="Scroll right"
        >
          <ChevronRight size={20} className="text-gray-900 dark:text-white" />
        </button>

        {/* Shorts Container */}
        <div
          ref={shortsScrollRef}
          className="overflow-x-scroll scrollbar-hide"
          style={{
            display: 'flex',
            gap: '12px',
            padding: '0 16px',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
          onTouchStart={handleShortsScrollTouchStart}
          onTouchMove={handleShortsScrollTouchMove}
          onTouchEnd={handleShortsScrollTouchEnd}
        >
          {shorts.slice(0, 12).map((short, index) => {
            const shortAvatar = getShortAvatar(short);
            const shortChannelName = getShortChannelName(short);

            return (
              <div
                key={short._id}
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest(".no-click")) {
                    handleShortClick(e, short._id, index);
                  }
                }}
                className="cursor-pointer group/short"
                style={{
                  flex: '0 0 160px',
                  width: '160px',
                  minWidth: '160px',
                  maxWidth: '160px'
                }}
              >
                {/* Thumbnail Card */}
                <div 
                  className="relative rounded-xl overflow-hidden bg-gray-900 mb-3 shadow-md"
                  style={{
                    width: '160px',
                    height: '284px'
                  }}
                >
                  <img
                    src={short.thumbnailUrl}
                    alt={short.title}
                    className="w-full h-full object-cover group-hover/short:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />

                  {/* Bottom Gradient Overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

                  {/* Views Badge */}
                  <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                    <span className="text-xs font-bold text-white">
                      {formatViewsShort(short.views)}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 
                  className="text-sm font-semibold text-gray-900 dark:text-white leading-tight mb-2"
                  style={{
                    width: '160px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    wordBreak: 'break-word',
                    minHeight: '2.5rem'
                  }}
                >
                  {short.title}
                </h3>

                {/* Channel Info */}
                <div 
                  className="flex items-center gap-2 no-click"
                  style={{ width: '160px' }}
                >
                  {/* Avatar */}
                  <div
                    className="cursor-pointer flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/channel/${short.userId?._id}`);
                    }}
                  >
                    <img
                      src={getImageUrl(short.userId?.image || short.userId?.avatar, true)}
                      alt={shortChannelName}
                      className="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';
                      }}
                    />
                  </div>

                  {/* Channel Name - THE KEY FIX */}
                  <span
                    className="text-xs text-gray-600 dark:text-gray-400 font-medium cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors truncate flex-1 min-w-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/channel/${short.userId?._id}`);
                    }}
                    title={shortChannelName}
                  >
                    {shortChannelName}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </section>
)}
        {/* Videos Section - FIXED MOBILE LAYOUT */}
        <section className="px-3 py-4 lg:px-6">
          {loadingVideos ? (
            <div className="space-y-3 lg:grid lg:grid-cols-3 xl:grid-cols-4 lg:gap-4 lg:space-y-0">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="block">
                  <div className="w-full aspect-video bg-gray-200 dark:bg-gray-800 rounded-lg skeleton mb-3" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded skeleton" />
                    <div className="flex gap-2 items-center">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full skeleton" />
                      <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-800 rounded skeleton" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : videos.length > 0 ? (
            <div className="space-y-4 lg:grid lg:grid-cols-3 xl:grid-cols-4 lg:gap-4 lg:space-y-0">
            {videos.slice(0, 12).map((video) => {
  const channelName =
    video.uploadedBy?.channelname ||
    video.uploadedBy?.name ||
    video?.videochanel ||
    "Unknown Channel";
  const channelInitial = channelName[0]?.toUpperCase() || "U";

  return (
    <div key={video._id} className="block group">
      {/* Video Thumbnail */}
      <Link href={`/watch/${video._id}`} className="block mb-3">
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 lg:rounded-xl shadow-sm">
          <video
            src={getVideoUrl(video)}
            className="w-full h-full object-cover lg:group-hover:scale-105 lg:transition-transform lg:duration-200"
            preload="metadata"
            poster={getThumbnailUrl(video)}
          />
          {video?.duration && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/90 text-white text-[11px] font-bold px-1.5 py-0.5 rounded lg:px-2">
              {video.duration}
            </div>
          )}
        </div>
      </Link>

      {/* ✅ FIXED: Video Info with proper mobile constraints */}
      <div className="flex gap-2.5 min-w-0">
        {/* Avatar - Fixed sizing */}
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`/channel/${video.uploadedBy?._id || "unknown"}`);
          }}
          className="flex-shrink-0 cursor-pointer"
        >
          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-transparent hover:ring-blue-500 transition-all">
            {/* Fallback */}
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
              {channelInitial}
            </div>
            {/* Avatar Image */}
            <img
              key={`video-avatar-${video._id}-${imageKeys[video.uploadedBy?._id || ""] || Date.now()}`}
              src={getImageUrl(video.uploadedBy?.image, true)}
              alt={channelName}
              className="absolute inset-0 w-full h-full object-cover"
              crossOrigin="anonymous"
              loading="eager"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.opacity = "0";
                target.style.zIndex = "1";
              }}
              onLoad={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.opacity = "1";
                target.style.zIndex = "10";
              }}
            />
          </div>
        </div>

        {/* Text Info - Proper truncation */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <Link href={`/watch/${video._id}`}>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 mb-1 leading-tight lg:text-[15px] lg:leading-snug lg:group-hover:text-blue-600 dark:lg:group-hover:text-blue-400 lg:transition-colors">
              {video?.videotitle || "Untitled Video"}
            </h3>
          </Link>

          <p
            onClick={(e) => {
              e.preventDefault();
              router.push(`/channel/${video.uploadedBy?._id || "unknown"}`);
            }}
            className="text-xs text-gray-600 dark:text-gray-400 truncate mb-0.5 font-medium hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {channelName}
          </p>

          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-500 lg:text-xs font-medium">
            <span className="font-semibold truncate">{formatViews(video?.views)}</span>
            <span className="font-bold flex-shrink-0">•</span>
            <span className="truncate">{formatTimeAgo(video?.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
})}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No videos available
              </p>
            </div>
          )}
        </section>

        {/* More Videos Section */}
        {videos.length > 12 && (
          <section className="hidden lg:block px-6 pb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              More Videos
            </h2>
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.slice(12).map((video) => (
                <Link
                  key={video._id}
                  href={`/watch/${video._id}`}
                  className="block group cursor-pointer"
                >
                  <div className="w-full">
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 mb-3 shadow-sm">
                      <video
                        src={getVideoUrl(video)}
                        className="w-full h-full object-cover lg:group-hover:scale-105 lg:transition-transform lg:duration-200"
                        preload="metadata"
                        poster={getThumbnailUrl(video)}
                        onError={(e) => {
                          console.error("❌ Video load failed:", video._id);
                          const target = e.currentTarget;
                          target.poster = "/placeholder-thumbnail.jpg";
                        }}
                      />
                      {video?.duration && (
                        <div className="absolute bottom-1.5 right-1.5 bg-black/90 text-white text-xs font-bold px-2 py-0.5 rounded">
                          {video.duration}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      {/* ✅ FIXED: Channel Avatar - NO NESTED LINK */}
                      <div
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push(
                            `/channel/${video.uploadedBy?._id || "unknown"}`
                          );
                        }}
                        className="flex-shrink-0 mt-0.5 cursor-pointer"
                      >
                        <Avatar className="w-9 h-9 ring-2 ring-transparent hover:ring-blue-500 transition-all">
                          <AvatarImage
                            key={`more-video-${video._id}-avatar-${
                              imageKeys[video.uploadedBy?._id || ""] ||
                              Date.now()
                            }`}
                            src={getImageUrl(video.uploadedBy?.image, true)}
                            alt={
                              video.uploadedBy?.name ||
                              video.videochanel ||
                              "Channel"
                            }
                          />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm">
                            {(video.uploadedBy?.channelname ||
                              video.uploadedBy?.name ||
                              video.videochanel)?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 mb-1 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {video?.videotitle || "Untitled Video"}
                        </h3>

                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                          {video.uploadedBy?.channelname ||
                            video.uploadedBy?.name ||
                            video?.videochanel ||
                            "Unknown Channel"}
                        </p>

                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500 font-medium">
                          <span className="font-semibold">
                            {formatViews(video?.views)}
                          </span>
                          <span className="font-bold">•</span>
                          <span>{formatTimeAgo(video?.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <MobileBottomNav />

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .skeleton {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
};

export default Home;
