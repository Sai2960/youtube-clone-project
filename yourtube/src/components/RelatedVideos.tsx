// src/components/RelatedVideos.tsx - COMPLETE FIXED VERSION WITH AVATAR FIX
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

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

interface RelatedVideosProps {
  videos: Video[];
}

const RelatedVideos: React.FC<RelatedVideosProps> = ({ videos }) => {
  const [imageKeys, setImageKeys] = useState<Record<string, number>>({});

  // ✅ Get dynamic backend URL
  const getBackendUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return `http://${hostname}:5000`;
      }
    }
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://${process.env.NEXT_PUBLIC_BACKEND_URL||"https://youtube-clone-project-q3pd.onrender.com"}';
  };

  useEffect(() => {
    const newKeys: Record<string, number> = {};
    videos.forEach(video => {
      if (video.uploadedBy?._id) {
        newKeys[video.uploadedBy._id] = Date.now();
      }
    });
    setImageKeys(newKeys);

    const handleAvatarUpdate = () => {
      const updatedKeys: Record<string, number> = {};
      videos.forEach(video => {
        if (video.uploadedBy?._id) {
          updatedKeys[video.uploadedBy._id] = Date.now();
        }
      });
      setImageKeys(updatedKeys);
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    return () => window.removeEventListener('avatarUpdated', handleAvatarUpdate);
  }, [videos]);

  // ✅ CRITICAL FIX: Get avatar URL with correct channel-images path
  const getAvatarUrl = (uploadedBy?: any): string => {
    const backend = getBackendUrl();
    const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';
    
    if (!uploadedBy?.image) {
      console.log('⚠️ No image provided, using default');
      return defaultAvatar;
    }

    const image = uploadedBy.image;
    console.log('🖼️ Processing avatar:', image);

    // If already a full URL (Google OAuth, Facebook, etc.)
    if (image.startsWith('http://') || image.startsWith('https://')) {
      console.log('✅ External URL:', image);
      return image;
    }

    // If starts with /uploads, it has the full path
    if (image.startsWith('/uploads/')) {
      const fullUrl = `${backend}${image}`;
      console.log('✅ Full path avatar:', fullUrl);
      return fullUrl;
    }

    // ⚠️ CRITICAL: Default to channel-images directory (your backend uses this!)
    const avatarUrl = `${backend}/uploads/channel-images/${image}`;
    console.log('✅ Constructed avatar URL:', avatarUrl);
    return avatarUrl;
  };

  const getVideoUrl = (video: Video) => {
    const backend = getBackendUrl();
    
    if (video?.videofilename) {
      return `${backend}/uploads/videos/${video.videofilename}`;
    } else if (video?.filepath) {
      const filename = video.filepath.split(/[\\/]/).pop();
      return `${backend}/uploads/videos/${filename}`;
    }
    return '/video/vdo.mp4';
  };

  const formatViews = (views?: number): string => {
    if (!views) return "0 views";
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views} views`;
  };

  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="text-sm">No related videos available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-6 md:pb-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 px-3 md:px-0 pt-3 md:pt-0 pb-2">
        <div className="w-1 h-5 bg-blue-600 dark:bg-blue-500 rounded-full" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Related Videos
        </h2>
      </div>

      {/* Video List */}
      <div className="space-y-2">
        {videos.slice(0, 20).map((video) => {
          const avatarUrl = getAvatarUrl(video.uploadedBy);
          const channelName = video.uploadedBy?.channelname || video.uploadedBy?.name || video?.videochanel || 'Unknown Channel';
          const channelInitial = channelName[0]?.toUpperCase() || 'U';

          return (
            <Link
              key={video._id}
              href={`/watch/${video._id}`}
              className="flex gap-2 md:gap-3 px-3 md:px-0 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors group"
            >
              {/* Thumbnail */}
              <div className="relative w-[140px] sm:w-[160px] md:w-[168px] h-[79px] sm:h-[90px] md:h-[94px] bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden flex-shrink-0 shadow-md dark:shadow-gray-900/50">
                <video
                  src={getVideoUrl(video)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  preload="metadata"
                  poster={video?.thumbnail}
                />
                <div className="absolute bottom-1.5 right-1.5 bg-black/90 dark:bg-black/95 backdrop-blur-sm text-white text-[11px] font-bold px-1.5 py-0.5 rounded">
                  {video?.duration || '10:24'}
                </div>
              </div>

              {/* Video Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                {/* Title */}
                <h3 className="font-medium text-[14px] md:text-sm leading-[1.4] line-clamp-2 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">
                  {video?.videotitle || 'Untitled Video'}
                </h3>
                
                {/* Channel info with avatar - CRITICAL FIX: Using native img instead of Avatar component */}
                <Link 
                  href={`/channel/${video.uploadedBy?._id || 'unknown'}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 mb-1 group/channel"
                >
                  {/* ⚠️ CRITICAL: Native img tag with fallback background */}
                  <div className="relative w-5 h-5 flex-shrink-0 rounded-full overflow-hidden ring-2 ring-transparent group-hover/channel:ring-blue-500 dark:group-hover/channel:ring-blue-400 transition-all">
                    {/* Fallback gradient background */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white text-[9px] font-semibold">
                      {channelInitial}
                    </div>
                    {/* Avatar image overlays on top */}
                    <img
                      key={`avatar-${video._id}-${imageKeys[video.uploadedBy?._id || ''] || Date.now()}`}
                      src={avatarUrl}
                      alt={channelName}
                      className="absolute inset-0 w-full h-full object-cover z-10"
                      onError={(e) => {
                        console.error('❌ Avatar failed to load:', avatarUrl);
                        // Hide the img on error, showing the fallback behind it
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                      onLoad={() => {
                        console.log('✅ Avatar loaded successfully:', avatarUrl);
                      }}
                    />
                  </div>
                  
                  <p className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors truncate">
                    {channelName}
                  </p>
                </Link>
                
                {/* Views and date */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400">
                  <span className="font-medium">
                    {formatViews(video?.views)}
                  </span>
                  <span>•</span>
                  <span>
                    {video?.createdAt
                      ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })
                      : 'Recently'}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom spacing for mobile navigation */}
      <div className="h-20 md:h-0" />
    </div>
  );
};

export default RelatedVideos;