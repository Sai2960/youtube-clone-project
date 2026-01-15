/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/index.tsx - COMPLETE FIXED VERSION WITH AGGRESSIVE TEXT FIXES

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
import { getThumbnailUrl as getThumbnailUrlHelper } from "@/lib/urlHelper";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useUser } from "@/lib/AuthContext";
import { GetServerSideProps } from "next";
import { BACKEND_URL } from "@/lib/axiosinstance";

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

const getApiUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `http://${hostname}:5000`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://192.168.0.181:5000";
};

const getBackendUrl = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `http://${hostname}:5000`;
    }
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://192.168.0.181:5000";
};

const hapticFeedback = {
  light: () => {
    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }
  },
  selection: () => {
    if ("vibrate" in navigator) {
      navigator.vibrate(5);
    }
  },
  impact: () => {
    if ("vibrate" in navigator) {
      navigator.vibrate(15);
    }
  },
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

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isDragging = useRef(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [backendReady, setBackendReady] = useState(false);
  const [backendCheckAttempts, setBackendCheckAttempts] = useState(0);

  useEffect(() => {
    const applyTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const bgColor = isDark ? "#0f0f0f" : "#ffffff";

      document.body.style.backgroundColor = bgColor;
      document.documentElement.style.backgroundColor = bgColor;

      const container = document.querySelector(".w-full.min-h-screen");
      if (container instanceof HTMLElement) {
        container.style.backgroundColor = bgColor;
      }
    };

    applyTheme();

    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const pingBackend = async (attempt = 1): Promise<void> => {
      if (!isMounted) return;

      console.log(`🔍 Checking backend availability (attempt ${attempt})...`);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(`${BACKEND_URL}/health`, {
          signal: controller.signal,
          method: "GET",
          cache: "no-cache",
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log("✅ Backend is ready!");
          if (isMounted) {
            setBackendReady(true);
            setConnectionError(null);
          }
          return;
        }
      } catch (error) {
        console.warn(`⚠️ Backend check ${attempt} failed:`, error);
      }

      if (attempt < 5 && isMounted) {
        setBackendCheckAttempts(attempt);
        setConnectionError(`Server is warming up... (attempt ${attempt}/5)`);

        const delay = Math.min(5000 * Math.pow(1.5, attempt - 1), 15000);
        setTimeout(() => pingBackend(attempt + 1), delay);
      } else if (isMounted) {
        setConnectionError("Server timeout. Please refresh the page.");
      }
    };

    pingBackend();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (backendReady) {
      fetchVideos();
      fetchShorts();
    }
  }, [backendReady]);

  const fetchVideos = async () => {
    try {
      setLoadingVideos(true);
      console.log("📹 Fetching videos...");

      const res = await axiosInstance.get("/video/getall", {
        params: { _t: Date.now() },
      });
      if (res.data.success && Array.isArray(res.data.videos)) {
        setVideos(res.data.videos);
        console.log("✅ Loaded", res.data.videos.length, "videos");

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
        console.warn("⚠️ No shorts data");
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

  const getVideoUrl = (video: Video) => {
    const backend = "https://youtube-clone-project-production.up.railway.app";

    if (video?.videofilename) {
      return `${backend}/uploads/videos/${video.videofilename}`;
    }
    if (video?.filepath) {
      if (video.filepath.startsWith("http")) {
        return video.filepath;
      }
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
    const explicitThumbnail =
      video?.thumbnailUrl ||
      video?.thumbnail ||
      video?.videothumbnail ||
      video?.videothumb;

    if (explicitThumbnail?.startsWith("http")) {
      return explicitThumbnail;
    }

    const videoUrl = video?.filepath || video?.videofile || video?.videoLink;

    if (videoUrl?.includes("supabase.co")) {
      return videoUrl;
    }

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

          publicId = publicId
            .split("/")
            .filter(
              (segment) =>
                !segment.match(/^(f_|vc_|ac_|af_|br_|q_|w_|h_|c_|so_|t_)/)
            )
            .join("/");

          publicId = publicId.replace(/\.(mp4|mov|avi|mkv|webm)$/i, "");

          const thumbnail = `https://res.cloudinary.com/${cloudName}/video/upload/so_0,w_640,h_360,c_fill,q_auto:good/${publicId}.jpg`;
          return thumbnail;
        }
      } catch (error) {
        console.error("❌ Thumbnail generation error:", error);
      }
    }

    return "/placeholder-thumbnail.jpg";
  };

  const [thumbnailErrors, setThumbnailErrors] = useState<Set<string>>(
    new Set()
  );

  const handleThumbnailError = (videoId: string, url: string) => {
    console.error(`❌ Thumbnail failed for ${videoId}:`, url);
    setThumbnailErrors((prev) => new Set(prev).add(videoId));
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
    hapticFeedback.light();
    router.push({
      pathname: "/shorts",
      query: { id: shortId },
    });
  };

  return (
    <ProtectedRoute requireAuth={true}>
      <>
        <Head>
          <title>YourTube - Home</title>
        </Head>

        {connectionError && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-3 text-center text-sm lg:text-base">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="font-semibold">{connectionError}</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-1 bg-white text-yellow-600 rounded font-semibold text-xs"
            >
              Retry Connection
            </button>
          </div>
        )}

        {!backendReady && !connectionError && (
          <div className="fixed inset-0 z-40 bg-white dark:bg-gray-900 flex flex-col items-center justify-center">
            <div className="text-center px-4">
              <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Loading YourTube
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm max-w-md">
                {backendCheckAttempts > 0
                  ? `Waking up server... (${backendCheckAttempts}/5)`
                  : "Connecting to server..."}
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
                Free tier servers may take 30-60 seconds to wake up
              </p>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full min-h-screen pb-16 lg:pb-0"
          style={{
            backgroundColor: document.documentElement.classList.contains("dark")
              ? "#0f0f0f"
              : "#ffffff",
            position: "relative",
            width: "100%",
          }}
        >
          {process.env.NODE_ENV === "development" && (
            <div className="lg:hidden fixed top-2 right-2 z-50 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg">
              Shorts: {shorts.length} | Loading: {loadingShorts ? "Y" : "N"}
            </div>
          )}

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

          {/* ========== SHORTS SECTION WITH TEXT FIXES ========== */}
          {/* ========== SHORTS SECTION - COMPLETELY FIXED LAYOUT ========== */}
          {shorts.length > 0 && (
            <section
              className="py-4 border-b-8 border-gray-100 dark:border-gray-800 lg:border-b lg:border-gray-200 dark:lg:border-gray-700 lg:py-6 bg-youtube-primary"
              style={{
                display: "block",
                width: "100%",
                minHeight: "200px",
              }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-4 mb-4 lg:px-6 bg-youtube-primary">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0 lg:w-10 lg:h-10 lg:rounded-xl shadow-md">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 fill-white lg:w-5 lg:h-5"
                  >
                    <path d="M10 14.65v-5.3L15 12l-5 2.65zm7.77-4.33c-.77-.32-1.2-.5-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white lg:text-2xl">
                  Shorts
                </h2>
              </div>

              {loadingShorts ? (
                <div
                  className="overflow-x-hidden px-4 lg:px-6 bg-youtube-primary"
                  style={{ display: "flex", gap: "16px" }}
                >
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0"
                      style={{
                        minWidth: "200px",
                        width: "200px",
                      }}
                    >
                      <div
                        className="bg-gray-200 dark:bg-gray-800 rounded-xl skeleton mb-3"
                        style={{ width: "100%", paddingBottom: "177.5%" }}
                      />
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded skeleton mb-2" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded skeleton w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative group/container">
                  <button
                    onClick={() => scrollShorts("left")}
                    className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/95 dark:bg-gray-800/95 hover:bg-white dark:hover:bg-gray-800 rounded-full items-center justify-center opacity-0 group-hover/container:opacity-100 transition-opacity shadow-lg backdrop-blur-sm"
                    aria-label="Scroll left"
                  >
                    <ChevronRight
                      size={20}
                      className="rotate-180 text-gray-900 dark:text-white"
                    />
                  </button>

                  <button
                    onClick={() => scrollShorts("right")}
                    className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/95 dark:bg-gray-800/95 hover:bg-white dark:hover:bg-gray-800 rounded-full items-center justify-center opacity-0 group-hover/container:opacity-100 transition-opacity shadow-lg backdrop-blur-sm"
                    aria-label="Scroll right"
                  >
                    <ChevronRight
                      size={20}
                      className="text-gray-900 dark:text-white"
                    />
                  </button>

                  {/* Shorts Container - FIXED WIDTH */}
                  <div
                    ref={shortsScrollRef}
                    className="overflow-x-scroll scrollbar-hide bg-youtube-primary"
                    style={{
                      display: "flex",
                      gap: "16px",
                      padding: "0 16px",
                      scrollBehavior: "smooth",
                      WebkitOverflowScrolling: "touch",
                      touchAction: "pan-x",
                    }}
                    onTouchStart={handleShortsScrollTouchStart}
                    onTouchMove={handleShortsScrollTouchMove}
                    onTouchEnd={handleShortsScrollTouchEnd}
                  >
                    {shorts.slice(0, 12).map((short, index) => {
                      const shortAvatar = getShortAvatar(short);
                      const shortChannelName = getShortChannelName(short);

                      return (
                        // FIX: Use fixed width container - NOT flex-shrink-0 with small width
                        <div
                          key={short._id}
                          onClick={(e) => {
                            if (
                              !(e.target as HTMLElement).closest(".no-click")
                            ) {
                              handleShortClick(e, short._id, index);
                            }
                          }}
                          className="cursor-pointer group/short transition-all duration-200 ease-out touch-manipulation hover:scale-[0.97] active:scale-95"
                          style={{
                            minWidth: "200px",
                            width: "200px",
                            flexShrink: 0,
                            userSelect: "none",
                            WebkitTapHighlightColor: "transparent",
                          }}
                        >
                          {/* Thumbnail Card */}
                          <div
                            className="relative rounded-xl overflow-hidden bg-gray-900 mb-3 shadow-md w-full group/thumbnail transition-all duration-300 hover:shadow-2xl hover:ring-2 hover:ring-red-500/30 active:shadow-xl active:ring-2 active:ring-red-500/50"
                            style={{
                              paddingBottom: "177.5%",
                            }}
                          >
                            <img
                              src={short.thumbnailUrl}
                              alt={short.title}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover/short:scale-110 active:scale-105 lg:group-hover/thumbnail:scale-105"
                              loading="lazy"
                              onError={(e) => {
                                const target =
                                  e.currentTarget as HTMLImageElement;
                                console.error(
                                  "❌ Short thumbnail failed:",
                                  short.thumbnailUrl
                                );

                                if (
                                  short.thumbnailUrl.includes("supabase.co")
                                ) {
                                  target.style.display = "none";
                                  const parent = target.parentElement;
                                  if (
                                    parent &&
                                    !parent.querySelector("video")
                                  ) {
                                    const video =
                                      document.createElement("video");
                                    video.src = short.thumbnailUrl;
                                    video.className =
                                      "absolute inset-0 w-full h-full object-cover";
                                    video.muted = true;
                                    video.preload = "metadata";
                                    video.playsInline = true;
                                    parent.appendChild(video);
                                  }
                                } else {
                                  target.src = "/placeholder-thumbnail.jpg";
                                }
                              }}
                              onLoad={() => {
                                console.log(
                                  "✅ Short thumbnail loaded:",
                                  short._id
                                );
                              }}
                            />

                            {/* Play Icon Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/short:opacity-100 active:opacity-100 lg:group-hover/thumbnail:opacity-100 transition-all duration-300 bg-black/40 dark:bg-black/50 pointer-events-none">
                              <div className="bg-white dark:bg-white/95 backdrop-blur-sm rounded-full p-3 lg:p-4 shadow-xl transform scale-90 group-hover/short:scale-100 active:scale-110 lg:group-hover/thumbnail:scale-100 transition-transform duration-300">
                                <Play
                                  size={24}
                                  className="text-gray-900 dark:text-gray-900 lg:w-8 lg:h-8"
                                  fill="currentColor"
                                />
                              </div>
                            </div>

                            {/* Bottom Gradient */}
                            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

                            {/* Views Badge */}
                            <div className="absolute bottom-3 left-3 bg-black/80 dark:bg-black/85 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1.5 shadow-lg active:scale-105 transition-transform duration-150">
                              <svg
                                className="w-3.5 h-3.5 fill-white"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                              </svg>
                              <span className="text-xs font-bold text-white whitespace-nowrap drop-shadow-md">
                                {formatViewsShort(short.views)} views
                              </span>
                            </div>
                          </div>

                       {/* Shorts Title */}
<div className="w-full" style={{ marginBottom: "8px" }}>
  <h3
    className="shorts-title text-gray-900 dark:text-white"
    title={short.title}
  >
    {short.title}
  </h3>
</div>

                          {/* FIX: Channel Info Row */}
                          <div
                            className="flex items-center gap-2 no-click w-full"
                            style={{
                              minWidth: 0,
                              overflow: "hidden",
                            }}
                          >
                            {/* Avatar */}
                            <div
                              className="cursor-pointer flex-shrink-0 active:scale-95 transition-transform duration-150"
                              onClick={(e) => {
                                e.stopPropagation();
                                hapticFeedback.selection();
                                router.push(`/channel/${short.userId?._id}`);
                              }}
                            >
                              <img
                                src={getImageUrl(
                                  short.userId?.image || short.userId?.avatar,
                                  true
                                )}
                                alt={shortChannelName}
                                className="w-6 h-6 rounded-full object-cover border border-gray-200 dark:border-gray-700 lg:w-7 lg:h-7 lg:border-2 active:ring-2 active:ring-blue-500/50 transition-all duration-150"
                                onError={(e) => {
                                  e.currentTarget.src =
                                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';
                                }}
                              />
                            </div>

                            {/* FIX: Channel Name with proper flex shrinking */}
                            <span
                              className="shorts-channel-name text-gray-700 dark:text-gray-300 font-semibold cursor-pointer hover:text-gray-900 dark:hover:text-white active:text-blue-600 dark:active:text-blue-400 transition-colors duration-150 flex-1 min-w-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                hapticFeedback.selection();
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

          {/* ========== VIDEOS SECTION WITH TEXT FIXES ========== */}
          <section className="px-3 py-4 pb-20 lg:px-6 lg:pb-8">
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
                    <div key={video._id} className="block group w-full">
                      {/* Video Thumbnail */}
                      <Link href={`/watch/${video._id}`} className="block mb-3">
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 lg:rounded-xl shadow-sm">
                          {getThumbnailUrl(video).includes("supabase.co") ? (
                            <img
                              src={getThumbnailUrl(video)}
                              alt={video?.videotitle || "Video thumbnail"}
                              className="w-full h-full object-cover lg:group-hover:scale-105 lg:transition-transform lg:duration-200"
                              loading="lazy"
                              onError={(e) => {
                                const target =
                                  e.currentTarget as HTMLImageElement;
                                const currentVideo = video;
                                console.error(
                                  "❌ Thumbnail failed, trying video element"
                                );
                                target.style.display = "none";
                                const parent = target.parentElement;
                                if (parent && !parent.querySelector("video")) {
                                  const videoElement =
                                    document.createElement("video");
                                  videoElement.src =
                                    getThumbnailUrl(currentVideo);
                                  videoElement.className =
                                    "w-full h-full object-cover";
                                  videoElement.preload = "metadata";
                                  videoElement.muted = true;
                                  videoElement.playsInline = true;
                                  parent.appendChild(videoElement);
                                }
                              }}
                            />
                          ) : (
                            <video
                              src={getVideoUrl(video)}
                              className="w-full h-full object-cover lg:group-hover:scale-105 lg:transition-transform lg:duration-200"
                              preload="metadata"
                              poster={getThumbnailUrl(video)}
                              muted
                              playsInline
                            />
                          )}
                          {video?.duration && (
                            <div className="absolute bottom-1.5 right-1.5 bg-black/90 text-white text-[11px] font-bold px-1.5 py-0.5 rounded lg:px-2">
                              {video.duration}
                            </div>
                          )}
                        </div>
                      </Link>

                      {/* FIX: Video Info Container - Proper flex with min-w-0 */}
                      <div className="video-info-container flex gap-2.5 w-full min-w-0 overflow-hidden">
                        {/* Avatar */}
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(
                              `/channel/${video.uploadedBy?._id || "unknown"}`
                            );
                          }}
                          className="flex-shrink-0 cursor-pointer"
                        >
                          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-transparent hover:ring-blue-500 transition-all">
                            <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                              {channelInitial}
                            </div>
                            <img
                              key={`video-avatar-${video._id}-${
                                imageKeys[video.uploadedBy?._id || ""] ||
                                Date.now()
                              }`}
                              src={getImageUrl(video.uploadedBy?.image, true)}
                              alt={channelName}
                              className="absolute inset-0 w-full h-full object-cover"
                              crossOrigin="anonymous"
                              loading="eager"
                              onError={(e) => {
                                const target =
                                  e.currentTarget as HTMLImageElement;
                                target.style.opacity = "0";
                                target.style.zIndex = "1";
                              }}
                              onLoad={(e) => {
                                const target =
                                  e.currentTarget as HTMLImageElement;
                                target.style.opacity = "1";
                                target.style.zIndex = "10";
                              }}
                            />
                          </div>
                        </div>

                        {/* FIX: Text Content - Critical min-w-0 for flex shrinking */}
                        <div className="video-text-content flex-1 min-w-0 overflow-hidden">
      {/* Video Title */}
<Link href={`/watch/${video._id}`}>
  <h3
    className="video-title text-gray-900 dark:text-white"
    title={video?.videotitle || "Untitled Video"}
  >
    {video?.videotitle || "Untitled Video"}
  </h3>
</Link>


                          <p
                            onClick={(e) => {
                              e.preventDefault();
                              router.push(
                                `/channel/${video.uploadedBy?._id || "unknown"}`
                              );
                            }}
                            className="video-channel-name text-gray-600 dark:text-gray-400 mb-0.5 font-medium hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer w-full overflow-hidden"
                            title={channelName}
                          >
                            {channelName}
                          </p>

                          <div className="video-metadata text-[11px] text-gray-500 dark:text-gray-500 lg:text-xs font-medium w-full overflow-hidden">
                            <span className="font-semibold whitespace-nowrap">
                              {formatViews(video?.views)}
                            </span>
                            <span className="font-bold mx-1.5">•</span>
                            <span className="whitespace-nowrap">
                              {formatTimeAgo(video?.createdAt)}
                            </span>
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
        </div>

      {/* FIX: PREMIUM TEXT DISPLAY STYLING */}
<style jsx>{`
  /* Scrollbar hiding */
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* Skeleton loading animation */
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

  /* ===== SHORTS TITLE - PREMIUM STYLE ===== */
  .shorts-title {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
    overflow-wrap: break-word;

    /* Premium Typography */
    font-size: 13px;
    font-weight: 600;
    line-height: 1.45;
    letter-spacing: -0.01em;
    
    /* Spacing */
    margin: 0 0 8px 0;
    padding: 0;

    /* Size */
    width: 100%;
    min-width: 0;
    max-width: 100%;

    /* Light theme */
    color: #0f0f0f;
    
    /* Smooth rendering */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    
    /* Subtle transition */
    transition: color 0.2s ease;
  }

  .dark .shorts-title {
    color: #f1f1f1;
  }

  /* ===== SHORTS CHANNEL NAME - PREMIUM STYLE ===== */
  .shorts-channel-name {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    /* Premium Typography */
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
    letter-spacing: 0.01em;

    /* Size */
    max-width: 100%;
    min-width: 0;
    width: 100%;

    /* Light theme */
    color: #606060;
    
    /* Smooth rendering */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    
    /* Transition */
    transition: color 0.2s ease;
  }

  .dark .shorts-channel-name {
    color: #aaaaaa;
  }

  .shorts-channel-name:hover {
    color: #0f0f0f;
  }

  .dark .shorts-channel-name:hover {
    color: #ffffff;
  }

  /* ===== VIDEO TITLE - PREMIUM STYLE ===== */
  .video-title {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
    overflow-wrap: break-word;

    /* Premium Typography */
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    letter-spacing: -0.015em;

    /* Spacing */
    margin: 0 0 6px 0;
    padding: 0;

    /* Size */
    width: 100%;
    min-width: 0;
    max-width: 100%;

    /* Light theme */
    color: #0f0f0f;
    
    /* Smooth rendering */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    
    /* Transition */
    transition: color 0.15s ease;
  }

  .dark .video-title {
    color: #f1f1f1;
  }

  /* ===== VIDEO CHANNEL NAME - PREMIUM STYLE ===== */
  .video-channel-name {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    /* Premium Typography */
    font-size: 12px;
    font-weight: 500;
    line-height: 1.35;
    letter-spacing: 0.01em;

    /* Size */
    max-width: 100%;
    min-width: 0;
    width: 100%;

    /* Spacing */
    margin: 0 0 2px 0;
    padding: 0;

    /* Light theme */
    color: #606060;
    
    /* Smooth rendering */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    
    /* Transition */
    transition: color 0.15s ease;
  }

  .dark .video-channel-name {
    color: #aaaaaa;
  }

  .video-channel-name:hover {
    color: #0f0f0f;
  }

  .dark .video-channel-name:hover {
    color: #ffffff;
  }

  /* ===== VIDEO METADATA - PREMIUM STYLE ===== */
  .video-metadata {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0;

    /* Premium Typography */
    font-size: 12px;
    font-weight: 400;
    line-height: 1.35;
    letter-spacing: 0.01em;

    /* Size */
    width: 100%;
    min-width: 0;
    overflow: visible;

    /* Spacing */
    margin: 0;
    padding: 0;

    /* Light theme */
    color: #606060;
    
    /* Smooth rendering */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .dark .video-metadata {
    color: #aaaaaa;
  }

  .video-metadata span {
    white-space: nowrap;
    flex-shrink: 0;
  }

  .video-metadata span:first-child {
    font-weight: 400;
  }

  /* Dot separator */
  .video-metadata span:nth-child(2) {
    margin: 0 4px;
    font-size: 4px;
    opacity: 0.8;
  }

  /* ===== CONTAINER FIXES ===== */
  .video-info-container {
    display: flex;
    gap: 12px;
    width: 100%;
    min-width: 0;
    overflow: visible;
    align-items: flex-start;
  }

  .video-text-content {
    flex: 1;
    min-width: 0;
    overflow: visible;
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 2px;
  }

  /* ===== MOBILE RESPONSIVE (<640px) ===== */
  @media (max-width: 639px) {
    .shorts-title {
      font-size: 13px !important;
      font-weight: 600 !important;
      line-height: 1.4 !important;
      letter-spacing: -0.01em !important;
      -webkit-line-clamp: 2 !important;
      margin-bottom: 6px !important;
    }

    .shorts-channel-name {
      font-size: 11px !important;
      font-weight: 500 !important;
      letter-spacing: 0.01em !important;
    }

    .video-title {
      font-size: 14px !important;
      font-weight: 600 !important;
      line-height: 1.35 !important;
      letter-spacing: -0.01em !important;
      -webkit-line-clamp: 2 !important;
      margin-bottom: 4px !important;
    }

    .video-channel-name {
      font-size: 12px !important;
      font-weight: 500 !important;
      margin-bottom: 1px !important;
    }

    .video-metadata {
      font-size: 12px !important;
      font-weight: 400 !important;
    }

    .video-info-container {
      gap: 10px !important;
    }
  }

  /* ===== TABLET RESPONSIVE (640px - 1023px) ===== */
  @media (min-width: 640px) and (max-width: 1023px) {
    .shorts-title {
      font-size: 13px;
      line-height: 1.45;
    }

    .shorts-channel-name {
      font-size: 12px;
    }

    .video-title {
      font-size: 14px;
      line-height: 1.4;
    }

    .video-channel-name {
      font-size: 12px;
    }

    .video-metadata {
      font-size: 12px;
    }
  }

  /* ===== DESKTOP RESPONSIVE (>=1024px) ===== */
  @media (min-width: 1024px) {
    .shorts-title {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.45;
      letter-spacing: -0.015em;
      margin-bottom: 8px;
    }

    .shorts-channel-name {
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.01em;
    }

    .video-title {
      font-size: 14px;
      font-weight: 600;
      line-height: 1.4;
      letter-spacing: -0.015em;
      margin-bottom: 6px;
    }

    .video-channel-name {
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 2px;
    }

    .video-metadata {
      font-size: 12px;
      font-weight: 400;
    }

    .video-info-container {
      gap: 12px;
    }
  }

  /* ===== LARGE DESKTOP (>=1280px) ===== */
  @media (min-width: 1280px) {
    .shorts-title {
      font-size: 14px;
    }

    .video-title {
      font-size: 14px;
    }

    .video-channel-name {
      font-size: 12px;
    }

    .video-metadata {
      font-size: 12px;
    }
  }

  /* ===== HOVER STATES (Desktop with mouse) ===== */
  @media (hover: hover) and (pointer: fine) {
    .shorts-title:hover,
    .video-title:hover {
      color: #065fd4;
    }

    .dark .shorts-title:hover,
    .dark .video-title:hover {
      color: #3ea6ff;
    }
  }

  /* ===== ACTIVE STATES (Touch devices) ===== */
  @media (hover: none) {
    .shorts-title:active,
    .video-title:active {
      color: #065fd4;
    }

    .dark .shorts-title:active,
    .dark .video-title:active {
      color: #3ea6ff;
    }

    .shorts-channel-name:active,
    .video-channel-name:active {
      color: #0f0f0f;
    }

    .dark .shorts-channel-name:active,
    .dark .video-channel-name:active {
      color: #ffffff;
    }
  }

  /* ===== FOCUS VISIBLE (Accessibility) ===== */
  .shorts-title:focus-visible,
  .video-title:focus-visible,
  .shorts-channel-name:focus-visible,
  .video-channel-name:focus-visible {
    outline: 2px solid #065fd4;
    outline-offset: 2px;
    border-radius: 2px;
  }

  .dark .shorts-title:focus-visible,
  .dark .video-title:focus-visible,
  .dark .shorts-channel-name:focus-visible,
  .dark .video-channel-name:focus-visible {
    outline-color: #3ea6ff;
  }

  /* ===== PERFORMANCE OPTIMIZATION ===== */
  .shorts-title,
  .video-title,
  .shorts-channel-name,
  .video-channel-name,
  .video-metadata {
    will-change: color;
    contain: layout style;
  }

  /* ===== SELECTION STYLING ===== */
  .shorts-title::selection,
  .video-title::selection,
  .shorts-channel-name::selection,
  .video-channel-name::selection,
  .video-metadata::selection {
    background-color: #065fd4;
    color: #ffffff;
  }

  .dark .shorts-title::selection,
  .dark .video-title::selection,
  .dark .shorts-channel-name::selection,
  .dark .video-channel-name::selection,
  .dark .video-metadata::selection {
    background-color: #3ea6ff;
    color: #0f0f0f;
  }
`}</style>

      </>
    </ProtectedRoute>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {},
  };
};

export default Home;
