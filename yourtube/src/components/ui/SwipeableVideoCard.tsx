// src/components/ui/SwipeableVideoCard.tsx
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { Clock, Trash2 } from 'lucide-react';
import { formatViews, formatTimeAgo } from '@/lib/formatUtils';

interface SwipeableVideoCardProps {
  video: any;
  onRemove?: () => void;
  onAddToWatchLater?: () => void;
}

const SwipeableVideoCard: React.FC<SwipeableVideoCardProps> = ({
  video,
  onRemove,
  onAddToWatchLater,
}) => {
  const router = useRouter();
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const getVideoUrl = () => {
    if (video?.videofilename) {
      return `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/videos/${video.videofilename}`;
    } else if (video?.filepath) {
      const filename = video.filepath.split(/[\\/]/).pop();
      return `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/videos/${filename}`;
    }
    return '';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = Math.abs(currentX - startX.current);
    const diffY = Math.abs(currentY - startY.current);

    // Only swipe if horizontal movement is greater
    if (diffX > diffY && diffX > 10) {
      isDragging.current = true;
      setSwiping(true);
      const diff = currentX - startX.current;
      setSwipeX(Math.max(-150, Math.min(150, diff)));
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) {
      if (Math.abs(swipeX) < 10) {
        router.push(`/watch/${video._id}`);
      }
    } else {
      if (swipeX < -75 && onRemove) {
        onRemove();
      } else if (swipeX > 75 && onAddToWatchLater) {
        onAddToWatchLater();
      }
    }
    
    isDragging.current = false;
    setSwiping(false);
    setSwipeX(0);
  };

  return (
    <div className="relative overflow-hidden bg-youtube-primary">
      {/* Background Actions */}
      {swiping && (
        <div className="absolute inset-0 flex justify-between items-center px-4 z-0">
          {swipeX > 0 && (
            <div className="bg-blue-500 text-white p-3 rounded-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">Watch Later</span>
            </div>
          )}
          {swipeX < 0 && (
            <div className="ml-auto bg-red-500 text-white p-3 rounded-lg flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              <span className="text-sm font-medium">Remove</span>
            </div>
          )}
        </div>
      )}

      {/* Video Card */}
      <div
        className="relative bg-youtube-primary z-10"
        style={{ 
          transform: `translateX(${swipeX}px)`,
          transition: swiping ? 'none' : 'transform 0.2s'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex gap-3 p-3 border-b border-youtube">
          <div className="relative w-40 flex-shrink-0">
            <div className="aspect-video rounded-lg overflow-hidden bg-youtube-secondary">
              <video
                src={getVideoUrl()}
                className="w-full h-full object-cover"
                preload="metadata"
              />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm leading-5 line-clamp-2 mb-1 text-youtube-primary">
              {video?.videotitle || 'Untitled Video'}
            </h3>
            
            <p className="text-xs text-youtube-secondary line-clamp-1 mb-1">
              {video?.videochanel || 'Unknown Channel'}
            </p>
            
            <div className="flex items-center gap-1 text-xs text-youtube-secondary">
              <span>{formatViews(video?.views || 0)}</span>
              <span>•</span>
              <span>{video?.createdAt ? formatTimeAgo(video.createdAt) : 'Recently'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwipeableVideoCard;