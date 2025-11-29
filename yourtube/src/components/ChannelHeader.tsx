// src/components/ChannelHeader.tsx - COMPLETE FIXED VERSION
import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Video, Camera, Edit2 } from "lucide-react";
import { initializeSocket } from "@/lib/socket";
import SubscribeButton from "./SubscribeButton";
import EditChannelModal from "./EditChannelModal";
import { getImageUrl } from "@/lib/imageUtils";

interface ChannelHeaderProps {
  channel: any;
  user: any;
  onStartCall?: () => void;
  isInitiatingCall?: boolean;
  callError?: string | null;
  onAvatarUpdate?: () => void;
}

const ChannelHeader: React.FC<ChannelHeaderProps> = ({ 
  channel, 
  user, 
  onStartCall,
  isInitiatingCall = false,
  callError = null, 
  onAvatarUpdate,
}) => {
  const [localSubscriberCount, setLocalSubscriberCount] = useState<number>(() => {
    const count = channel?.subscribers;
    return typeof count === 'number' ? count : 0;
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [localChannel, setLocalChannel] = useState(channel);
  const [imageKey, setImageKey] = useState(Date.now());

  useEffect(() => {
    if (user?._id) {
      try {
        initializeSocket(user._id);
      } catch (error) {
        console.error('❌ Socket error:', error);
      }
    }
  }, [user?._id]);

  useEffect(() => {
    if (channel?.subscribers !== undefined) {
      const count = typeof channel.subscribers === 'number' ? channel.subscribers : 0;
      setLocalSubscriberCount(count);
    }
  }, [channel?.subscribers]);

  useEffect(() => {
    setLocalChannel(channel);
    setImageKey(Date.now());
  }, [channel]);

  const handleSubscriptionChange = (isSubscribed: boolean, count: number) => {
    setLocalSubscriberCount(count);
  };

  // ✅ CONSOLIDATED AVATAR UPDATE HANDLER
  const handleAvatarUpdateEvent = () => {
    console.log('🔄 Avatar update event received');
    setImageKey(Date.now());
    // Trigger parent refresh for shorts/other components
    if (onAvatarUpdate) {
      console.log('📢 Calling onAvatarUpdate callback');
      onAvatarUpdate();
    }
  };

  // ✅ LISTEN FOR AVATAR UPDATE EVENTS
  useEffect(() => {
    window.addEventListener('avatarUpdated', handleAvatarUpdateEvent);
    return () => window.removeEventListener('avatarUpdated', handleAvatarUpdateEvent);
  }, [onAvatarUpdate]); // Include dependency to keep callback fresh

  // ✅ HANDLE IMAGE UPDATES FROM MODAL
  const handleImageUpdate = (type: 'avatar' | 'banner', newUrl: string) => {
    console.log('🔄 Image update:', type, newUrl);
    
    setLocalChannel((prev: any) => {
      const updated = {
        ...prev,
        [type === 'avatar' ? 'image' : 'bannerImage']: newUrl
      };
      
      // Update user in localStorage if it's the current user's channel
      if (user && user._id === prev._id) {
        const updatedUser = { 
          ...user, 
          [type === 'avatar' ? 'image' : 'bannerImage']: newUrl 
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Dispatch event for other components to listen
        window.dispatchEvent(new Event('avatarUpdated'));
        
        // ✅ TRIGGER CALLBACK IMMEDIATELY FOR AVATAR CHANGES
        if (type === 'avatar' && onAvatarUpdate) {
          console.log('📢 Avatar changed, triggering immediate refresh...');
          setTimeout(() => onAvatarUpdate(), 100); // Small delay to ensure state updates
        }
      }
      
      return updated;
    });
    
    // Force image refresh
    setImageKey(Date.now());
  };

  const isOwnChannel = user?._id === localChannel._id;
  const displayName = localChannel.channelname || localChannel.name || 'Unknown Channel';
  const displayImage = getImageUrl(localChannel.image, true);
  const displayBanner = getImageUrl(localChannel.bannerImage, true);
  const displayHandle = displayName.toLowerCase().replace(/\s+/g, "");

  return (
    <div className="w-full bg-white dark:bg-gray-900">
      {/* ============================================================ */}
      {/* BANNER - Responsive with Edit Button */}
      {/* ============================================================ */}
      <div className="relative w-full h-32 sm:h-40 md:h-48 lg:h-56 xl:h-64 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 overflow-hidden group">
        {localChannel.bannerImage ? (
          <img 
            key={`banner-${imageKey}`}
            src={displayBanner}
            alt="Channel Banner" 
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('❌ Banner error');
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,rgba(255,255,255,0.3),rgba(255,255,255,0))]"></div>
          </div>
        )}
        
        {isOwnChannel && (
          <button
            onClick={() => setShowEditModal(true)}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/70 hover:bg-black/90 text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-xs sm:text-sm backdrop-blur-sm shadow-lg font-medium"
          >
            <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Edit Banner</span>
            <span className="sm:hidden">Edit</span>
          </button>
        )}
        
        <div className="absolute bottom-0 left-0 right-0 h-16 sm:h-20 bg-gradient-to-t from-white dark:from-gray-900 to-transparent"></div>
      </div>

      {/* ============================================================ */}
      {/* CHANNEL INFO CONTAINER */}
      {/* ============================================================ */}
      <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
        
        {/* ========================================== */}
        {/* MOBILE LAYOUT (< md breakpoint) */}
        {/* ========================================== */}
        <div className="md:hidden">
          <div className="flex items-start gap-4 mb-4">
            <div className="relative flex-shrink-0">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white dark:border-gray-900 shadow-xl ring-2 ring-gray-200 dark:ring-gray-700">
                <AvatarImage 
                  key={`mobile-avatar-${imageKey}`}
                  src={displayImage}
                  alt={displayName}
                />
                <AvatarFallback className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {displayName[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              {isOwnChannel && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-2 rounded-full shadow-lg transition-all ring-2 ring-white dark:ring-gray-900"
                  aria-label="Edit channel avatar"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate mb-1.5 leading-tight">
                {displayName}
              </h1>
              
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  @{displayHandle}
                </span>
                {localSubscriberCount > 0 && (
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {localSubscriberCount.toLocaleString()} subscriber{localSubscriberCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {localChannel.description && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-3 leading-relaxed">
              {localChannel.description}
            </p>
          )}

          {user && !isOwnChannel && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <SubscribeButton 
                    channelId={localChannel._id}
                    initialSubscriberCount={localSubscriberCount}
                    onSubscriptionChange={handleSubscriptionChange}
                  />
                </div>

                {onStartCall && (
                  <Button
                    onClick={onStartCall}
                    disabled={isInitiatingCall}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white disabled:bg-gray-400 disabled:cursor-not-allowed dark:disabled:bg-gray-600 rounded-full shadow-md h-10 text-sm font-semibold transition-all"
                  >
                    <Video className="w-4 h-4" />
                    <span>{isInitiatingCall ? 'Calling...' : 'Call'}</span>
                  </Button>
                )}
              </div>

              {callError && (
                <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800 shadow-sm">
                  {callError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================== */}
        {/* DESKTOP LAYOUT (>= md breakpoint) */}
        {/* ========================================== */}
        <div className="hidden md:flex gap-6 items-start justify-between">
          <div className="flex gap-6 items-start flex-1">
            <div className="relative flex-shrink-0">
              <Avatar className="w-32 h-32 lg:w-36 lg:h-36 xl:w-40 xl:h-40 border-4 border-white dark:border-gray-900 shadow-2xl ring-4 ring-gray-200 dark:ring-gray-700">
                <AvatarImage 
                  key={`desktop-avatar-${imageKey}`}
                  src={displayImage}
                  alt={displayName}
                />
                <AvatarFallback className="text-4xl lg:text-5xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {displayName[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              {isOwnChannel && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-2.5 lg:p-3 rounded-full shadow-lg transition-all ring-2 ring-white dark:ring-gray-900"
                  aria-label="Edit channel avatar"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex-1 space-y-3 pt-2">
              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                {displayName}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-base text-gray-600 dark:text-gray-400">
                <span className="font-medium">@{displayHandle}</span>
                {localSubscriberCount > 0 && (
                  <>
                    <span className="text-gray-400 dark:text-gray-600">•</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {localSubscriberCount.toLocaleString()} subscribers
                    </span>
                  </>
                )}
              </div>
              
              {localChannel.description && (
                <p className="text-base text-gray-700 dark:text-gray-300 max-w-3xl leading-relaxed">
                  {localChannel.description}
                </p>
              )}
            </div>
          </div>

          {user && !isOwnChannel && (
            <div className="flex flex-col gap-3 items-end pt-2">
              <div className="flex gap-3">
                <SubscribeButton 
                  channelId={localChannel._id}
                  initialSubscriberCount={localSubscriberCount}
                  onSubscriptionChange={handleSubscriptionChange}
                />

                {onStartCall && (
                  <Button
                    onClick={onStartCall}
                    disabled={isInitiatingCall}
                    className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white disabled:bg-gray-400 disabled:cursor-not-allowed dark:disabled:bg-gray-600 rounded-full flex items-center gap-2 font-semibold shadow-md px-6 h-10 transition-all"
                  >
                    <Video className="w-5 h-5" />
                    {isInitiatingCall ? 'Calling...' : 'Call'}
                  </Button>
                )}
              </div>

              {callError && (
                <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800 shadow-sm max-w-md">
                  {callError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* EDIT MODAL */}
      {/* ============================================================ */}
      {showEditModal && isOwnChannel && (
        <EditChannelModal
          channel={localChannel}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleImageUpdate}
        />
      )}
    </div>
  );
};

export default ChannelHeader;