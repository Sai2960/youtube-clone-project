// src/components/videocard.tsx - FIXED WITH AVATAR IMAGE
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useRouter } from "next/router";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { formatViews, formatTimeAgo } from "@/lib/formatUtils";
import { getImageUrl } from "@/lib/imageUtils";
import { useState, useEffect } from "react";

const videos = "/video/vdo.mp4";

export default function VideoCard({ video }: any) {
  const router = useRouter();
  const [imageKey, setImageKey] = useState(Date.now());

  // Listen for avatar updates
  useEffect(() => {
    const handleUpdate = () => {
      setImageKey(Date.now());
    };

    window.addEventListener('avatarUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    
    return () => {
      window.removeEventListener('avatarUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const getVideoUrl = () => {
    if (video?.videofilename) {
      return `https://youtube-clone-project-q3pd.onrender.com/uploads/videos/${
video.videofilename}`;
    } else if (video?.filepath) {
      const filename = video.filepath.split(/[\\/]/).pop();
      return `https://youtube-clone-project-q3pd.onrender.com/uploads/videos/${
filename}`;
    }
    return videos;
  };

  const handleChannelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const channelId = video?.uploadedBy?._id || video?.uploadedBy;
    if (channelId) {
      console.log("📺 Navigating to channel from card:", channelId);
      router.push(`/channel/${channelId}`);
    }
  };

  // Get channel image - check multiple possible sources
  const channelImage = video?.uploadedBy?.image || 
                       video?.videoowner?.image || 
                       video?.channelImage;
  
  const channelImageUrl = getImageUrl(channelImage, true);

  return (
    <Link href={`/watch/${video?._id}`} className="block group cursor-pointer">
      <div className="w-full">
        {/* Thumbnail Container */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-youtube-secondary mb-3">
          <video
            src={getVideoUrl()}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            preload="metadata"
            poster={video?.thumbnail}
            onError={(e) => {
              const target = e.target as HTMLVideoElement;
              target.style.display = 'none';
            }}
          />
          {video?.duration && (
            <div className="absolute bottom-1.5 right-1.5 bg-black bg-opacity-90 text-white text-xs font-semibold px-1.5 py-0.5 rounded">
              {video.duration}
            </div>
          )}
        </div>

        {/* Video Info Section */}
        <div className="flex gap-3">
          {/* ✅ Clickable Channel Avatar WITH IMAGE */}
          <div 
            onClick={handleChannelClick}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Avatar className="w-9 h-9 flex-shrink-0 mt-0.5 ring-2 ring-transparent hover:ring-blue-500 transition-all">
              <AvatarImage 
                key={`video-avatar-${imageKey}`}
                src={channelImageUrl}
                alt={video?.videochanel || 'Channel'}
              />
              <AvatarFallback className="bg-youtube-hover text-youtube-primary text-sm font-medium">
                {video?.videochanel?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Text Content */}
          <div className="flex-1 min-w-0">
            {/* Video Title */}
            <h3 className="font-medium text-sm leading-5 line-clamp-2 mb-1 text-youtube-primary group-hover:text-primary transition-colors">
              {video?.videotitle || 'Untitled Video'}
            </h3>
            
            {/* ✅ Clickable Channel Name */}
            <p 
              onClick={handleChannelClick}
              className="text-xs text-youtube-secondary hover:text-youtube-primary transition-colors cursor-pointer line-clamp-1 w-fit"
            >
              {video?.videochanel || 'Unknown Channel'}
            </p>
            
            {/* Video Stats */}
            <div className="flex items-center gap-1 text-xs text-youtube-secondary">
              <span>{formatViews(video?.views || 0)}</span>
              <span>•</span>
              <span>
                {video?.createdAt 
                  ? formatTimeAgo(video.createdAt)
                  : 'Recently uploaded'
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}