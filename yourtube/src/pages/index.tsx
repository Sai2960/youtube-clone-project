/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/index.tsx - PREMIUM LUXURIOUS DESIGN VERSION

import { NextPage } from "next";
import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Play,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  TrendingUp,
  Clock,
  Eye,
} from "lucide-react";
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

// Premium Loading Spinner Component
const PremiumSpinner = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={`premium-spinner ${sizeClasses[size]}`}>
      <div className="spinner-ring"></div>
      <div className="spinner-ring"></div>
      <div className="spinner-ring"></div>
    </div>
  );
};

// Premium Skeleton Component
const PremiumSkeleton = ({
  className = "",
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) => <div className={`premium-skeleton ${className}`} style={style} />;

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

  // New state for premium effects
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Track scroll for parallax effects
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollTop / docHeight : 0;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Page load animation
  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const bgColor = isDark ? "#0a0a0a" : "#fafafa";

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
      (new Date().getTime() - new Date(date).getTime()) / 1000,
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
          /https:\/\/res\.cloudinary\.com\/([^/]+)\/video\/upload\/(.+)/,
        );

        if (match) {
          const cloudName = match[1];
          let publicId = match[2];

          publicId = publicId
            .split("/")
            .filter(
              (segment) =>
                !segment.match(/^(f_|vc_|ac_|af_|br_|q_|w_|h_|c_|so_|t_)/),
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
    new Set(),
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
    index: number,
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
          <title>YourTube - Premium Video Experience</title>
          <meta
            name="description"
            content="Experience premium video streaming with YourTube"
          />
        </Head>

        {/* Premium Connection Error Banner */}
        {connectionError && (
          <div className="premium-banner fixed top-0 left-0 right-0 z-50 px-4 py-4 text-center">
            <div className="premium-banner-content max-w-lg mx-auto">
              <div className="flex items-center justify-center gap-3">
                <PremiumSpinner size="sm" />
                <span className="font-medium text-white">
                  {connectionError}
                </span>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="premium-retry-btn mt-3"
              >
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        )}

        {/* Premium Loading Screen */}
        {!backendReady && !connectionError && (
          <div className="premium-loading-screen fixed inset-0 z-40 flex flex-col items-center justify-center">
            <div className="premium-loading-content text-center px-6">
              <div className="premium-logo-container mb-8">
                <div className="premium-logo">
                  <svg viewBox="0 0 90 20" className="w-32 h-8">
                    <text x="0" y="16" className="premium-logo-text">
                      YourTube
                    </text>
                  </svg>
                </div>
                <div className="premium-logo-glow"></div>
              </div>

              <PremiumSpinner size="lg" />

              <h2 className="premium-loading-title mt-8 text-2xl font-bold">
                {backendCheckAttempts > 0
                  ? `Initializing... (${backendCheckAttempts}/5)`
                  : "Connecting to Server"}
              </h2>
              <p className="premium-loading-subtitle mt-3 text-sm max-w-sm mx-auto">
                Preparing your premium streaming experience
              </p>

              <div className="premium-progress-bar mt-6">
                <div
                  className="premium-progress-fill"
                  style={{
                    width: `${Math.min(backendCheckAttempts * 20, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Container */}
        <div
          ref={containerRef}
          className={`premium-container w-full min-h-screen pb-16 lg:pb-0 ${isPageLoaded ? "page-loaded" : ""}`}
        >
          {/* Ambient Background Effects */}
          <div className="premium-ambient-bg" aria-hidden="true">
            <div className="ambient-orb ambient-orb-1"></div>
            <div className="ambient-orb ambient-orb-2"></div>
            <div className="ambient-orb ambient-orb-3"></div>
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="lg:hidden fixed top-2 right-2 z-50 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg font-medium">
              Shorts: {shorts.length} | Loading: {loadingShorts ? "Y" : "N"}
            </div>
          )}

          {/* Pull to Refresh Indicator */}
          {pullDistance > 0 && (
            <div
              className="premium-pull-indicator fixed top-0 left-0 right-0 flex justify-center items-center z-50"
              style={{ height: `${pullDistance}px` }}
            >
              <div className="premium-refresh-icon">
                {refreshing ? (
                  <PremiumSpinner size="sm" />
                ) : (
                  <svg
                    className="w-6 h-6 transition-transform duration-300"
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

          {/* ========== PREMIUM SHORTS SECTION ========== */}
          {shorts.length > 0 && (
            <section className="premium-shorts-section relative py-6 lg:py-8">
              {/* Section Background Accent */}
              <div
                className="absolute inset-0 premium-section-bg"
                aria-hidden="true"
              ></div>

              {/* Header */}
              <div className="relative flex items-center justify-between px-4 mb-5 lg:px-6">
                <div className="flex items-center gap-3">
                  <div className="premium-shorts-icon">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <path d="M10 14.65v-5.3L15 12l-5 2.65zm7.77-4.33c-.77-.32-1.2-.5-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="premium-section-title text-xl font-bold lg:text-2xl">
                      Shorts
                    </h2>
                    <p className="premium-section-subtitle text-xs mt-0.5 hidden sm:block">
                      Quick entertainment, endless fun
                    </p>
                  </div>
                </div>

                {/* See All Link */}
                <Link
                  href="/shorts"
                  className="premium-see-all group flex items-center gap-1.5 text-sm font-medium"
                >
                  <span>See all</span>
                  <ChevronRight
                    size={16}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </div>

              {loadingShorts ? (
                <div className="overflow-x-hidden px-4 lg:px-6 flex gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0"
                      style={{ minWidth: "180px", width: "180px" }}
                    >
                      <PremiumSkeleton
                        className="w-full rounded-2xl mb-3"
                        style={{ paddingBottom: "177.5%" }}
                      />
                      <PremiumSkeleton className="h-4 rounded-lg mb-2" />
                      <PremiumSkeleton className="h-3 rounded-lg w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative group/container">
                  {/* Navigation Buttons */}
                  <button
                    onClick={() => scrollShorts("left")}
                    className="premium-scroll-btn premium-scroll-btn-left hidden lg:flex"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  <button
                    onClick={() => scrollShorts("right")}
                    className="premium-scroll-btn premium-scroll-btn-right hidden lg:flex"
                    aria-label="Scroll right"
                  >
                    <ChevronRight size={20} />
                  </button>

                  {/* Shorts Container */}
                  <div
                    ref={shortsScrollRef}
                    className="premium-shorts-scroll overflow-x-scroll scrollbar-hide"
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
                            if (
                              !(e.target as HTMLElement).closest(".no-click")
                            ) {
                              handleShortClick(e, short._id, index);
                            }
                          }}
                          className="premium-short-card group/short"
                          style={{
                            animationDelay: `${index * 50}ms`,
                          }}
                        >
                          {/* Thumbnail Card */}
                          <div className="premium-short-thumbnail">
                            <img
                              src={short.thumbnailUrl}
                              alt={short.title}
                              className="absolute inset-0 w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                const target =
                                  e.currentTarget as HTMLImageElement;
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
                            />

                            {/* Gradient Overlay */}
                            <div className="premium-short-overlay" />

                            {/* Play Icon */}
                            <div className="premium-play-overlay">
                              <div className="premium-play-button">
                                <Play size={24} fill="currentColor" />
                              </div>
                            </div>

                            {/* Views Badge */}
                            <div className="premium-views-badge">
                              <Eye size={12} />
                              <span>{formatViewsShort(short.views)}</span>
                            </div>

                            {/* Shine Effect */}
                            <div className="premium-shine-effect" />
                          </div>

                          {/* Short Info */}
                          <div className="premium-short-info">
                            <p
                              className="premium-short-title"
                              title={short.title}
                            >
                              {short.title}
                            </p>

                            <div className="premium-short-channel no-click">
                              <div
                                className="premium-channel-avatar"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  hapticFeedback.selection();
                                  router.push(`/channel/${short.userId?._id}`);
                                }}
                              >
                                <img
                                  src={getImageUrl(
                                    short.userId?.image || short.userId?.avatar,
                                    true,
                                  )}
                                  alt={shortChannelName}
                                  onError={(e) => {
                                    e.currentTarget.src =
                                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';
                                  }}
                                />
                              </div>
                              <span
                                className="premium-channel-name"
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section Divider */}
              <div className="premium-section-divider mx-4 lg:mx-6 mt-6" />
            </section>
          )}

          {/* ========== PREMIUM VIDEOS SECTION ========== */}
          <section className="premium-videos-section px-4 py-6 pb-24 lg:px-6 lg:pb-10">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="premium-videos-icon">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h2 className="premium-section-title text-xl font-bold lg:text-2xl">
                    Recommended
                  </h2>
                  <p className="premium-section-subtitle text-xs mt-0.5 hidden sm:block">
                    Handpicked content just for you
                  </p>
                </div>
              </div>
            </div>

            {loadingVideos ? (
              <div className="premium-video-grid">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="premium-video-skeleton">
                    <PremiumSkeleton className="w-full aspect-video rounded-xl mb-3" />
                    <div className="flex gap-3">
                      <PremiumSkeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <PremiumSkeleton className="h-4 rounded-lg" />
                        <PremiumSkeleton className="h-3 rounded-lg w-3/4" />
                        <PremiumSkeleton className="h-3 rounded-lg w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : videos.length > 0 ? (
              <div className="premium-video-grid">
                {videos.slice(0, 12).map((video, index) => {
                  const channelName =
                    video.uploadedBy?.channelname ||
                    video.uploadedBy?.name ||
                    video?.videochanel ||
                    "Unknown Channel";
                  const channelInitial = channelName[0]?.toUpperCase() || "U";

                  return (
                    <div
                      key={video._id}
                      className="premium-video-card group"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onMouseEnter={() => setHoveredVideoId(video._id)}
                      onMouseLeave={() => setHoveredVideoId(null)}
                    >
                      {/* Video Thumbnail */}
                      <Link href={`/watch/${video._id}`} className="block mb-3">
                        <div className="premium-video-thumbnail">
                          {getThumbnailUrl(video).includes("supabase.co") ? (
                            <img
                              src={getThumbnailUrl(video)}
                              alt={video?.videotitle || "Video thumbnail"}
                              className="absolute inset-0 w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                const target =
                                  e.currentTarget as HTMLImageElement;
                                target.style.display = "none";
                                const parent = target.parentElement;
                                if (parent && !parent.querySelector("video")) {
                                  const videoElement =
                                    document.createElement("video");
                                  videoElement.src = getThumbnailUrl(video);
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
                              className="absolute inset-0 w-full h-full object-cover"
                              preload="metadata"
                              poster={getThumbnailUrl(video)}
                              muted
                              playsInline
                            />
                          )}

                          {/* Hover Overlay */}
                          <div className="premium-video-hover-overlay">
                            <div className="premium-video-play-btn">
                              <Play size={32} fill="currentColor" />
                            </div>
                          </div>

                          {/* Duration Badge */}
                          {video?.duration && (
                            <div className="premium-duration-badge">
                              <Clock size={10} />
                              <span>{video.duration}</span>
                            </div>
                          )}

                          {/* Shine Effect */}
                          <div className="premium-video-shine" />
                        </div>
                      </Link>

                      {/* Video Info */}
                      <div className="premium-video-info flex gap-3">
                        {/* Channel Avatar */}
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(
                              `/channel/${video.uploadedBy?._id || "unknown"}`,
                            );
                          }}
                          className="premium-video-avatar flex-shrink-0 cursor-pointer"
                        >
                          <div className="premium-avatar-ring">
                            <div className="premium-avatar-gradient">
                              <span>{channelInitial}</span>
                            </div>
                            <img
                              key={`video-avatar-${video._id}-${imageKeys[video.uploadedBy?._id || ""] || Date.now()}`}
                              src={getImageUrl(video.uploadedBy?.image, true)}
                              alt={channelName}
                              crossOrigin="anonymous"
                              loading="eager"
                              onError={(e) => {
                                const target =
                                  e.currentTarget as HTMLImageElement;
                                target.style.opacity = "0";
                              }}
                              onLoad={(e) => {
                                const target =
                                  e.currentTarget as HTMLImageElement;
                                target.style.opacity = "1";
                              }}
                            />
                          </div>
                        </div>

                        {/* Text Content */}
                        <div className="premium-video-text flex-1 min-w-0">
                          <Link href={`/watch/${video._id}`}>
                            <h3
                              className="premium-video-title"
                              title={video?.videotitle || "Untitled Video"}
                            >
                              {video?.videotitle || "Untitled Video"}
                            </h3>
                          </Link>

                          <p
                            onClick={(e) => {
                              e.preventDefault();
                              router.push(
                                `/channel/${video.uploadedBy?._id || "unknown"}`,
                              );
                            }}
                            className="premium-video-channel"
                            title={channelName}
                          >
                            {channelName}
                          </p>

                          <div className="premium-video-meta">
                            <span className="flex items-center gap-1">
                              <Eye size={12} />
                              {formatViews(video?.views)}
                            </span>
                            <span className="premium-meta-dot">•</span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
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
              <div className="premium-empty-state">
                <div className="premium-empty-icon">
                  <Play size={48} />
                </div>
                <h3 className="premium-empty-title">No videos available</h3>
                <p className="premium-empty-subtitle">
                  Check back later for new content
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Premium Styles */}
        <style jsx>{`
          /* ===== ROOT VARIABLES ===== */
          :root {
            --premium-primary: #ff0844;
            --premium-secondary: #ffb199;
            --premium-accent: #7928ca;
            --premium-gold: #f5a623;
            --premium-gradient: linear-gradient(
              135deg,
              #ff0844 0%,
              #ffb199 100%
            );
            --premium-gradient-accent: linear-gradient(
              135deg,
              #7928ca 0%,
              #ff0080 100%
            );
            --premium-shadow: 0 4px 20px rgba(255, 8, 68, 0.15);
            --premium-shadow-hover: 0 8px 40px rgba(255, 8, 68, 0.25);
            --glass-bg: rgba(255, 255, 255, 0.8);
            --glass-border: rgba(255, 255, 255, 0.3);
          }

          .dark {
            --glass-bg: rgba(20, 20, 20, 0.8);
            --glass-border: rgba(255, 255, 255, 0.1);
          }

          /* ===== PAGE TRANSITIONS ===== */
          .premium-container {
            opacity: 0;
            transform: translateY(10px);
            transition:
              opacity 0.6s ease-out,
              transform 0.6s ease-out;
            position: relative;
            background: linear-gradient(
              180deg,
              var(--bg-primary, #fafafa) 0%,
              var(--bg-secondary, #f5f5f5) 100%
            );
          }

          .dark .premium-container {
            background: linear-gradient(180deg, #0a0a0a 0%, #111111 100%);
          }

          .premium-container.page-loaded {
            opacity: 1;
            transform: translateY(0);
          }

          /* ===== AMBIENT BACKGROUND ===== */
          .premium-ambient-bg {
            position: fixed;
            inset: 0;
            pointer-events: none;
            overflow: hidden;
            z-index: 0;
          }

          .ambient-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.3;
            animation: float 20s ease-in-out infinite;
          }

          .ambient-orb-1 {
            width: 400px;
            height: 400px;
            background: var(--premium-primary);
            top: -200px;
            right: -100px;
            animation-delay: 0s;
          }

          .ambient-orb-2 {
            width: 300px;
            height: 300px;
            background: var(--premium-accent);
            bottom: 20%;
            left: -150px;
            animation-delay: -7s;
          }

          .ambient-orb-3 {
            width: 250px;
            height: 250px;
            background: var(--premium-gold);
            top: 50%;
            right: -100px;
            animation-delay: -14s;
          }

          .dark .ambient-orb {
            opacity: 0.15;
          }

          @keyframes float {
            0%,
            100% {
              transform: translate(0, 0) scale(1);
            }
            25% {
              transform: translate(20px, -20px) scale(1.05);
            }
            50% {
              transform: translate(-10px, 20px) scale(0.95);
            }
            75% {
              transform: translate(-20px, -10px) scale(1.02);
            }
          }

          /* ===== PREMIUM SPINNER ===== */
          .premium-spinner {
            position: relative;
          }

          .premium-spinner .spinner-ring {
            position: absolute;
            inset: 0;
            border: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1.2s linear infinite;
          }

          .premium-spinner .spinner-ring:nth-child(1) {
            border-top-color: var(--premium-primary);
            animation-delay: 0s;
          }

          .premium-spinner .spinner-ring:nth-child(2) {
            inset: 3px;
            border-right-color: var(--premium-accent);
            animation-delay: 0.15s;
            animation-direction: reverse;
          }

          .premium-spinner .spinner-ring:nth-child(3) {
            inset: 6px;
            border-bottom-color: var(--premium-gold);
            animation-delay: 0.3s;
          }

          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          /* ===== PREMIUM SKELETON ===== */
          .premium-skeleton {
            background: linear-gradient(
              90deg,
              rgba(200, 200, 200, 0.2) 0%,
              rgba(200, 200, 200, 0.4) 50%,
              rgba(200, 200, 200, 0.2) 100%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s ease-in-out infinite;
            border-radius: 8px;
          }

          .dark .premium-skeleton {
            background: linear-gradient(
              90deg,
              rgba(60, 60, 60, 0.3) 0%,
              rgba(80, 80, 80, 0.5) 50%,
              rgba(60, 60, 60, 0.3) 100%
            );
            background-size: 200% 100%;
          }

          @keyframes shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }

          /* ===== PREMIUM BANNER ===== */
          .premium-banner {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            backdrop-filter: blur(10px);
          }

          .premium-retry-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1.25rem;
            background: rgba(255, 255, 255, 0.95);
            color: #d97706;
            font-weight: 600;
            font-size: 0.75rem;
            border-radius: 9999px;
            transition: all 0.2s ease;
            border: none;
            cursor: pointer;
          }

          .premium-retry-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
          }

          /* ===== PREMIUM LOADING SCREEN ===== */
          .premium-loading-screen {
            background: linear-gradient(180deg, #fafafa 0%, #f0f0f0 100%);
          }

          .dark .premium-loading-screen {
            background: linear-gradient(180deg, #0a0a0a 0%, #111111 100%);
          }

          .premium-logo-container {
            position: relative;
            display: inline-block;
          }

          .premium-logo {
            position: relative;
            z-index: 1;
          }

          .premium-logo-text {
            font-family:
              "Inter",
              system-ui,
              -apple-system,
              sans-serif;
            font-weight: 800;
            font-size: 20px;
            fill: var(--premium-primary);
          }

          .premium-logo-glow {
            position: absolute;
            inset: -20px;
            background: var(--premium-gradient);
            filter: blur(40px);
            opacity: 0.4;
            animation: pulse-glow 2s ease-in-out infinite;
          }

          @keyframes pulse-glow {
            0%,
            100% {
              opacity: 0.4;
              transform: scale(1);
            }
            50% {
              opacity: 0.6;
              transform: scale(1.1);
            }
          }

          .premium-loading-title {
            color: #1a1a1a;
            letter-spacing: -0.02em;
          }

          .dark .premium-loading-title {
            color: #ffffff;
          }

          .premium-loading-subtitle {
            color: #666666;
          }

          .dark .premium-loading-subtitle {
            color: #888888;
          }

          .premium-progress-bar {
            width: 200px;
            height: 3px;
            background: rgba(0, 0, 0, 0.1);
            border-radius: 9999px;
            overflow: hidden;
            margin: 0 auto;
          }

          .dark .premium-progress-bar {
            background: rgba(255, 255, 255, 0.1);
          }

          .premium-progress-fill {
            height: 100%;
            background: var(--premium-gradient);
            border-radius: 9999px;
            transition: width 0.5s ease;
          }

          /* ===== PREMIUM PULL INDICATOR ===== */
          .premium-pull-indicator {
            background: linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.9) 0%,
              transparent 100%
            );
          }

          .dark .premium-pull-indicator {
            background: linear-gradient(
              180deg,
              rgba(20, 20, 20, 0.9) 0%,
              transparent 100%
            );
          }

          .premium-refresh-icon {
            background: var(--glass-bg);
            backdrop-filter: blur(10px);
            border: 1px solid var(--glass-border);
            border-radius: 9999px;
            padding: 0.75rem;
            color: var(--premium-primary);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          }

          /* ===== PREMIUM SHORTS SECTION ===== */
          .premium-shorts-section {
            position: relative;
            z-index: 1;
          }

          .premium-section-bg {
            background: linear-gradient(
              180deg,
              rgba(255, 8, 68, 0.02) 0%,
              transparent 100%
            );
          }

          .dark .premium-section-bg {
            background: linear-gradient(
              180deg,
              rgba(255, 8, 68, 0.05) 0%,
              transparent 100%
            );
          }

          .premium-shorts-icon {
            width: 40px;
            height: 40px;
            background: var(--premium-gradient);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            box-shadow: 0 4px 15px rgba(255, 8, 68, 0.3);
          }

          .premium-section-title {
            color: #1a1a1a;
            letter-spacing: -0.02em;
          }

          .dark .premium-section-title {
            color: #ffffff;
          }

          .premium-section-subtitle {
            color: #888888;
          }

          .dark .premium-section-subtitle {
            color: #666666;
          }

          .premium-see-all {
            color: var(--premium-primary);
            transition: all 0.2s ease;
          }

          .premium-see-all:hover {
            opacity: 0.8;
          }

          .premium-section-divider {
            height: 1px;
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(0, 0, 0, 0.08) 50%,
              transparent 100%
            );
          }

          .dark .premium-section-divider {
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.08) 50%,
              transparent 100%
            );
          }

          /* ===== PREMIUM SCROLL BUTTONS ===== */
          .premium-scroll-btn {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            z-index: 10;
            width: 44px;
            height: 44px;
            background: var(--glass-bg);
            backdrop-filter: blur(10px);
            border: 1px solid var(--glass-border);
            border-radius: 9999px;
            align-items: center;
            justify-content: center;
            color: #1a1a1a;
            opacity: 0;
            transition: all 0.3s ease;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          }

          .dark .premium-scroll-btn {
            color: #ffffff;
          }

          .premium-scroll-btn:hover {
            background: var(--premium-gradient);
            color: white;
            border-color: transparent;
            transform: translateY(-50%) scale(1.05);
          }

          .premium-scroll-btn-left {
            left: 8px;
          }
          .premium-scroll-btn-right {
            right: 8px;
          }

          .group\/container:hover .premium-scroll-btn {
            opacity: 1;
          }

          /* ===== PREMIUM SHORTS SCROLL ===== */
          .premium-shorts-scroll {
            display: flex;
            gap: 16px;
            padding: 0 16px;
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
          }

          .premium-shorts-scroll::-webkit-scrollbar {
            display: none;
          }

          /* ===== PREMIUM SHORT CARD ===== */
          .premium-short-card {
            flex-shrink: 0;
            width: 180px;
            min-width: 180px;
            cursor: pointer;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            animation: fadeInUp 0.5s ease forwards;
            opacity: 0;
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .premium-short-thumbnail {
            position: relative;
            width: 100%;
            padding-bottom: 177.5%;
            border-radius: 16px;
            overflow: hidden;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .premium-short-card:hover .premium-short-thumbnail {
            transform: scale(0.98);
            box-shadow: 0 8px 40px rgba(255, 8, 68, 0.2);
          }

          .premium-short-card:active .premium-short-thumbnail {
            transform: scale(0.95);
          }

          .premium-short-thumbnail img {
            transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .premium-short-card:hover .premium-short-thumbnail img {
            transform: scale(1.08);
          }

          .premium-short-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              180deg,
              transparent 0%,
              transparent 50%,
              rgba(0, 0, 0, 0.7) 100%
            );
            pointer-events: none;
          }

          .premium-play-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.3);
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .premium-short-card:hover .premium-play-overlay {
            opacity: 1;
          }

          .premium-play-button {
            width: 56px;
            height: 56px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 9999px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1a1a1a;
            transform: scale(0.8);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          }

          .premium-short-card:hover .premium-play-button {
            transform: scale(1);
          }

          .premium-views-badge {
            position: absolute;
            bottom: 12px;
            left: 12px;
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            border-radius: 8px;
            color: white;
            font-size: 11px;
            font-weight: 600;
          }

          .premium-shine-effect {
            position: absolute;
            top: 0;
            left: -100%;
            width: 50%;
            height: 100%;
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.2) 50%,
              transparent 100%
            );
            transform: skewX(-25deg);
            transition: left 0.6s ease;
            pointer-events: none;
          }

          .premium-short-card:hover .premium-shine-effect {
            left: 150%;
          }

          /* ===== PREMIUM SHORT INFO ===== */
          .premium-short-info {
            margin-top: 12px;
          }

          .premium-short-title {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            font-size: 13px;
            font-weight: 600;
            line-height: 1.4;
            color: #1a1a1a;
            margin-bottom: 8px;
            transition: color 0.2s ease;
          }

          .dark .premium-short-title {
            color: #f1f1f1;
          }

          .premium-short-card:hover .premium-short-title {
            color: var(--premium-primary);
          }

          .premium-short-channel {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .premium-channel-avatar {
            width: 24px;
            height: 24px;
            border-radius: 9999px;
            overflow: hidden;
            flex-shrink: 0;
            border: 2px solid transparent;
            background:
              linear-gradient(white, white) padding-box,
              var(--premium-gradient) border-box;
            transition: transform 0.2s ease;
          }

          .dark .premium-channel-avatar {
            background:
              linear-gradient(#1a1a1a, #1a1a1a) padding-box,
              var(--premium-gradient) border-box;
          }

          .premium-channel-avatar:hover {
            transform: scale(1.1);
          }

          .premium-channel-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .premium-channel-name {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 12px;
            font-weight: 500;
            color: #666666;
            transition: color 0.2s ease;
            cursor: pointer;
          }

          .dark .premium-channel-name {
            color: #aaaaaa;
          }

          .premium-channel-name:hover {
            color: #1a1a1a;
          }

          .dark .premium-channel-name:hover {
            color: #ffffff;
          }

          /* ===== PREMIUM VIDEOS SECTION ===== */
          .premium-videos-section {
            position: relative;
            z-index: 1;
          }

          .premium-videos-icon {
            width: 40px;
            height: 40px;
            background: var(--premium-gradient-accent);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            box-shadow: 0 4px 15px rgba(121, 40, 202, 0.3);
          }

          /* ===== PREMIUM VIDEO GRID ===== */
          .premium-video-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 24px;
          }

          @media (min-width: 640px) {
            .premium-video-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          @media (min-width: 1024px) {
            .premium-video-grid {
              grid-template-columns: repeat(3, 1fr);
              gap: 24px;
            }
          }

          @media (min-width: 1280px) {
            .premium-video-grid {
              grid-template-columns: repeat(4, 1fr);
            }
          }

          /* ===== PREMIUM VIDEO CARD ===== */
          .premium-video-card {
            animation: fadeInUp 0.5s ease forwards;
            opacity: 0;
          }

          .premium-video-thumbnail {
            position: relative;
            width: 100%;
            padding-bottom: 56.25%;
            border-radius: 16px;
            overflow: hidden;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .premium-video-card:hover .premium-video-thumbnail {
            transform: translateY(-4px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
          }

          .premium-video-thumbnail img,
          .premium-video-thumbnail video {
            transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .premium-video-card:hover .premium-video-thumbnail img,
          .premium-video-card:hover .premium-video-thumbnail video {
            transform: scale(1.05);
          }

          .premium-video-hover-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.4);
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .premium-video-card:hover .premium-video-hover-overlay {
            opacity: 1;
          }

          .premium-video-play-btn {
            width: 64px;
            height: 64px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 9999px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1a1a1a;
            transform: scale(0.8);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          }

          .premium-video-card:hover .premium-video-play-btn {
            transform: scale(1);
          }

          .premium-duration-badge {
            position: absolute;
            bottom: 8px;
            right: 8px;
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(4px);
            border-radius: 6px;
            color: white;
            font-size: 11px;
            font-weight: 600;
          }

          .premium-video-shine {
            position: absolute;
            top: 0;
            left: -100%;
            width: 50%;
            height: 100%;
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.15) 50%,
              transparent 100%
            );
            transform: skewX(-25deg);
            transition: left 0.8s ease;
            pointer-events: none;
          }

          .premium-video-card:hover .premium-video-shine {
            left: 150%;
          }

          /* ===== PREMIUM VIDEO INFO ===== */
          .premium-video-avatar {
            transition: transform 0.2s ease;
          }

          .premium-video-avatar:hover {
            transform: scale(1.05);
          }

          .premium-avatar-ring {
            position: relative;
            width: 40px;
            height: 40px;
            border-radius: 9999px;
            padding: 2px;
            background: var(--premium-gradient);
          }

          .premium-avatar-gradient {
            width: 100%;
            height: 100%;
            border-radius: 9999px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            font-weight: 700;
          }

          .premium-avatar-ring img {
            position: absolute;
            inset: 2px;
            width: calc(100% - 4px);
            height: calc(100% - 4px);
            border-radius: 9999px;
            object-fit: cover;
            transition: opacity 0.3s ease;
          }

          .premium-video-title {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            font-size: 14px;
            font-weight: 600;
            line-height: 1.4;
            color: #1a1a1a;
            margin-bottom: 4px;
            transition: color 0.2s ease;
          }

          .dark .premium-video-title {
            color: #f1f1f1;
          }

          .premium-video-card:hover .premium-video-title {
            color: var(--premium-primary);
          }

          .premium-video-channel {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 12px;
            font-weight: 500;
            color: #666666;
            margin-bottom: 4px;
            transition: color 0.2s ease;
            cursor: pointer;
          }

          .dark .premium-video-channel {
            color: #aaaaaa;
          }

          .premium-video-channel:hover {
            color: #1a1a1a;
          }

          .dark .premium-video-channel:hover {
            color: #ffffff;
          }

          .premium-video-meta {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            color: #888888;
          }

          .dark .premium-video-meta {
            color: #666666;
          }

          .premium-meta-dot {
            font-size: 6px;
            margin: 0 2px;
          }

          /* ===== PREMIUM EMPTY STATE ===== */
          .premium-empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            text-align: center;
          }

          .premium-empty-icon {
            width: 80px;
            height: 80px;
            background: var(--premium-gradient);
            border-radius: 9999px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            margin-bottom: 24px;
            opacity: 0.5;
          }

          .premium-empty-title {
            font-size: 20px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 8px;
          }

          .dark .premium-empty-title {
            color: #f1f1f1;
          }

          .premium-empty-subtitle {
            font-size: 14px;
            color: #888888;
          }

          /* ===== SCROLLBAR HIDING ===== */
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }

          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          /* ===== ACCESSIBILITY ===== */
          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }

          /* Focus states for keyboard navigation */
          .premium-short-card:focus-visible,
          .premium-video-card:focus-visible {
            outline: 2px solid var(--premium-primary);
            outline-offset: 4px;
            border-radius: 16px;
          }

          .premium-scroll-btn:focus-visible {
            outline: 2px solid var(--premium-primary);
            outline-offset: 2px;
          }

          /* ===== MOBILE OPTIMIZATIONS ===== */
          @media (max-width: 639px) {
            .premium-short-card {
              width: 150px;
              min-width: 150px;
            }

            .premium-short-thumbnail {
              border-radius: 12px;
            }

            .premium-video-thumbnail {
              border-radius: 12px;
            }

            .premium-shorts-icon,
            .premium-videos-icon {
              width: 36px;
              height: 36px;
            }

            .premium-section-title {
              font-size: 18px;
            }

            .premium-video-grid {
              gap: 20px;
            }

            .premium-avatar-ring {
              width: 36px;
              height: 36px;
            }

            .ambient-orb {
              opacity: 0.15;
            }
          }

          /* ===== TABLET OPTIMIZATIONS ===== */
          @media (min-width: 640px) and (max-width: 1023px) {
            .premium-short-card {
              width: 160px;
              min-width: 160px;
            }

            .premium-shorts-scroll {
              gap: 14px;
            }
          }

          /* ===== LARGE DESKTOP ===== */
          @media (min-width: 1536px) {
            .premium-video-grid {
              grid-template-columns: repeat(5, 1fr);
            }

            .premium-short-card {
              width: 200px;
              min-width: 200px;
            }
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
