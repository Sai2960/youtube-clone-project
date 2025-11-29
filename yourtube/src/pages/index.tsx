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
import { getImageUrl, getShortAvatar, getShortChannelName } from "@/lib/imageUtils";

interface Video {
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
    _id: string;
    name: string;
    channelName?: string;
    image?: string;
    avatar?: string;
  };
}

// Dynamic API URL based on hostname
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:5000`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://192.168.0.181:5000';
};

// Dynamic backend URL based on hostname
const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:5000`;
    }
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.0.181:5000';
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

    // Listen for avatar updates
    const handleAvatarUpdate = () => {
      const newKeys: Record<string, number> = {};
      videos.forEach(video => {
        if (video.uploadedBy?._id) {
          newKeys[video.uploadedBy._id] = Date.now();
        }
      });
      setImageKeys(newKeys);
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    return () => window.removeEventListener('avatarUpdated', handleAvatarUpdate);
  }, []);

  const fetchVideos = async () => {
    try {
      setLoadingVideos(true);
      console.log('📹 Fetching videos...');
      
      const res = await axiosInstance.get("/video/getall");
      
      if (res.data.success && Array.isArray(res.data.videos)) {
        setVideos(res.data.videos);
        console.log('✅ Loaded', res.data.videos.length, 'videos');
        
        // Initialize image keys
        const newKeys: Record<string, number> = {};
        res.data.videos.forEach((video: Video) => {
          if (video.uploadedBy?._id) {
            newKeys[video.uploadedBy._id] = Date.now();
          }
        });
        setImageKeys(newKeys);
      } else {
        console.warn('⚠️ Unexpected video response format:', res.data);
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
      console.log('🎬 Fetching shorts...');
      
      const response = await axiosInstance.get('/api/shorts', {
        params: { limit: 20 }
      });
      
      if (response.data.success && Array.isArray(response.data.data)) {
        setShorts(response.data.data);
        console.log('✅ Loaded', response.data.data.length, 'shorts');
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
    const container = containerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart as any);
      container.addEventListener('touchmove', handleTouchMove as any);
      container.addEventListener('touchend', handleTouchEnd);

      return () => {
        container.removeEventListener('touchstart', handleTouchStart as any);
        container.removeEventListener('touchmove', handleTouchMove as any);
        container.removeEventListener('touchend', handleTouchEnd);
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
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
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
        return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
      }
    }
    return 'Just now';
  };

// REPLACE lines 54-68 (the getVideoUrl function) with:
const getVideoUrl = (video: Video) => {
  const backend = 'https://youtube-clone-project-q3pd.onrender.com';
  
  if (video?.videofilename) {
    return `${backend}/uploads/videos/${video.videofilename}`;
  } else if (video?.filepath) {
    // Clean filepath
    let path = video.filepath;
    path = path.replace(/https?:\/\/[^/]+/, ''); // Remove any domain
    const filename = path.split(/[\\/]/).pop();
    return `${backend}/uploads/videos/${filename}`;
  }
  return '/video/vdo.mp4';
};

  const scrollShorts = (direction: 'left' | 'right') => {
    if (shortsScrollRef.current) {
      const scrollAmount = 300;
      shortsScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
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
        behavior: 'smooth'
      });
    }
    
    touchStartX.current = 0;
    touchEndX.current = 0;
    isDragging.current = false;
  };

  const handleShortClick = (e: React.MouseEvent, shortId: string, index: number) => {
    if (isDragging.current) {
      e.preventDefault();
      return;
    }
    
    e.preventDefault();
    router.push({
      pathname: '/shorts',
      query: { start: index.toString() }
    });
  };

  return (
    <>
      <Head>
        <title>YourTube - Home</title>
      </Head>
      
      <div ref={containerRef} className="w-full bg-white dark:bg-gray-900 min-h-screen pb-16 lg:pb-0">
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Shorts Section */}
        {shorts.length > 0 && (
          <section className="py-3 border-b-8 border-gray-100 dark:border-gray-800 lg:border-b lg:border-gray-200 dark:lg:border-gray-700 lg:py-6">
            <div className="flex items-center justify-between px-3 mb-3 lg:px-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center lg:hidden shadow-md">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-red-600">
                    <path d="M10 14.65v-5.3L15 12l-5 2.65zm7.77-4.33c-.77-.32-1.2-.5-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94c-1.29.68-2.07 2.04-2 3.49.07 1.42.93 2.67 2.22 3.25.03.01 1.2.5 1.2.5L6 14.93c-1.83.97-2.53 3.24-1.56 5.07.97 1.83 3.24 2.53 5.07 1.56l8.5-4.5c1.29-.68 2.06-2.04 1.99-3.49-.07-1.42-.94-2.68-2.23-3.25z"/>
                  </svg>
                </div>
                <div className="hidden lg:flex w-10 h-10 bg-red-600 rounded-xl items-center justify-center shadow-lg shadow-red-600/30">
                  <Play size={20} className="text-white ml-0.5" fill="white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white lg:text-2xl">Shorts</h2>
              </div>
            </div>

            {loadingShorts ? (
              <div className="flex gap-2 overflow-x-hidden px-3 lg:gap-4 lg:px-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[120px] lg:w-[200px]">
                    <div className="aspect-[9/16] bg-gray-200 dark:bg-gray-800 rounded-xl skeleton mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded skeleton mb-1 lg:h-4" />
                    <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded skeleton w-2/3 lg:h-3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative group/container">
                <button
                  onClick={() => scrollShorts('left')}
                  className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full items-center justify-center opacity-0 group-hover/container:opacity-100 transition-opacity shadow-xl"
                  aria-label="Scroll left"
                >
                  <ChevronRight size={24} className="rotate-180 text-gray-900 dark:text-white" />
                </button>
                
                <button
                  onClick={() => scrollShorts('right')}
                  className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full items-center justify-center opacity-0 group-hover/container:opacity-100 transition-opacity shadow-xl"
                  aria-label="Scroll right"
                >
                  <ChevronRight size={24} className="text-gray-900 dark:text-white" />
                </button>

                <div 
                  ref={shortsScrollRef}
                  className="flex gap-2 px-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2 lg:gap-4 lg:px-6"
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
                          // Only navigate to shorts if not clicking avatar/channel
                          if (!(e.target as HTMLElement).closest('.avatar-link')) {
                            handleShortClick(e, short._id, index);
                          }
                        }}
                        className="flex-shrink-0 w-[120px] cursor-pointer group/short lg:w-[200px]"
                      >
                        <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 mb-2 border border-transparent lg:border-gray-200 dark:lg:border-gray-700">
                          <img
                            src={short.thumbnailUrl}
                            alt={short.title}
                            className="w-full h-full object-cover group-hover/short:scale-110 transition-transform duration-500"
                            loading="lazy"
                          />
                          
                          <div className="hidden lg:flex absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/short:opacity-100 transition-all duration-300 items-center justify-center">
                            <div className="bg-white/30 backdrop-blur-sm rounded-full p-4 transform scale-75 group-hover/short:scale-100 transition-transform duration-300">
                              <Play size={32} className="text-white" fill="white" />
                            </div>
                          </div>

                          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none lg:hidden" />

                          <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm rounded px-1.5 py-0.5 text-[11px] font-bold text-white lg:rounded-lg lg:px-3 lg:py-1.5 lg:bottom-3 lg:left-3">
                            {formatViewsShort(short.views)} views
                          </div>
                        </div>

                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1.5 leading-tight lg:text-[15px] lg:group-hover/short:text-red-500 lg:transition-colors lg:leading-snug">
                          {short.title}
                        </h3>
                        
                        {/* ✅ FIXED: Avatar + Channel Name - NO NESTED LINKS */}
                        <div className="flex items-center gap-1.5">
                        <img
  key={`short-${short._id}-${Date.now()}`}
  src={shortAvatar}
  alt={shortChannelName}
  className="avatar-link w-5 h-5 rounded-full object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
  crossOrigin="anonymous"
  loading="eager"
  style={{ 
    display: 'block !important',
    visibility: 'visible',
    opacity: 1,
    minWidth: '20px',
    minHeight: '20px'
  }}
  onClick={(e) => {
    e.stopPropagation();
    router.push(`/channel/${short.userId?._id}`);
  }}
  onError={(e) => {
    console.error('❌ Avatar failed:', shortAvatar);
    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';
    e.currentTarget.style.display = 'block';
  }}
  onLoad={(e) => {
    e.currentTarget.style.display = 'block';
  }}
/>
                          <p 
                            className="avatar-link text-xs text-gray-600 dark:text-gray-400 line-clamp-1 font-medium lg:group-hover/short:text-gray-900 dark:lg:group-hover/short:text-white lg:transition-colors flex-1 min-w-0 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/channel/${short.userId?._id}`);
                            }}
                          >
                            {shortChannelName}
                          </p>
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
        const channelName = video.uploadedBy?.channelname || video.uploadedBy?.name || video?.videochanel || 'Unknown Channel';
        const channelInitial = channelName[0]?.toUpperCase() || 'U';
        
        return (
          <div key={video._id} className="block group">
            {/* Video Thumbnail */}
            <Link href={`/watch/${video._id}`} className="block mb-3">
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 lg:rounded-xl shadow-sm">
                <video
                  src={getVideoUrl(video)}
                  className="w-full h-full object-cover lg:group-hover:scale-105 lg:transition-transform lg:duration-200"
                  preload="metadata"
                  poster={video?.thumbnail}
                />
                {video?.duration && (
                  <div className="absolute bottom-1.5 right-1.5 bg-black/90 text-white text-[11px] font-bold px-1.5 py-0.5 rounded lg:px-2">
                    {video.duration}
                  </div>
                )}
              </div>
            </Link>

            {/* Video Info - FIXED MOBILE LAYOUT */}
            <div className="flex gap-2.5">
              {/* Avatar - Always Visible */}
              <div 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/channel/${video.uploadedBy?._id || 'unknown'}`);
                }}
                className="flex-shrink-0 cursor-pointer"
              >
                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-transparent hover:ring-blue-500 transition-all">
                  {/* Fallback Initial */}
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                    {channelInitial}
                  </div>
                  
                  {/* Avatar Image */}
                  <img
                    key={`video-avatar-${video._id}-${imageKeys[video.uploadedBy?._id || ''] || Date.now()}`}
                    src={getImageUrl(video.uploadedBy?.image, true)}
                    alt={channelName}
                    className="absolute inset-0 w-full h-full object-cover"
                    crossOrigin="anonymous"
                    loading="eager"
                    style={{ 
                      display: 'block',
                      visibility: 'visible',
                      opacity: 1,
                      zIndex: 10
                    }}
                    onError={(e) => {
                      console.error('❌ Video avatar failed');
                      const target = e.currentTarget as HTMLImageElement;
                      target.style.opacity = '0';
                      target.style.zIndex = '1';
                    }}
                    onLoad={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.style.opacity = '1';
                      target.style.zIndex = '10';
                    }}
                  />
                </div>
              </div>
              
              {/* Text Info */}
              <div className="flex-1 min-w-0">
                <Link href={`/watch/${video._id}`}>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 mb-1 leading-tight lg:text-[15px] lg:leading-snug lg:group-hover:text-blue-600 dark:lg:group-hover:text-blue-400 lg:transition-colors">
                    {video?.videotitle || 'Untitled Video'}
                  </h3>
                </Link>
                
                <p 
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`/channel/${video.uploadedBy?._id || 'unknown'}`);
                  }}
                  className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 mb-0.5 font-medium hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  {channelName}
                </p>
                
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-500 lg:text-xs font-medium">
                  <span className="font-semibold">{formatViews(video?.views)}</span>
                  <span className="font-bold">•</span>
                  <span>{formatTimeAgo(video?.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <div className="text-center py-12">
      <p className="text-gray-500 dark:text-gray-400">No videos available</p>
    </div>
  )}
</section>

        {/* More Videos Section */}
        {videos.length > 12 && (
          <section className="hidden lg:block px-6 pb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">More Videos</h2>
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
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        preload="metadata"
                        poster={video?.thumbnail}
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
                          router.push(`/channel/${video.uploadedBy?._id || 'unknown'}`);
                        }}
                        className="flex-shrink-0 mt-0.5 cursor-pointer"
                      >
                        <Avatar className="w-9 h-9 ring-2 ring-transparent hover:ring-blue-500 transition-all">
                          <AvatarImage 
                            key={`more-video-${video._id}-avatar-${imageKeys[video.uploadedBy?._id || ''] || Date.now()}`}
                            src={getImageUrl(video.uploadedBy?.image, true)}
                            alt={video.uploadedBy?.name || video.videochanel || 'Channel'}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm">
                            {(video.uploadedBy?.channelname || video.uploadedBy?.name || video.videochanel)?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 mb-1 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {video?.videotitle || 'Untitled Video'}
                        </h3>
                        
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 font-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                          {video.uploadedBy?.channelname || video.uploadedBy?.name || video?.videochanel || 'Unknown Channel'}
                        </p>
                        
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500 font-medium">
                          <span className="font-semibold">{formatViews(video?.views)}</span>
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
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
};

export default Home;