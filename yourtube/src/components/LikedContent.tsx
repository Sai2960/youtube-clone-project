/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
// Removed date-fns import - using custom format function
import { MoreVertical, X, ThumbsUp, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

export default function LikedVideosContent() {
  const [activeTab, setActiveTab] = useState<string>('All');
  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [likedShorts, setLikedShorts] = useState<any[]>([]);
  const [allLiked, setAllLiked] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  const tabs = ['All', 'Videos', 'Shorts'];

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
      minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
      }
    }
    return 'just now';
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
        const validVideos = response.data.filter((item: any) => item.videoid != null);
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
      await axiosInstance.post(`/like/video/${videoId}`, { userId: user._id });
      setLikedVideos(likedVideos.filter((item) => item._id !== likedVideoId));
      setAllLiked(allLiked.filter((item) => item._id !== likedVideoId));
    } catch (error) {
      console.error("Error unliking video:", error);
    }
  };

  const handleUnlikeShort = async (shortId: string, likedShortId: string) => {
    if (!user) return;

    try {
      await axiosInstance.post(`/like/short/${shortId}`, { userId: user._id });
      setLikedShorts(likedShorts.filter((item) => item._id !== likedShortId));
      setAllLiked(allLiked.filter((item) => item._id !== likedShortId));
    } catch (error) {
      console.error("Error unliking short:", error);
    }
  };

  const getVideoUrl = (video: any) => {
    if (video?.videofilename) {
      return `${"https://youtube-clone-project-q3pd.onrender.com"

/uploads/videos/${video.videofilename}`;
    } else if (video?.filepath) {
      const filename = video.filepath.split(/[\\/]/).pop();
      return `${"https://youtube-clone-project-q3pd.onrender.com"

/uploads/videos/${filename}`;
    }
    return "/video/vdo.mp4";
  };

  const getShortThumbnail = (short: any) => {
    if (short?.thumbnailUrl) {
      if (short.thumbnailUrl.startsWith('http')) {
        return short.thumbnailUrl;
      }
      return short.thumbnailUrl;
    }
    return null;
  };

  const getFilteredContent = () => {
    if (activeTab === 'Videos') return likedVideos;
    if (activeTab === 'Shorts') return likedShorts;
    return allLiked;
  };

  const filteredContent = getFilteredContent();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md px-4">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <ThumbsUp className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
            Keep track of videos you like
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Sign in to see your liked videos and shorts.
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
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading liked content...</p>
        </div>
      </div>
    );
  }

  if (filteredContent.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ThumbsUp className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            No liked {activeTab.toLowerCase()} yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {activeTab === 'All' ? 'Videos and shorts' : activeTab} you like will appear here.
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
          Liked {activeTab.toLowerCase()}
        </h1>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {filteredContent.length} {filteredContent.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block max-w-7xl mx-auto px-6 pt-6 pb-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Liked {activeTab.toLowerCase()}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {filteredContent.length} {filteredContent.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 md:pb-6 w-full overflow-x-hidden">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 py-2">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all flex-shrink-0 ${
                activeTab === tab
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
                  : 'bg-gray-100 dark:bg-[#272727] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#3f3f3f]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Shorts Section - MOBILE FIXED */}
          {(activeTab === 'All' || activeTab === 'Shorts') && likedShorts.length > 0 && (
            <div className="pb-6 border-b border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <Play className="text-red-600 w-5 h-5" fill="currentColor" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Liked Shorts</h2>
              </div>
              
              {/* ✅ MOBILE-OPTIMIZED SCROLL CONTAINER */}
              <div className="w-full shorts-scroll-container">
                <div className="flex gap-3 pb-2 min-w-min overflow-x-auto scrollbar-hide">
                  {likedShorts.map(item => {
                    const short = item.shortid;
                    if (!short) return null;

                    return (
                      <div key={item._id} className="flex-shrink-0 w-[160px] md:w-[180px] relative group">
                        <Link href={`/shorts/${short._id}`} className="block">
                          <div className="aspect-[9/16] bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden relative">
                            {getShortThumbnail(short) ? (
                              <img
                                src={getShortThumbnail(short)}
                                alt={short.title || "Short"}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : short.videoUrl ? (
                              <video
                                src={short.videoUrl}
                                className="w-full h-full object-cover"
                                preload="metadata"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
                                <Play className="w-12 h-12" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          </div>
                        </Link>
                        
                        <div className="mt-2 px-1">
                          <h3 className="text-sm font-medium line-clamp-2 leading-tight text-gray-900 dark:text-white mb-1">
                            {short.title || "Untitled Short"}
                          </h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {short.views?.toLocaleString() || '0'} views
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
                          className="absolute top-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
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

          {/* Videos Section */}
          {(activeTab === 'All' || activeTab === 'Videos') && likedVideos.length > 0 && (
            <div className="space-y-2">
              {likedVideos.map((item) => {
                if (!item.videoid) return null;
                const video = item.videoid;

                return (
                  <div key={item._id} className="mb-2 md:mb-3">
                    <div className="flex gap-2 md:gap-3 hover:bg-gray-50 dark:hover:bg-[#272727] p-2 rounded-lg transition-colors relative group">
                      {/* Thumbnail */}
                      <Link href={`/watch/${video._id}`} className="flex-shrink-0">
                        <div className="w-[140px] h-[78px] md:w-[246px] md:h-[138px] bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden relative">
                          <video
                            src={getVideoUrl(video)}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <Play className="w-8 h-8 md:w-10 md:h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="white" />
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
                              <span>{(video.views || 0).toLocaleString()} views</span>
                              <span>•</span>
                              <span className="hidden sm:inline">
                                {video.createdAt 
                                  ? formatTimeAgo(video.createdAt)
                                  : "Recently uploaded"}
                              </span>
                            </div>
                            
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              Liked {formatTimeAgo(item.createdAt)}
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
                              onClick={() => handleUnlikeVideo(video._id, item._id)}
                              className="text-red-600 dark:text-red-500 focus:text-red-700 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 cursor-pointer"
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
      </div>
    </div>
  );
}