/* eslint-disable react-hooks/exhaustive-deps */
// src/components/ChannelHeader.tsx - MERGED ULTIMATE VERSION
import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Video,
  Camera,
  Edit2,
  Crown,
  Sparkles,
  BadgeCheck,
  Users,
  Diamond,
} from "lucide-react";
import { initializeSocket } from "@/lib/socket";
import SubscribeButton from "./SubscribeButton";
import EditChannelModal from "./EditChannelModal";
import { getImageUrl } from "@/lib/imageUtils";

const DEFAULT_AVATAR =
  process.env.NEXT_PUBLIC_DEFAULT_AVATAR || "/images/default-avatar.png";

// ============================================================================
// PREMIUM LUXURY STYLES FOR CHANNEL HEADER
// ============================================================================
const headerStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800&display=swap');

  @keyframes shimmer-gold {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes float-gentle {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-4px); }
  }
  
  @keyframes pulse-gold {
    0%, 100% { 
      box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
    }
    50% { 
      box-shadow: 0 0 40px rgba(212, 175, 55, 0.5);
    }
  }
  
  @keyframes border-glow {
    0%, 100% { 
      border-color: rgba(212, 175, 55, 0.4);
      box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);
    }
    50% { 
      border-color: rgba(212, 175, 55, 0.8);
      box-shadow: 0 0 30px rgba(212, 175, 55, 0.4);
    }
  }
  
  @keyframes text-shimmer {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  
  .header-luxury-font {
    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
  }
  
  .header-body-font {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  
  .header-accent-font {
    font-family: 'Outfit', 'Inter', sans-serif;
  }
  
  .header-shimmer {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(212, 175, 55, 0.1) 25%,
      rgba(255, 255, 255, 0.2) 50%,
      rgba(212, 175, 55, 0.1) 75%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: shimmer-gold 3s infinite;
  }
  
  .header-text-gradient {
    background: linear-gradient(
      135deg, 
      #D4AF37 0%, 
      #F4E4BA 25%, 
      #D4AF37 50%, 
      #A67C00 75%, 
      #D4AF37 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: text-shimmer 4s linear infinite;
  }
  
  .header-glass {
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.08) 0%,
      rgba(255, 255, 255, 0.02) 100%
    );
  }
  
  .header-avatar-ring {
    animation: border-glow 3s ease-in-out infinite;
  }
  
  .header-premium-button {
    position: relative;
    overflow: hidden;
  }
  
  .header-premium-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
    );
    transition: left 0.5s;
  }
  
  .header-premium-button:hover::before {
    left: 100%;
  }
`;

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
  const [localSubscriberCount, setLocalSubscriberCount] = useState<number>(
    () => {
      const count = channel?.subscribers;
      return typeof count === "number" ? count : 0;
    },
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [localChannel, setLocalChannel] = useState(channel);
  const [imageKey, setImageKey] = useState(Date.now());

  useEffect(() => {
    if (user?._id) {
      try {
        initializeSocket(user._id);
      } catch (error) {
        console.error("❌ Socket error:", error);
      }
    }
  }, [user?._id]);

  useEffect(() => {
    if (channel?.subscribers !== undefined) {
      const count =
        typeof channel.subscribers === "number" ? channel.subscribers : 0;
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

  const handleAvatarUpdateEvent = () => {
    console.log("🔄 Avatar update event received");
    setImageKey(Date.now());
    if (onAvatarUpdate) {
      console.log("📢 Calling onAvatarUpdate callback");
      onAvatarUpdate();
    }
  };

  useEffect(() => {
    window.addEventListener("avatarUpdated", handleAvatarUpdateEvent);
    return () =>
      window.removeEventListener("avatarUpdated", handleAvatarUpdateEvent);
  }, [onAvatarUpdate]);

  const handleImageUpdate = (type: "avatar" | "banner" | "info", data: any) => {
    console.log("🔄 Channel update:", type, data);

    setLocalChannel((prev: any) => {
      let updated = { ...prev };

      if (type === "avatar") {
        updated.image = data;
      } else if (type === "banner") {
        updated.bannerImage = data;
      } else if (type === "info") {
        updated.channelname = data.channelname;
        updated.description = data.description;
      }

      if (user && user._id === prev._id) {
        const updatedUser = { ...user, ...updated };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        window.dispatchEvent(new Event("avatarUpdated"));

        if (type === "avatar" && onAvatarUpdate) {
          setTimeout(() => onAvatarUpdate(), 100);
        }
      }

      return updated;
    });

    setImageKey(Date.now());
  };

  const isOwnChannel = user?._id === localChannel._id;
  const displayName =
    localChannel.channelname || localChannel.name || "Unknown Channel";
  const displayImage = getImageUrl(localChannel.image, true);
  const displayBanner = getImageUrl(localChannel.bannerImage, true);
  const displayHandle = displayName.toLowerCase().replace(/\s+/g, "");
  return (
    <>
      <style jsx global>
        {headerStyles}
      </style>

      <div className="w-full bg-white dark:bg-gray-900">
        {/* ========================================== */}
        {/* BANNER - PURE IMAGE ONLY (NO OVERLAYS)    */}
        {/* ========================================== */}
        <div className="relative w-full h-40 sm:h-48 md:h-64 lg:h-80 xl:h-96 2xl:h-[28rem] overflow-hidden group">
          {localChannel.bannerImage ? (
            <img
              key={`banner-${imageKey}`}
              src={displayBanner}
              alt="Channel Banner"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error("❌ Banner error");
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
          )}

          {/* Edit button - only visible on hover (desktop) */}
          {isOwnChannel && (
            <button
              onClick={() => setShowEditModal(true)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-black/70 hover:bg-black/90 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2 text-xs sm:text-sm font-medium backdrop-blur-sm z-10"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Edit banner</span>
            </button>
          )}
        </div>

        {/* Channel Info */}
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 bg-white dark:bg-gray-900">
          {/* MOBILE LAYOUT */}
          <div className="md:hidden">
            <div className="flex items-start gap-4 mb-4">
              <div className="relative flex-shrink-0">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-white dark:border-gray-900 shadow-2xl ring-4 ring-gray-200/80 dark:ring-gray-700/80 bg-white dark:bg-gray-800 header-avatar-ring">
                  <AvatarImage
                    key={`mobile-avatar-${imageKey}`}
                    src={displayImage}
                    alt={displayName}
                  />
                  <AvatarFallback className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 text-white header-luxury-font">
                    {displayName[0]?.toUpperCase() || "U"}
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

              <div className="flex-1 min-w-0 pt-0.5">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate mb-1.5 leading-tight header-luxury-font">
                  {displayName}
                </h1>

                <div className="flex flex-col gap-1 header-body-font">
                  <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    @{displayHandle}
                  </span>
                  {localSubscriberCount > 0 && (
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {localSubscriberCount.toLocaleString()} subscriber
                      {localSubscriberCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {localChannel.description && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-3 leading-relaxed header-body-font">
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
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white disabled:bg-gray-400 disabled:cursor-not-allowed dark:disabled:bg-gray-600 rounded-full shadow-md h-10 text-sm font-semibold transition-all header-premium-button header-accent-font"
                    >
                      <Video className="w-4 h-4" />
                      <span>{isInitiatingCall ? "Calling..." : "Call"}</span>
                    </Button>
                  )}
                </div>

                {callError && (
                  <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800 shadow-sm header-body-font">
                    {callError}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* DESKTOP LAYOUT */}
          <div className="hidden md:flex gap-6 items-start justify-between">
            <div className="flex gap-6 items-start flex-1">
              <div className="relative flex-shrink-0">
                <Avatar className="w-32 h-32 lg:w-36 lg:h-36 xl:w-40 xl:h-40 border-4 border-white dark:border-gray-900 shadow-2xl ring-4 ring-gray-200/80 dark:ring-gray-700/80 bg-white dark:bg-gray-800 header-avatar-ring">
                  <AvatarImage
                    key={`desktop-avatar-${imageKey}`}
                    src={displayImage}
                    alt={displayName}
                  />
                  <AvatarFallback className="text-4xl lg:text-5xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 text-white header-luxury-font">
                    {displayName[0]?.toUpperCase() || "U"}
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
                <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-white leading-tight header-luxury-font">
                  {displayName}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-base text-gray-600 dark:text-gray-400 header-body-font">
                  <span className="font-medium">@{displayHandle}</span>
                  {localSubscriberCount > 0 && (
                    <>
                      <span className="text-gray-400 dark:text-gray-600">
                        •
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {localSubscriberCount.toLocaleString()} subscribers
                      </span>
                    </>
                  )}
                </div>

                {localChannel.description && (
                  <p className="text-base text-gray-700 dark:text-gray-300 max-w-3xl leading-relaxed header-body-font">
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
                      className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white disabled:bg-gray-400 disabled:cursor-not-allowed dark:disabled:bg-gray-600 rounded-full flex items-center gap-2 font-semibold shadow-md px-6 h-10 transition-all header-premium-button header-accent-font"
                    >
                      <Video className="w-5 h-5" />
                      {isInitiatingCall ? "Calling..." : "Call"}
                    </Button>
                  )}
                </div>

                {callError && (
                  <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800 shadow-sm max-w-md header-body-font">
                    {callError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* EDIT MODAL */}
        {showEditModal && isOwnChannel && (
          <EditChannelModal
            channel={localChannel}
            onClose={() => setShowEditModal(false)}
            onUpdate={handleImageUpdate}
          />
        )}
      </div>
    </>
  );
};

export default ChannelHeader;
