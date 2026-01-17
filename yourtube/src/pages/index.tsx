/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/index.tsx - PREMIUM REDESIGN

import { NextPage } from "next";
import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Play, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
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
  const [mounted, setMounted] = useState(false);

  // Scroll position for shorts navigation
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const bgColor = isDark ? "#030303" : "#fafafa";

      document.body.style.backgroundColor = bgColor;
      document.documentElement.style.backgroundColor = bgColor;
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
          if (isMounted) {
            setBackendReady(true);
            setConnectionError(null);
          }
          return;
        }
      } catch (error) {
        console.warn(`Backend check ${attempt} failed:`, error);
      }

      if (attempt < 5 && isMounted) {
        setBackendCheckAttempts(attempt);
        setConnectionError(`Connecting to server... (${attempt}/5)`);

        const delay = Math.min(5000 * Math.pow(1.5, attempt - 1), 15000);
        setTimeout(() => pingBackend(attempt + 1), delay);
      } else if (isMounted) {
        setConnectionError("Unable to connect. Please refresh.");
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

      const res = await axiosInstance.get("/video/getall", {
        params: { _t: Date.now() },
      });
      if (res.data.success && Array.isArray(res.data.videos)) {
        setVideos(res.data.videos);

        const newKeys: Record<string, number> = {};
        res.data.videos.forEach((video: Video) => {
          if (video.uploadedBy?._id) {
            newKeys[video.uploadedBy._id] = Date.now();
          }
        });
        setImageKeys(newKeys);
      }
    } catch (error: any) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const fetchShorts = async () => {
    try {
      setLoadingShorts(true);

      const response = await axiosInstance.get("/api/shorts", {
        params: { limit: 20 },
      });

      if (response.data.success && Array.isArray(response.data.data)) {
        setShorts(response.data.data);
      } else {
        setShorts([]);
      }
    } catch (error: any) {
      console.error("Error fetching shorts:", error);
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

  // Update scroll indicators
  const updateScrollIndicators = () => {
    if (shortsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = shortsScrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const scrollContainer = shortsScrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", updateScrollIndicators);
      updateScrollIndicators();
      return () =>
        scrollContainer.removeEventListener("scroll", updateScrollIndicators);
    }
  }, [shorts]);

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
        console.error("Thumbnail generation error:", error);
      }
    }

    return "/placeholder-thumbnail.jpg";
  };

  const [thumbnailErrors, setThumbnailErrors] = useState<Set<string>>(
    new Set(),
  );

  const handleThumbnailError = (videoId: string, url: string) => {
    setThumbnailErrors((prev) => new Set(prev).add(videoId));
  };

  const scrollShorts = (direction: "left" | "right") => {
    if (shortsScrollRef.current) {
      const scrollAmount = 320;
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
      const scrollAmount = 280;
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

  if (!mounted) return null;

  return (
    <ProtectedRoute requireAuth={true}>
      <>
        <Head>
          <title>YourTube - Home</title>
          <meta name="theme-color" content="#030303" />
        </Head>

        {/* Connection Status Banner */}
        {connectionError && (
          <div className="premium-banner fixed top-0 left-0 right-0 z-50">
            <div className="flex items-center justify-center gap-3 py-3 px-4">
              <div className="premium-spinner" />
              <span className="text-sm font-medium text-white/90">
                {connectionError}
              </span>
            </div>
          </div>
        )}

        {/* Premium Loading Screen */}
        {!backendReady && !connectionError && (
          <div className="premium-loading-screen">
            <div className="premium-loader">
              <div className="loader-ring"></div>
              <div className="loader-ring"></div>
              <div className="loader-ring"></div>
            </div>
            <h2 className="text-xl font-semibold mt-8 mb-2">YourTube</h2>
            <p className="text-sm opacity-60">
              {backendCheckAttempts > 0
                ? `Initializing... (${backendCheckAttempts}/5)`
                : "Loading your experience..."}
            </p>
          </div>
        )}

        {/* Main Container */}
        <div ref={containerRef} className="premium-container">
          {/* Pull to Refresh Indicator */}
          {pullDistance > 0 && (
            <div
              className="pull-refresh-indicator"
              style={{ height: `${pullDistance}px` }}
            >
              <div className={`refresh-icon ${refreshing ? "spinning" : ""}`}>
                <svg
                  className="w-5 h-5"
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
              </div>
            </div>
          )}

          {/* ========== SHORTS SECTION ========== */}
          {shorts.length > 0 && (
            <section className="shorts-section">
              {/* Section Header */}
              <div className="section-header">
                <div className="header-left">
                  <div className="shorts-icon">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <path d="M10 14.65v-5.3L15 12l-5 2.65zm7.77-4.33c-.77-.32-1.2-.5-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25z" />
                    </svg>
                  </div>
                  <h2 className="section-title">Shorts</h2>
                </div>
                <Link href="/shorts" className="view-all-link">
                  View all
                  <ChevronRight size={16} />
                </Link>
              </div>

              {loadingShorts ? (
                <div className="shorts-skeleton-container">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="short-skeleton">
                      <div className="skeleton-thumbnail" />
                      <div className="skeleton-title" />
                      <div className="skeleton-channel" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="shorts-wrapper">
                  {/* Left Navigation */}
                  <button
                    onClick={() => scrollShorts("left")}
                    className={`scroll-nav-btn left ${
                      canScrollLeft ? "visible" : ""
                    }`}
                    aria-label="Scroll left"
                  >
                    <ChevronLeft size={20} />
                  </button>

                  {/* Right Navigation */}
                  <button
                    onClick={() => scrollShorts("right")}
                    className={`scroll-nav-btn right ${
                      canScrollRight ? "visible" : ""
                    }`}
                    aria-label="Scroll right"
                  >
                    <ChevronRight size={20} />
                  </button>

                  {/* Shorts Scroll Container */}
                  <div
                    ref={shortsScrollRef}
                    className="shorts-scroll-container"
                    onTouchStart={handleShortsScrollTouchStart}
                    onTouchMove={handleShortsScrollTouchMove}
                    onTouchEnd={handleShortsScrollTouchEnd}
                  >
                    {shorts.slice(0, 12).map((short, index) => {
                      const shortAvatar = getShortAvatar(short);
                      const shortChannelName = getShortChannelName(short);

                      return (
                        <article
                          key={short._id}
                          onClick={(e) => {
                            if (
                              !(e.target as HTMLElement).closest(
                                ".channel-link",
                              )
                            ) {
                              handleShortClick(e, short._id, index);
                            }
                          }}
                          className="short-card"
                        >
                          {/* Thumbnail */}
                          <div className="short-thumbnail">
                            <img
                              src={short.thumbnailUrl}
                              alt={short.title}
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
                                    video.className = "thumbnail-video";
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

                            {/* Hover Overlay */}
                            <div className="thumbnail-overlay">
                              <div className="play-button">
                                <Play size={24} fill="currentColor" />
                              </div>
                            </div>

                            {/* Gradient */}
                            <div className="thumbnail-gradient" />

                            {/* Views Badge */}
                            <div className="views-badge">
                              <svg
                                className="w-3 h-3"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                              </svg>
                              <span>{formatViewsShort(short.views)}</span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="short-content">
                            <h3 className="short-title" title={short.title}>
                              {short.title}
                            </h3>
                            <div
                              className="channel-link"
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
                                className="channel-avatar"
                                onError={(e) => {
                                  e.currentTarget.src =
                                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';
                                }}
                              />
                              <span className="channel-name">
                                {shortChannelName}
                              </span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ========== VIDEOS SECTION ========== */}
          <section className="videos-section">
            <div className="section-header">
              <div className="header-left">
                <div className="videos-icon">
                  <Sparkles size={18} />
                </div>
                <h2 className="section-title">Recommended</h2>
              </div>
            </div>

            {loadingVideos ? (
              <div className="videos-grid">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="video-skeleton">
                    <div className="skeleton-video-thumbnail" />
                    <div className="skeleton-video-info">
                      <div className="skeleton-avatar" />
                      <div className="skeleton-text-group">
                        <div className="skeleton-video-title" />
                        <div className="skeleton-video-channel" />
                        <div className="skeleton-video-meta" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : videos.length > 0 ? (
              <div className="videos-grid">
                {videos.slice(0, 12).map((video) => {
                  const channelName =
                    video.uploadedBy?.channelname ||
                    video.uploadedBy?.name ||
                    video?.videochanel ||
                    "Unknown Channel";
                  const channelInitial = channelName[0]?.toUpperCase() || "U";

                  return (
                    <article key={video._id} className="video-card">
                      {/* Thumbnail */}
                      <Link
                        href={`/watch/${video._id}`}
                        className="video-thumbnail-link"
                      >
                        <div className="video-thumbnail">
                          {getThumbnailUrl(video).includes("supabase.co") ? (
                            <img
                              src={getThumbnailUrl(video)}
                              alt={video?.videotitle || "Video thumbnail"}
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
                                  videoElement.className = "thumbnail-video";
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
                              preload="metadata"
                              poster={getThumbnailUrl(video)}
                              muted
                              playsInline
                            />
                          )}

                          {/* Duration Badge */}
                          {video?.duration && (
                            <div className="duration-badge">
                              {video.duration}
                            </div>
                          )}

                          {/* Hover Overlay */}
                          <div className="video-overlay">
                            <div className="play-icon">
                              <Play size={40} fill="currentColor" />
                            </div>
                          </div>
                        </div>
                      </Link>

                      {/* Video Info */}
                      <div className="video-info">
                        <div
                          className="video-avatar"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(
                              `/channel/${video.uploadedBy?._id || "unknown"}`,
                            );
                          }}
                        >
                          <div className="avatar-fallback">
                            {channelInitial}
                          </div>
                          <img
                            key={`video-avatar-${video._id}-${
                              imageKeys[video.uploadedBy?._id || ""] ||
                              Date.now()
                            }`}
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

                        <div className="video-text">
                          <Link href={`/watch/${video._id}`}>
                            <h3
                              className="video-title"
                              title={video?.videotitle || "Untitled Video"}
                            >
                              {video?.videotitle || "Untitled Video"}
                            </h3>
                          </Link>

                          <p
                            className="video-channel"
                            onClick={(e) => {
                              e.preventDefault();
                              router.push(
                                `/channel/${video.uploadedBy?._id || "unknown"}`,
                              );
                            }}
                            title={channelName}
                          >
                            {channelName}
                          </p>

                          <div className="video-meta">
                            <span>{formatViews(video?.views)}</span>
                            <span className="meta-dot">•</span>
                            <span>{formatTimeAgo(video?.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <Play size={48} />
                </div>
                <p>No videos available</p>
              </div>
            )}
          </section>
        </div>

        {/* Premium Styles */}
        <style jsx>{`
          /* ========== BASE VARIABLES ========== */
          :root {
            --premium-bg: #fafafa;
            --premium-surface: #ffffff;
            --premium-surface-hover: #f5f5f5;
            --premium-border: rgba(0, 0, 0, 0.08);
            --premium-text-primary: #0f0f0f;
            --premium-text-secondary: #606060;
            --premium-text-tertiary: #909090;
            --premium-accent: #ff0033;
            --premium-accent-soft: rgba(255, 0, 51, 0.1);
            --premium-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
            --premium-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
            --premium-shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.12);
            --premium-radius-sm: 8px;
            --premium-radius-md: 12px;
            --premium-radius-lg: 16px;
            --premium-radius-xl: 20px;
          }

          :global(.dark) {
            --premium-bg: #030303;
            --premium-surface: #0f0f0f;
            --premium-surface-hover: #1a1a1a;
            --premium-border: rgba(255, 255, 255, 0.1);
            --premium-text-primary: #f1f1f1;
            --premium-text-secondary: #aaaaaa;
            --premium-text-tertiary: #717171;
            --premium-accent: #ff4444;
            --premium-accent-soft: rgba(255, 68, 68, 0.15);
            --premium-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
            --premium-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
            --premium-shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.5);
          }

          /* ========== PREMIUM CONTAINER ========== */
          .premium-container {
            width: 100%;
            min-height: 100vh;
            padding-bottom: 80px;
            background: var(--premium-bg);
            transition: background-color 0.3s ease;
          }

          @media (min-width: 1024px) {
            .premium-container {
              padding-bottom: 0;
            }
          }

          /* ========== CONNECTION BANNER ========== */
          .premium-banner {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            backdrop-filter: blur(10px);
          }

          .premium-spinner {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          /* ========== LOADING SCREEN ========== */
          .premium-loading-screen {
            position: fixed;
            inset: 0;
            z-index: 100;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: var(--premium-bg);
            color: var(--premium-text-primary);
          }

          .premium-loader {
            position: relative;
            width: 60px;
            height: 60px;
          }

          .loader-ring {
            position: absolute;
            inset: 0;
            border: 3px solid transparent;
            border-top-color: var(--premium-accent);
            border-radius: 50%;
            animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
          }

          .loader-ring:nth-child(2) {
            inset: 6px;
            animation-delay: -0.15s;
            border-top-color: var(--premium-text-secondary);
          }

          .loader-ring:nth-child(3) {
            inset: 12px;
            animation-delay: -0.3s;
            border-top-color: var(--premium-text-tertiary);
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          /* ========== PULL TO REFRESH ========== */
          .pull-refresh-indicator {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 50;
            background: linear-gradient(
              to bottom,
              var(--premium-surface),
              transparent
            );
          }

          .refresh-icon {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--premium-surface);
            border-radius: 50%;
            box-shadow: var(--premium-shadow-md);
            color: var(--premium-text-primary);
            transition: transform 0.2s ease;
          }

          .refresh-icon.spinning svg {
            animation: spin 0.8s linear infinite;
          }

          /* ========== SECTION HEADER ========== */
          .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 16px 16px;
          }

          @media (min-width: 1024px) {
            .section-header {
              padding: 28px 24px 20px;
            }
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .shorts-icon {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #ff0033 0%, #ff4444 100%);
            border-radius: var(--premium-radius-sm);
            color: white;
            box-shadow: 0 4px 12px rgba(255, 0, 51, 0.3);
          }

          .videos-icon {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: var(--premium-radius-sm);
            color: white;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }

          .section-title {
            font-size: 20px;
            font-weight: 700;
            color: var(--premium-text-primary);
            letter-spacing: -0.02em;
          }

          @media (min-width: 1024px) {
            .section-title {
              font-size: 24px;
            }
          }

          .view-all-link {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 14px;
            font-weight: 600;
            color: var(--premium-accent);
            text-decoration: none;
            padding: 8px 12px;
            border-radius: var(--premium-radius-sm);
            transition: all 0.2s ease;
          }

          .view-all-link:hover {
            background: var(--premium-accent-soft);
          }

          /* ========== SHORTS SECTION ========== */
          .shorts-section {
            border-bottom: 1px solid var(--premium-border);
            padding-bottom: 24px;
          }

          .shorts-skeleton-container {
            display: flex;
            gap: 16px;
            padding: 0 16px;
            overflow: hidden;
          }

          .short-skeleton {
            flex-shrink: 0;
            width: 180px;
          }

          @media (min-width: 1024px) {
            .short-skeleton {
              width: 200px;
            }
          }

          .skeleton-thumbnail {
            width: 100%;
            padding-bottom: 177.5%;
            background: linear-gradient(
              90deg,
              var(--premium-surface-hover) 25%,
              var(--premium-surface) 50%,
              var(--premium-surface-hover) 75%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: var(--premium-radius-lg);
          }

          .skeleton-title {
            height: 14px;
            margin-top: 12px;
            background: var(--premium-surface-hover);
            border-radius: 4px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-channel {
            height: 12px;
            margin-top: 8px;
            width: 60%;
            background: var(--premium-surface-hover);
            border-radius: 4px;
            animation: shimmer 1.5s infinite;
          }

          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }

          /* Shorts Wrapper */
          .shorts-wrapper {
            position: relative;
          }

          .scroll-nav-btn {
            display: none;
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            z-index: 10;
            width: 44px;
            height: 44px;
            align-items: center;
            justify-content: center;
            background: var(--premium-surface);
            border: 1px solid var(--premium-border);
            border-radius: 50%;
            color: var(--premium-text-primary);
            cursor: pointer;
            opacity: 0;
            transition: all 0.2s ease;
            box-shadow: var(--premium-shadow-md);
          }

          .scroll-nav-btn.left {
            left: 8px;
          }

          .scroll-nav-btn.right {
            right: 8px;
          }

          .scroll-nav-btn.visible {
            opacity: 1;
          }

          .scroll-nav-btn:hover {
            background: var(--premium-surface-hover);
            transform: translateY(-50%) scale(1.05);
          }

          @media (min-width: 1024px) {
            .shorts-wrapper:hover .scroll-nav-btn.visible {
              display: flex;
            }
          }

          /* Shorts Scroll Container */
          .shorts-scroll-container {
            display: flex;
            gap: 16px;
            padding: 0 16px;
            overflow-x: auto;
            scroll-behavior: smooth;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .shorts-scroll-container::-webkit-scrollbar {
            display: none;
          }

          @media (min-width: 1024px) {
            .shorts-scroll-container {
              padding: 0 24px;
              gap: 20px;
            }
          }

          /* Short Card */
          .short-card {
            flex-shrink: 0;
            width: 160px;
            cursor: pointer;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
          }

          @media (min-width: 640px) {
            .short-card {
              width: 180px;
            }
          }

          @media (min-width: 1024px) {
            .short-card {
              width: 200px;
            }
          }

          /* Short Thumbnail */
          .short-thumbnail {
            position: relative;
            width: 100%;
            padding-bottom: 177.5%;
            border-radius: var(--premium-radius-lg);
            overflow: hidden;
            background: var(--premium-surface-hover);
            box-shadow: var(--premium-shadow-sm);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .short-card:hover .short-thumbnail {
            transform: translateY(-4px);
            box-shadow: var(--premium-shadow-lg);
          }

          .short-card:active .short-thumbnail {
            transform: scale(0.98);
          }

          .short-thumbnail img,
          .short-thumbnail video,
          .thumbnail-video {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.4s ease;
          }

          .short-card:hover .short-thumbnail img {
            transform: scale(1.05);
          }

          .thumbnail-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.4);
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .short-card:hover .thumbnail-overlay {
            opacity: 1;
          }

          .play-button {
            width: 56px;
            height: 56px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            border-radius: 50%;
            color: var(--premium-text-primary);
            transform: scale(0.8);
            transition: transform 0.3s ease;
            box-shadow: var(--premium-shadow-lg);
          }

          .short-card:hover .play-button {
            transform: scale(1);
          }

          .thumbnail-gradient {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              to top,
              rgba(0, 0, 0, 0.7) 0%,
              rgba(0, 0, 0, 0.3) 30%,
              transparent 60%
            );
            pointer-events: none;
          }

          .views-badge {
            position: absolute;
            bottom: 10px;
            left: 10px;
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(4px);
            border-radius: 6px;
            color: white;
            font-size: 11px;
            font-weight: 600;
          }

          /* Short Content */
          .short-content {
            padding: 12px 4px 0;
          }

          .short-title {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            font-size: 14px;
            font-weight: 600;
            line-height: 1.4;
            color: var(--premium-text-primary);
            margin-bottom: 8px;
            transition: color 0.2s ease;
          }

          .short-card:hover .short-title {
            color: var(--premium-accent);
          }

          .channel-link {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
          }

          .channel-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--premium-border);
            transition: border-color 0.2s ease;
          }

          .channel-link:hover .channel-avatar {
            border-color: var(--premium-accent);
          }

          .channel-name {
            font-size: 12px;
            font-weight: 500;
            color: var(--premium-text-secondary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            transition: color 0.2s ease;
          }

          .channel-link:hover .channel-name {
            color: var(--premium-text-primary);
          }

          /* ========== VIDEOS SECTION ========== */
          .videos-section {
            padding-bottom: 24px;
          }

          .videos-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 24px;
            padding: 0 16px;
          }

          @media (min-width: 640px) {
            .videos-grid {
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
          }

          @media (min-width: 1024px) {
            .videos-grid {
              grid-template-columns: repeat(3, 1fr);
              gap: 24px;
              padding: 0 24px;
            }
          }

          @media (min-width: 1280px) {
            .videos-grid {
              grid-template-columns: repeat(4, 1fr);
            }
          }

          /* Video Skeleton */
          .video-skeleton {
            display: flex;
            flex-direction: column;
          }

          .skeleton-video-thumbnail {
            width: 100%;
            aspect-ratio: 16 / 9;
            background: linear-gradient(
              90deg,
              var(--premium-surface-hover) 25%,
              var(--premium-surface) 50%,
              var(--premium-surface-hover) 75%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: var(--premium-radius-md);
          }

          .skeleton-video-info {
            display: flex;
            gap: 12px;
            margin-top: 12px;
          }

          .skeleton-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: var(--premium-surface-hover);
            flex-shrink: 0;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-text-group {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .skeleton-video-title {
            height: 16px;
            background: var(--premium-surface-hover);
            border-radius: 4px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-video-channel {
            height: 12px;
            width: 70%;
            background: var(--premium-surface-hover);
            border-radius: 4px;
            animation: shimmer 1.5s infinite;
          }

          .skeleton-video-meta {
            height: 12px;
            width: 50%;
            background: var(--premium-surface-hover);
            border-radius: 4px;
            animation: shimmer 1.5s infinite;
          }

          /* Video Card */
          .video-card {
            display: flex;
            flex-direction: column;
          }

          .video-thumbnail-link {
            display: block;
            text-decoration: none;
          }

          .video-thumbnail {
            position: relative;
            width: 100%;
            aspect-ratio: 16 / 9;
            border-radius: var(--premium-radius-md);
            overflow: hidden;
            background: var(--premium-surface-hover);
            box-shadow: var(--premium-shadow-sm);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .video-card:hover .video-thumbnail {
            transform: translateY(-2px);
            box-shadow: var(--premium-shadow-md);
          }

          .video-thumbnail img,
          .video-thumbnail video {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.4s ease;
          }

          .video-card:hover .video-thumbnail img,
          .video-card:hover .video-thumbnail video {
            transform: scale(1.03);
          }

          .duration-badge {
            position: absolute;
            bottom: 8px;
            right: 8px;
            padding: 3px 6px;
            background: rgba(0, 0, 0, 0.85);
            border-radius: 4px;
            color: white;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.02em;
          }

          .video-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.3);
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .video-card:hover .video-overlay {
            opacity: 1;
          }

          .play-icon {
            color: white;
            filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
            transform: scale(0.9);
            transition: transform 0.3s ease;
          }

          .video-card:hover .play-icon {
            transform: scale(1);
          }

          /* Video Info */
          .video-info {
            display: flex;
            gap: 12px;
            margin-top: 12px;
          }

          .video-avatar {
            position: relative;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            overflow: hidden;
            flex-shrink: 0;
            cursor: pointer;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            transition: transform 0.2s ease;
          }

          .video-avatar:hover {
            transform: scale(1.05);
          }

          .avatar-fallback {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            font-weight: 600;
          }

          .video-avatar img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0;
            transition: opacity 0.2s ease;
          }

          .video-text {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .video-title {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            font-size: 15px;
            font-weight: 600;
            line-height: 1.4;
            color: var(--premium-text-primary);
            transition: color 0.2s ease;
          }

          .video-card:hover .video-title {
            color: var(--premium-accent);
          }

          .video-channel {
            font-size: 13px;
            font-weight: 500;
            color: var(--premium-text-secondary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            cursor: pointer;
            transition: color 0.2s ease;
            margin: 0;
          }

          .video-channel:hover {
            color: var(--premium-text-primary);
          }

          .video-meta {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: var(--premium-text-tertiary);
          }

          .meta-dot {
            font-size: 4px;
          }

          /* Empty State */
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            color: var(--premium-text-tertiary);
          }

          .empty-icon {
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--premium-surface-hover);
            border-radius: 50%;
            margin-bottom: 16px;
          }

          .empty-state p {
            font-size: 16px;
            font-weight: 500;
          }

          /* ========== RESPONSIVE FINE-TUNING ========== */
          @media (max-width: 360px) {
            .short-card {
              width: 140px;
            }

            .section-title {
              font-size: 18px;
            }

            .video-title {
              font-size: 14px;
            }
          }

          /* ========== ACCESSIBILITY ========== */
          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }

          /* Focus visible states */
          .short-card:focus-visible,
          .video-card:focus-visible,
          .video-avatar:focus-visible,
          .channel-link:focus-visible {
            outline: 2px solid var(--premium-accent);
            outline-offset: 2px;
            border-radius: var(--premium-radius-sm);
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
