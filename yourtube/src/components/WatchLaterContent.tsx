/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { MoreVertical, X, Clock, Play } from "lucide-react";
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
            className="w-full h-full object-cover bg-gray-200 dark:bg-gray-800"
            preload="metadata"
            muted
            playsInline
            crossOrigin="anonymous"
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
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-800">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </>
    );
  }

  // Fallback placeholder
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-600/30 dark:from-red-900/40 dark:to-red-800/50">
      <div className="text-center text-gray-700 dark:text-gray-200">
        <Play className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-1 opacity-70" />
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
          <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
            Save videos for later
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Sign in to access your Watch later playlist.
          </p>
          <Link href="/login">
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700 border-t-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            Loading watch later...
          </p>
        </div>
      </div>
    );
  }

  if (watchLater.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Clock className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            No videos saved
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Videos you save for later will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white dark:bg-[#0f0f0f] overflow-x-hidden">
      {/* Mobile Header */}
      <div className="md:hidden px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
          Watch later
        </h1>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {watchLater.length} {watchLater.length === 1 ? "video" : "videos"}
        </p>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block max-w-7xl mx-auto px-6 pt-6 pb-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Watch later
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {watchLater.length} {watchLater.length === 1 ? "video" : "videos"}
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 md:pb-6 w-full overflow-x-hidden">
        <div className="space-y-2">
          {watchLater.map((item) => {
            if (!item.videoid) return null;
            const video = item.videoid;

            return (
              <div key={item._id} className="mb-2 md:mb-3">
                <div className="flex gap-2 md:gap-3 hover:bg-gray-50 dark:hover:bg-[#272727] p-2 rounded-lg transition-colors relative group">
                  {/* Thumbnail */}
                  <Link href={`/watch/${video._id}`} className="flex-shrink-0">
                    <div className="w-[140px] h-[78px] md:w-[246px] md:h-[138px] rounded-lg overflow-hidden relative bg-gray-200 dark:bg-gray-800">
                      <VideoThumbnail video={video} getVideoUrl={getVideoUrl} />

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 dark:group-hover:bg-black/30 transition-colors flex items-center justify-center z-20 pointer-events-none">
                        <Play
                          className="w-8 h-8 md:w-10 md:h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"
                          fill="white"
                        />
                      </div>
                    </div>
                  </Link>

                  {/* Video Info */}
                  <div className="flex-1 min-w-0 flex flex-col py-0.5 md:py-1">
                    <Link href={`/watch/${video._id}`} className="flex-1">
                      <div className="space-y-0.5 md:space-y-1">
                        <h3 className="font-medium text-sm md:text-base line-clamp-2 text-gray-900 dark:text-white leading-tight pr-6 md:pr-8">
                          {video.videotitle || "Untitled Video"}
                        </h3>

                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                          {video.videochanel || "Unknown Channel"}
                        </p>

                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <span>
                            {(video.views || 0).toLocaleString()} views
                          </span>
                          <span>•</span>
                          <span className="hidden sm:inline">
                            {video.createdAt
                              ? formatTimeAgo(video.createdAt)
                              : "Recently uploaded"}
                          </span>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Added {formatTimeAgo(item.createdAt)}
                        </p>
                      </div>
                    </Link>
                  </div>

                  {/* Menu Button */}
                  <div className="absolute top-1 right-1 md:top-2 md:right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56 bg-white dark:bg-[#282828] border-gray-200 dark:border-gray-700"
                      >
                        <DropdownMenuItem
                          onClick={() =>
                            handleRemoveFromWatchLater(video._id, item._id)
                          }
                          className="text-red-600 dark:text-red-500 focus:text-red-700 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove from Watch later
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
