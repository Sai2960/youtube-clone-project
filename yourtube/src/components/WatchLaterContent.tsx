/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { MoreVertical, X, Clock, Play, Sparkles, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";

// ✅ MOVE VideoThumbnail OUTSIDE the main component
function VideoThumbnail({
  video,
  getVideoUrl,
}: {
  video: any;
  getVideoUrl: (v: any) => string;
}) {
  const [status, setStatus] = useState<
    "loading" | "image" | "video" | "fallback"
  >("loading");
  const videoRef = useRef<HTMLVideoElement>(null);

  // ✅ FIXED: Proper thumbnail URL construction with memoization
  const thumbnailUrl = useMemo(() => {
    if (video.thumbnail && !video.thumbnail.includes("undefined")) {
      return video.thumbnail;
    }
    if (video.thumbnailfilename) {
      return `https://youtube-clone-project-production.up.railway.app/uploads/thumbnails/${video.thumbnailfilename}`;
    }
    return null;
  }, [video.thumbnail, video.thumbnailfilename]);

  // ✅ Get video URL for fallback
  const videoUrl = useMemo(() => getVideoUrl(video), [video, getVideoUrl]);

  useEffect(() => {
    setStatus("loading");

    if (thumbnailUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        console.log("✅ Thumbnail loaded:", video.videotitle);
        setStatus("image");
      };

      img.onerror = () => {
        console.log("❌ Thumbnail failed, trying video:", video.videotitle);
        setStatus("video");
      };

      img.src = thumbnailUrl;
    } else {
      console.log("⚠️ No thumbnail, using video:", video.videotitle);
      setStatus("video");
    }
  }, [video._id, thumbnailUrl, video.videotitle]);

  // Thumbnail image
  if (status === "image" && thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={video.videotitle || "Video thumbnail"}
        className="w-full h-full object-cover"
        crossOrigin="anonymous"
      />
    );
  }

  // Video element for thumbnail
  if (status === "loading" || status === "video") {
    return (
      <>
        {videoUrl && (
          <video
            ref={videoRef}
            src={`${videoUrl}#t=1`}
            className="w-full h-full object-cover relative z-10"
            preload="metadata"
            muted
            playsInline
            crossOrigin="anonymous"
            style={{ backgroundColor: "transparent" }}
            onLoadedData={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = 1;
              }
            }}
            onSeeked={() => {
              console.log("✅ Video thumbnail loaded:", video.videotitle);
              setStatus("video");
            }}
            onError={(e) => {
              console.log("❌ Video thumbnail error:", video.videotitle, e);
              setStatus("fallback");
            }}
          />
        )}
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-zinc-800 dark:to-zinc-900">
            <div className="w-6 h-6 border-2 border-amber-500/50 border-t-amber-500 rounded-full animate-spin" />
          </div>
        )}
      </>
    );
  }

  // Fallback placeholder
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 dark:from-amber-900/30 dark:via-orange-900/20 dark:to-rose-900/30 backdrop-blur-sm">
      <div className="text-center text-gray-700 dark:text-gray-200">
        <Play className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-1 opacity-70 drop-shadow-lg" />
        <p className="text-[10px] md:text-xs font-medium px-2 line-clamp-2">
          {video.videotitle?.slice(0, 25) || "Video"}
        </p>
      </div>
    </div>
  );
}

export default function WatchLaterContent() {
  const [watchLater, setWatchLater] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

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
      loadWatchLater();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadWatchLater = async () => {
    if (!user) return;

    try {
      const response = await axiosInstance.get(`/watch/${user._id}`);
      const validVideos = response.data.filter(
        (item: any) => item.videoid != null
      );

      // ✅ ADD THIS DEBUG LOG
      console.log("🔍 Raw video data from backend:", validVideos[0]?.videoid);
      console.log("📹 Video filename:", validVideos[0]?.videoid?.videofilename);
      console.log("📁 Video filepath:", validVideos[0]?.videoid?.filepath);
      console.log("🖼️ Thumbnail:", validVideos[0]?.videoid?.thumbnail);
      console.log(
        "🖼️ Thumbnail filename:",
        validVideos[0]?.videoid?.thumbnailfilename
      );

      setWatchLater(validVideos);
    } catch (error) {
      console.error("Error loading watch later:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (watchLater.length > 0) {
      console.log(
        "🔍 Video Data Debug:",
        watchLater.map((item) => ({
          title: item.videoid?.videotitle,
          videofilename: item.videoid?.videofilename,
          filepath: item.videoid?.filepath,
          thumbnail: item.videoid?.thumbnail,
          thumbnailfilename: item.videoid?.thumbnailfilename,
        }))
      );
    }
  }, [watchLater]);

  const handleRemoveFromWatchLater = async (
    videoId: string,
    watchLaterId: string
  ) => {
    if (!user) return;

    try {
      await axiosInstance.post(`/watch/${videoId}`, { userId: user._id });
      setWatchLater(watchLater.filter((item) => item._id !== watchLaterId));
    } catch (error) {
      console.error("Error removing from watch later:", error);
    }
  };

  const getVideoUrl = (video: any) => {
    console.log("🎬 Getting video URL for:", video.videotitle);
    console.log("   videofilename:", video.videofilename);
    console.log("   filepath:", video.filepath);

    // ✅ Check for full URLs first (Cloudinary, Supabase, etc.)
    if (video?.filepath?.startsWith("http")) {
      console.log("   ✅ Using full URL from filepath");
      return video.filepath;
    }

    if (video?.videoLink?.startsWith("http")) {
      console.log("   ✅ Using full URL from videoLink");
      return video.videoLink;
    }

    // ✅ Handle local files
    if (video?.videofilename) {
      const filename = video.videofilename.split(/[\\/]/).pop();
      const url = `https://youtube-clone-project-production.up.railway.app/uploads/videos/${filename}`;
      console.log("   ✅ Built URL from filename:", url);
      return url;
    }

    if (video?.filepath) {
      const filename = video.filepath.split(/[\\/]/).pop();
      const url = `https://youtube-clone-project-production.up.railway.app/uploads/videos/${filename}`;
      console.log("   ✅ Built URL from filepath:", url);
      return url;
    }

    console.log("   ❌ No valid video source found!");
    return "";
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md px-4">
          {/* Premium Glass Card */}
          <div className="relative p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-zinc-700/50 shadow-2xl shadow-black/5 dark:shadow-black/30">
            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-rose-400/20 to-pink-500/20 rounded-full blur-2xl"></div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/10 dark:shadow-amber-500/5 ring-1 ring-amber-200/50 dark:ring-amber-700/30">
                <Clock className="w-12 h-12 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white tracking-tight">
                Save videos for later
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Sign in to access your exclusive Watch Later collection.
              </p>
              <Link href="/login">
                <Button className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:via-orange-600 hover:to-rose-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
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
            <div className="animate-spin rounded-full h-20 w-20 border-[3px] border-transparent border-t-amber-500 border-r-amber-400 mx-auto mb-6 shadow-lg shadow-amber-500/20"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-20 w-20 border border-amber-500/30 mx-auto opacity-75"></div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium tracking-wide text-sm uppercase">
            Loading your collection...
          </p>
        </div>
      </div>
    );
  }

  if (watchLater.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md px-4">
          {/* Premium Empty State Card */}
          <div className="relative p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-zinc-700/50 shadow-2xl shadow-black/5 dark:shadow-black/30">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-slate-400/10 to-gray-500/10 rounded-full blur-2xl"></div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-slate-100 to-gray-100 dark:from-zinc-800 dark:to-zinc-900 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5 shadow-inner ring-1 ring-gray-200/50 dark:ring-zinc-700/50">
                <Clock className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white tracking-tight">
                No videos saved
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                Videos you save for later will appear in your personal collection.
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
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-orange-500/20">
            <BookmarkCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Watch Later
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {watchLater.length} {watchLater.length === 1 ? "video" : "videos"} saved
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Header - Premium */}
      <div className="hidden md:block max-w-7xl mx-auto px-6 pt-8 pb-6">
        <div className="relative p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-rose-900/20 border border-amber-200/30 dark:border-amber-800/30 backdrop-blur-sm overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-400/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-rose-400/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 shadow-xl shadow-orange-500/25">
              <BookmarkCheck className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                Watch Later
                <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-sm">
                  {watchLater.length}
                </span>
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                Your personal curated collection
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 md:pb-10 w-full overflow-x-hidden">
        <div className="space-y-3 md:space-y-4">
          {watchLater.map((item, index) => {
            if (!item.videoid) return null;
            const video = item.videoid;

            return (
              <div 
                key={item._id} 
                className="mb-2 md:mb-3"
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 0.5s ease-out forwards',
                  opacity: 0
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
                <div className="flex gap-3 md:gap-4 bg-white/60 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-800/80 p-2.5 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 relative group border border-gray-200/40 dark:border-zinc-800/60 hover:border-amber-300/50 dark:hover:border-amber-700/50 shadow-sm hover:shadow-lg hover:shadow-amber-500/5 dark:hover:shadow-amber-500/5 backdrop-blur-sm">
                  {/* Premium Index Badge */}
                  <div className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-700 dark:to-zinc-800 rounded-lg items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 shadow-sm ring-1 ring-gray-200/50 dark:ring-zinc-600/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    {index + 1}
                  </div>

                  {/* Thumbnail */}
                  <Link href={`/watch/${video._id}`} className="flex-shrink-0">
                    <div className="video-thumbnail-container w-[140px] h-[78px] md:w-[260px] md:h-[146px] bg-gradient-to-br from-slate-200 to-slate-300 dark:from-zinc-800 dark:to-zinc-900 rounded-lg md:rounded-xl overflow-hidden relative ring-1 ring-black/5 dark:ring-white/5 shadow-md group-hover:shadow-xl transition-shadow duration-300">
                      <video
                        src={getVideoUrl(video)}
                        className="w-full h-full object-cover relative z-10"
                        preload="metadata"
                        style={{ backgroundColor: "transparent" }}
                      />
                      {/* Premium Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center z-20">
                        <div className="transform scale-75 group-hover:scale-100 transition-transform duration-300">
                          <div className="p-3 md:p-4 rounded-full bg-white/90 dark:bg-zinc-900/90 shadow-2xl ring-1 ring-black/10">
                            <Play
                              className="w-6 h-6 md:w-8 md:h-8 text-amber-600 dark:text-amber-500"
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
                        <h3 className="font-semibold text-sm md:text-base line-clamp-2 text-gray-900 dark:text-white leading-snug pr-8 md:pr-10 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                          {video.videotitle || "Untitled Video"}
                        </h3>

                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 line-clamp-1 font-medium">
                          {video.videochanel || "Unknown Channel"}
                        </p>

                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                          <span className="font-medium">
                            {(video.views || 0).toLocaleString()} views
                          </span>
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <span className="hidden sm:inline">
                            {video.createdAt
                              ? formatTimeAgo(video.createdAt)
                              : "Recently uploaded"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] md:text-xs font-medium">
                              Added {formatTimeAgo(item.createdAt)}
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
                            handleRemoveFromWatchLater(video._id, item._id)
                          }
                          className="text-rose-600 dark:text-rose-400 focus:text-rose-700 dark:focus:text-rose-300 focus:bg-rose-50 dark:focus:bg-rose-900/20 cursor-pointer rounded-lg font-medium"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove from Watch Later
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Premium Footer */}
        <div className="mt-8 md:mt-12 text-center pb-4">
          <p className="text-xs text-gray-400 dark:text-gray-600 font-medium tracking-wide">
            {watchLater.length} {watchLater.length === 1 ? "video" : "videos"} in your collection
          </p>
        </div>
      </div>
    </div>
  );
}
