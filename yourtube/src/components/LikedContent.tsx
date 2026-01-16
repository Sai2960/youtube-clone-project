/* eslint-disable react-hooks/exhaustive-deps */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
// Removed date-fns import - using custom format function
import { MoreVertical, X, ThumbsUp, Play, Heart, Sparkles, Film, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { getVideoUrl as getProperVideoUrl } from "@/lib/urlHelper";

export default function LikedVideosContent() {
  const [activeTab, setActiveTab] = useState<string>("All");
  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [likedShorts, setLikedShorts] = useState<any[]>([]);
  const [allLiked, setAllLiked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  const tabs = ["All", "Videos", "Shorts"];

  // Tab icons for premium look
  const tabIcons: { [key: string]: React.ReactNode } = {
    All: <Sparkles className="w-4 h-4" />,
    Videos: <Film className="w-4 h-4" />,
    Shorts: <Clapperboard className="w-4 h-4" />,
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

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
        return `${interval} ${unit}${interval === 1 ? "" : "s"} ago`;
      }
    }
    return "just now";
  };

  useEffect(() => {
    if (user) {
      loadLikedContent();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadLikedContent = async () => {
    if (!user) return;

    try {
      const response = await axiosInstance.get(`/like/${user._id}`);

      if (response.data.success) {
        setLikedVideos(response.data.videos || []);
        setLikedShorts(response.data.shorts || []);
        setAllLiked(response.data.combined || []);
      } else {
        // Fallback for old API
        const validVideos = response.data.filter(
          (item: any) => item.videoid != null
        );
        setLikedVideos(validVideos);
        setAllLiked(validVideos);
      }
    } catch (error) {
      console.error("Error loading liked content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlikeVideo = async (videoId: string, likedVideoId: string) => {
    if (!user) return;

    try {
      console.log("🗑️ Unliking video:", { videoId, likedVideoId });

      // ✅ Toggle the like off
      const response = await axiosInstance.post(`/like/video/${videoId}`, {
        userId: user._id,
        isLike: true, // Send true to toggle it off
      });

      console.log("✅ Unlike response:", response.data);

      if (response.data.success && !response.data.liked) {
        // Remove from UI only if the server confirms it's unliked
        setLikedVideos((prev) =>
          prev.filter((item) => item._id !== likedVideoId)
        );
        setAllLiked((prev) => prev.filter((item) => item._id !== likedVideoId));

        console.log("✅ Video removed from liked list");
      }
    } catch (error) {
      console.error("❌ Error unliking video:", error);
    }
  };

  const handleUnlikeShort = async (shortId: string, likedShortId: string) => {
    if (!user) return;

    try {
      console.log("🗑️ Unliking short:", { shortId, likedShortId });

      const response = await axiosInstance.post(`/like/short/${shortId}`, {
        userId: user._id,
      });

      console.log("✅ Unlike short response:", response.data);

      if (response.data.success && !response.data.liked) {
        // Remove from UI only if the server confirms it's unliked
        setLikedShorts((prev) =>
          prev.filter((item) => item._id !== likedShortId)
        );
        setAllLiked((prev) => prev.filter((item) => item._id !== likedShortId));

        console.log("✅ Short removed from liked list");
      }
    } catch (error) {
      console.error("❌ Error unliking short:", error);
    }
  };

  const getVideoUrl = (video: any) => {
    const url = getProperVideoUrl(video);
    return url || "";
  };

  const getShortThumbnail = (short: any) => {
    if (short?.thumbnailUrl) {
      if (short.thumbnailUrl.startsWith("http")) {
        return short.thumbnailUrl;
      }
      return short.thumbnailUrl;
    }
    return null;
  };

  const getFilteredContent = () => {
    if (activeTab === "Videos") return likedVideos;
    if (activeTab === "Shorts") return likedShorts;
    return allLiked;
  };

  const filteredContent = getFilteredContent();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md px-4">
          {/* Premium Glass Card */}
          <div className="relative p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-zinc-700/50 shadow-2xl shadow-black/5 dark:shadow-black/30">
            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-rose-400/20 to-pink-500/20 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-red-400/20 to-rose-500/20 rounded-full blur-2xl"></div>

            <div className="relative">
              <div className="bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/40 dark:to-pink-900/40 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-500/10 dark:shadow-rose-500/5 ring-1 ring-rose-200/50 dark:ring-rose-700/30">
                <Heart className="w-12 h-12 text-rose-600 dark:text-rose-400" fill="currentColor" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white tracking-tight">
                Keep track of videos you love
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Sign in to see your liked videos and shorts collection.
              </p>
              <Link href="/login">
                <Button className="bg-gradient-to-r from-rose-500 via-pink-500 to-red-500 hover:from-rose-600 hover:via-pink-600 hover:to-red-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-[3px] border-transparent border-t-rose-500 border-r-pink-400 mx-auto mb-6 shadow-lg shadow-rose-500/20"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-20 w-20 border border-rose-500/30 mx-auto opacity-75"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium tracking-wide text-sm uppercase">
            Loading your favorites...
          </p>
        </div>
      </div>
    );
  }

  if (filteredContent.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md px-4">
          {/* Premium Empty State Card */}
          <div className="relative p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-zinc-700/50 shadow-2xl shadow-black/5 dark:shadow-black/30">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-slate-400/10 to-gray-500/10 rounded-full blur-2xl"></div>

            <div className="relative">
              <div className="bg-gradient-to-br from-slate-100 to-gray-100 dark:from-zinc-800 dark:to-zinc-900 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5 shadow-inner ring-1 ring-gray-200/50 dark:ring-zinc-700/50">
                <ThumbsUp className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white tracking-tight">
                No liked {activeTab.toLowerCase()} yet
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                {activeTab === "All" ? "Videos and shorts" : activeTab} you like
                will appear in your collection.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-100 dark:from-[#0a0a0a] dark:via-[#0f0f0f] dark:to-[#141414] overflow-x-hidden">
      {/* Mobile Header - Premium */}
      <div className="md:hidden px-4 pt-6 pb-4 border-b border-gray-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/20">
            <Heart className="w-5 h-5 text-white" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Liked {activeTab.toLowerCase()}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {filteredContent.length}{" "}
              {filteredContent.length === 1 ? "item" : "items"} saved
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Header - Premium */}
      <div className="hidden md:block max-w-7xl mx-auto px-6 pt-8 pb-6">
        <div className="relative p-6 rounded-2xl bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-red-500/10 dark:from-rose-900/20 dark:via-pink-900/20 dark:to-red-900/20 border border-rose-200/30 dark:border-rose-800/30 backdrop-blur-sm overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-rose-400/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-400/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-red-500 shadow-xl shadow-rose-500/25">
              <Heart className="w-8 h-8 text-white" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                Liked {activeTab.toLowerCase()}
                <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full shadow-sm">
                  {filteredContent.length}
                </span>
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                Your favorites, all in one place
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 md:pb-10 w-full overflow-x-hidden">
        {/* Premium Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 py-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl whitespace-nowrap text-sm font-semibold transition-all duration-300 flex-shrink-0 flex items-center gap-2 ${
                activeTab === tab
                  ? "bg-gradient-to-r from-rose-500 via-pink-500 to-red-500 text-white shadow-lg shadow-rose-500/25"
                  : "bg-white/80 dark:bg-zinc-800/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-zinc-700 border border-gray-200/50 dark:border-zinc-700/50 backdrop-blur-sm hover:shadow-md"
              }`}
            >
              {tabIcons[tab]}
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-8">
          {/* Shorts Section - MOBILE FIXED & PREMIUM */}
          {(activeTab === "All" || activeTab === "Shorts") &&
            likedShorts.length > 0 && (
              <div className="pb-8 border-b border-gray-200/60 dark:border-zinc-800/60 overflow-hidden">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-500/20">
                    <Play className="text-white w-4 h-4" fill="currentColor" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                    Liked Shorts
                  </h2>
                  <span className="px-2.5 py-0.5 text-xs font-semibold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded-full">
                    {likedShorts.length}
                  </span>
                </div>

                {/* ✅ MOBILE-OPTIMIZED SCROLL CONTAINER */}
                <div className="w-full shorts-scroll-container">
                  <div className="flex gap-4 pb-2 min-w-min overflow-x-auto scrollbar-hide">
                    {likedShorts.map((item, index) => {
                      const short = item.shortid;
                      if (!short) return null;

                      return (
                        <div
                          key={item._id}
                          className="flex-shrink-0 w-[160px] md:w-[180px] relative group"
                          style={{
                            animationDelay: `${index * 50}ms`,
                            animation: "fadeInUp 0.5s ease-out forwards",
                            opacity: 0,
                          }}
                        >
                          <style jsx>{`
                            @keyframes fadeInUp {
                              from {
                                opacity: 0;
                                transform: translateY(10px);
                              }
                              to {
                                opacity: 1;
                                transform: translateY(0);
                              }
                            }
                          `}</style>
                          <Link href={`/shorts/${short._id}`} className="block">
                            <div className="aspect-[9/16] rounded-2xl overflow-hidden relative bg-gradient-to-br from-slate-200 to-slate-300 dark:from-zinc-800 dark:to-zinc-900 ring-1 ring-black/5 dark:ring-white/5 shadow-lg group-hover:shadow-xl group-hover:shadow-rose-500/10 transition-all duration-300 group-hover:ring-rose-500/30">
                              {getShortThumbnail(short) ? (
                                <img
                                  src={getShortThumbnail(short)}
                                  alt={short.title || "Short"}
                                  className="w-full h-full object-cover relative z-10"
                                  loading="lazy"
                                />
                              ) : short.videoUrl ? (
                                <video
                                  src={short.videoUrl}
                                  className="w-full h-full object-cover bg-transparent relative z-10"
                                  preload="metadata"
                                  muted
                                  playsInline
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30">
                                  <div className="text-center text-gray-600 dark:text-gray-300 p-4">
                                    <Play className="w-12 h-12 mx-auto mb-2 opacity-60" />
                                    <p className="text-xs font-medium">
                                      No preview
                                    </p>
                                  </div>
                                </div>
                              )}
                              {/* Premium Hover overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 z-20" />

                              {/* Play icon on hover - Premium */}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
                                <div className="transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                  <div className="w-14 h-14 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm flex items-center justify-center shadow-2xl ring-2 ring-rose-500/20">
                                    <Play
                                      className="w-7 h-7 text-rose-600 dark:text-rose-500 ml-0.5"
                                      fill="currentColor"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* HD Badge */}
                              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded-md text-[10px] font-bold text-white z-20">
                                HD
                              </div>
                            </div>
                          </Link>

                          {/* Title and views - Premium */}
                          <div className="mt-3 px-1">
                            <h3 className="text-sm font-semibold line-clamp-2 leading-tight text-gray-900 dark:text-white mb-1.5 group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors">
                              {short.title || "Untitled Short"}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              {short.views?.toLocaleString() || "0"} views
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleUnlikeShort(short._id, item._id);
                            }}
                            className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 z-30 rounded-lg backdrop-blur-sm"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          {/* Videos Section - Premium */}
          {(activeTab === "All" || activeTab === "Videos") &&
            likedVideos.length > 0 && (
              <div className="space-y-3 md:space-y-4">
                {/* Videos Header */}
                {activeTab === "All" && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 shadow-md shadow-pink-500/20">
                      <Film className="text-white w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                      Liked Videos
                    </h2>
                    <span className="px-2.5 py-0.5 text-xs font-semibold bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 rounded-full">
                      {likedVideos.length}
                    </span>
                  </div>
                )}

                {likedVideos.map((item, index) => {
                  if (!item.videoid) return null;
                  const video = item.videoid;

                  return (
                    <div
                      key={item._id}
                      className="mb-2 md:mb-3"
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animation: "fadeInUp 0.5s ease-out forwards",
                        opacity: 0,
                      }}
                    >
                      <style jsx>{`
                        @keyframes fadeInUp {
                          from {
                            opacity: 0;
                            transform: translateY(10px);
                          }
                          to {
                            opacity: 1;
                            transform: translateY(0);
                          }
                        }
                      `}</style>
                      <div className="flex gap-3 md:gap-4 bg-white/60 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-800/80 p-2.5 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 relative group border border-gray-200/40 dark:border-zinc-800/60 hover:border-rose-300/50 dark:hover:border-rose-700/50 shadow-sm hover:shadow-lg hover:shadow-rose-500/5 dark:hover:shadow-rose-500/5 backdrop-blur-sm">
                        {/* Premium Index Badge */}
                        <div className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-700 dark:to-zinc-800 rounded-lg items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-zinc-600/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          {index + 1}
                        </div>

                        {/* Thumbnail */}
                        <Link
                          href={`/watch/${video._id}`}
                          className="flex-shrink-0"
                        >
                          {/* Premium video thumbnail container */}
                          <div className="w-[140px] h-[78px] md:w-[260px] md:h-[146px] bg-gradient-to-br from-slate-200 to-slate-300 dark:from-zinc-800 dark:to-zinc-900 rounded-lg md:rounded-xl overflow-hidden relative ring-1 ring-black/5 dark:ring-white/5 shadow-md group-hover:shadow-xl transition-shadow duration-300">
                            <video
                              src={getVideoUrl(video)}
                              className="w-full h-full object-cover relative z-10"
                              style={{ backgroundColor: "transparent" }}
                            />
                            {/* Premium Hover Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center z-20">
                              <div className="transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                <div className="p-3 md:p-4 rounded-full bg-white/90 dark:bg-zinc-900/90 shadow-2xl ring-1 ring-black/10">
                                  <Play
                                    className="w-6 h-6 md:w-8 md:h-8 text-rose-600 dark:text-rose-500"
                                    fill="currentColor"
                                  />
                                </div>
                              </div>
                            </div>
                            {/* Duration Badge Placeholder */}
                            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 rounded text-[10px] md:text-xs font-medium text-white z-20">
                              HD
                            </div>
                          </div>
                        </Link>

                        {/* Video Info */}
                        <div className="flex-1 min-w-0 flex flex-col py-0.5 md:py-1.5">
                          <Link href={`/watch/${video._id}`} className="flex-1">
                            <div className="space-y-1 md:space-y-2">
                              <h3 className="font-semibold text-sm md:text-base line-clamp-2 text-gray-900 dark:text-white leading-snug pr-8 md:pr-10 group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors">
                                {video.videotitle || "Untitled Video"}
                              </h3>

                              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 line-clamp-1 font-medium">
                                {video.videochanel || "Unknown Channel"}
                              </p>

                              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                                <span className="font-medium">
                                  {(video.views || 0).toLocaleString()} views
                                </span>
                                <span className="text-gray-300 dark:text-gray-600">
                                  •
                                </span>
                                <span className="hidden sm:inline">
                                  {video.createdAt
                                    ? formatTimeAgo(video.createdAt)
                                    : "Recently uploaded"}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 mt-1">
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100/80 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400">
                                  <Heart className="w-3 h-3" fill="currentColor" />
                                  <span className="text-[10px] md:text-xs font-medium">
                                    Liked {formatTimeAgo(item.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        </div>

                        {/* Menu Button - Premium */}
                        <div className="absolute top-2 right-2 md:top-3 md:right-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 md:h-9 md:w-9 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 shadow-sm hover:shadow-md"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-56 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-gray-200/50 dark:border-zinc-700/50 shadow-xl rounded-xl p-1"
                            >
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUnlikeVideo(video._id, item._id)
                                }
                                className="text-rose-600 dark:text-rose-400 focus:text-rose-700 dark:focus:text-rose-300 focus:bg-rose-50 dark:focus:bg-rose-900/20 cursor-pointer rounded-lg font-medium"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Remove from liked videos
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>

        {/* Premium Footer */}
        <div className="mt-8 md:mt-12 text-center pb-4">
          <p className="text-xs text-gray-400 dark:text-gray-600 font-medium tracking-wide">
            {filteredContent.length}{" "}
            {filteredContent.length === 1 ? "item" : "items"} in your favorites
          </p>
        </div>
      </div>
    </div>
  );
}
