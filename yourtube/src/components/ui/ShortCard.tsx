  // src/components/ui/ShortCard.tsx - FINAL FIXED VERSION
  import React from 'react';
  import Link from 'next/link';
  import { Play, Eye } from 'lucide-react';
  import { getShortAvatar, getShortChannelName, formatViewCount } from '@/lib/imageUtils';

  interface ShortCardProps {
    short: {
      _id: string;
      title: string;
      thumbnailUrl: string;
      views: number;
      channelName?: string;
      channelAvatar?: string | null;
      userId?: {
        _id: string;
        name: string;
        avatar?: string | null;
        image?: string | null;
        channelName?: string;
        channelname?: string;
      };
    };
  }

  const DEFAULT_THUMBNAIL = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 356" fill="%23333"%3E%3Crect width="200" height="356" fill="%23222"/%3E%3Cpath d="M80 160l40 28-40 28z" fill="%23666"/%3E%3C/svg%3E';

  const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';

  const ShortCard: React.FC<ShortCardProps> = ({ short }) => {
    // ✅ Use centralized utility functions
    const channelAvatar = getShortAvatar(short);
    const channelName = getShortChannelName(short);
    const viewCount = formatViewCount(short.views);

    const getThumbnailUrl = (): string => {
      const thumbnail = short.thumbnailUrl;
      if (!thumbnail || thumbnail.includes('placeholder')) {
        return DEFAULT_THUMBNAIL;
      }
      return thumbnail;
    };

    return (
      <Link href={`/shorts/${short._id}`}>
        <div className="group/short cursor-pointer short-card-wrapper">
          {/* Thumbnail */}
          <div className="relative w-full aspect-[9/16] rounded-xl overflow-hidden mb-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] transition-transform duration-300 group-hover/short:scale-105">
            <img
              src={getThumbnailUrl()}
              alt={short.title}
              className="w-full h-full object-cover"
              onError={(e) => { 
                e.currentTarget.src = DEFAULT_THUMBNAIL; 
              }}
            />
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/short:opacity-100 transition-opacity duration-300 lg:flex items-center justify-center hidden">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                <Play size={32} className="text-white" fill="white" />
              </div>
            </div>

            {/* Views Badge */}
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1">
              <Eye size={12} className="text-white" />
              <span className="text-white text-xs font-semibold">
                {viewCount}
              </span>
            </div>

            {/* Shorts Badge */}
            <div className="absolute top-2 right-2 bg-red-600 rounded px-2 py-1">
              <span className="text-white text-xs font-bold">Shorts</span>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-2 px-1">
            {/* Title */}
            <h3 
              className="font-semibold line-clamp-2 text-sm leading-snug mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              {short.title}
            </h3>
            
            {/* Avatar + Channel Name */}
            <div className="flex items-center gap-2">
            // REPLACE the avatar img (around line 85):
<img
  key={`card-${short._id}-${Date.now()}`}
  src={channelAvatar}
  alt={channelName}
  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
  style={{ 
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-tertiary)',
    display: 'block !important',
    visibility: 'visible',
    opacity: 1,
    minWidth: '24px',
    minHeight: '24px'
  }}
  crossOrigin="anonymous"
  loading="eager"
  onError={(e) => {
    e.currentTarget.src = DEFAULT_AVATAR;
    e.currentTarget.style.display = 'block';
  }}
  onLoad={(e) => {
    e.currentTarget.style.display = 'block';
  }}
/>
              
              <span 
                className="text-xs line-clamp-1 font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                {channelName}
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  export default ShortCard;