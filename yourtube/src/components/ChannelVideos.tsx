// src/components/ChannelVideos.tsx - COMPLETE MERGED & FIXED VERSION
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { getImageUrl } from "@/lib/imageUtils";
import DeleteVideoButton from "./DeleteVideoButton";

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

interface ChannelVideosProps {
  videos: Video[];
  onVideoDeleted?: () => void;
  isOwner?: boolean;
}

const ChannelVideos: React.FC<ChannelVideosProps> = ({ 
  videos, 
  onVideoDeleted,
  isOwner = false 
}) => {
  const [localVideos, setLocalVideos] = useState(videos);
  const [imageKeys, setImageKeys] = useState<Record<string, number>>({});

  useEffect(() => {
    setLocalVideos(videos);
  }, [videos]);

  useEffect(() => {
    // Initialize image keys for all uploaders
    const newKeys: Record<string, number> = {};
    localVideos.forEach(video => {
      if (video.uploadedBy?._id) {
        newKeys[video.uploadedBy._id] = Date.now();
      }
    });
    setImageKeys(newKeys);

    // Listen for avatar updates
    const handleAvatarUpdate = () => {
      const updatedKeys: Record<string, number> = {};
      localVideos.forEach(video => {
        if (video.uploadedBy?._id) {
          updatedKeys[video.uploadedBy._id] = Date.now();
        }
      });
      setImageKeys(updatedKeys);
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    return () => window.removeEventListener('avatarUpdated', handleAvatarUpdate);
  }, [localVideos]);

  const getBackendUrl = () => {
  // Always use environment variable
  return process.env.NEXT_PUBLIC_BACKEND_URL || '';
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

  const handleDelete = () => {
    if (onVideoDeleted) {
      onVideoDeleted();
    } else {
      window.location.reload();
    }
  };

  if (!localVideos || localVideos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {isOwner ? "No videos uploaded yet." : "No videos available"}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-4 md:px-0">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Videos
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {localVideos.length} {localVideos.length === 1 ? 'video' : 'videos'}
        </span>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 px-4 md:px-0">
        {localVideos.map((video) => (
          <div key={video._id} className="relative group">
            <Link 
              href={`/watch/${video._id}`}
              className="block"
            >
              {/* Video Thumbnail */}
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 mb-3 shadow-sm hover:shadow-md transition-shadow lg:rounded-xl">
                <video
                  src={getVideoUrl(video)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  preload="metadata"
                  poster={video?.thumbnail}
                />
                {video?.duration && (
                  <div className="absolute bottom-1.5 right-1.5 bg-black/90 dark:bg-black/95 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded">
                    {video.duration}
                  </div>
                )}
              </div>

              {/* Video Info */}
              <div className="flex gap-3">
                {/* Channel Avatar */}
                <Link 
                  href={`/channel/${video.uploadedBy?._id || 'unknown'}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0 mt-0.5"
                >
                  <Avatar className="w-9 h-9 ring-2 ring-transparent hover:ring-blue-500 dark:hover:ring-blue-400 transition-all">
                    <AvatarImage 
                      key={`channel-video-${video._id}-avatar-${imageKeys[video.uploadedBy?._id || ''] || Date.now()}`}
                      src={getImageUrl(video.uploadedBy?.image, true)}
                      alt={video.uploadedBy?.name || video.videochanel || 'Channel'}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm">
                      {(video.uploadedBy?.channelname || video.uploadedBy?.name || video.videochanel)?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-1 text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors lg:text-[15px]">
                    {video?.videotitle || 'Untitled Video'}
                  </h3>
                  
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 font-medium hover:text-gray-900 dark:hover:text-white transition-colors mb-0.5">
                    {video.uploadedBy?.channelname || video.uploadedBy?.name || video?.videochanel || 'Unknown Channel'}
                  </p>
                  
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500 font-medium">
                    <span className="font-semibold">{formatViews(video?.views)}</span>
                    <span className="font-bold">•</span>
                    <span>
                      {video?.createdAt
                        ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })
                        : 'Recently'}
                    </span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Delete Button (Owner Only) */}
            {isOwner && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <DeleteVideoButton
                  videoId={video._id}
                  videoTitle={video.videotitle}
                  onDeleted={handleDelete}
                  variant="button"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChannelVideos;