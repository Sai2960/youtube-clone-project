/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/channel/[id]/index.tsx - PREMIUM DELUXE VERSION

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import ChannelHeader from "@/components/ChannelHeader";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { getSocket, isSocketConnected } from "@/lib/socket";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageUrl } from "@/lib/imageUtils";
import { 
  Calendar, Video, Upload, Play, Film, Grid, User, 
  Sparkles, Crown, Star, Zap, Eye, Clock, TrendingUp,
  CheckCircle2, Diamond, Award, Flame
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { GetServerSideProps } from "next";

// ============================================================================
// PREMIUM ANIMATIONS CSS (Add to your globals.css or include inline)
// ============================================================================
const premiumStyles = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
    50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.6); }
  }
  
  @keyframes gradient-shift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  
  @keyframes border-dance {
    0%, 100% { border-color: rgba(139, 92, 246, 0.5); }
    25% { border-color: rgba(236, 72, 153, 0.5); }
    50% { border-color: rgba(59, 130, 246, 0.5); }
    75% { border-color: rgba(16, 185, 129, 0.5); }
  }
  
  @keyframes sparkle {
    0%, 100% { opacity: 0; transform: scale(0); }
    50% { opacity: 1; transform: scale(1); }
  }
  
  .premium-shimmer {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }
  
  .premium-float {
    animation: float 3s ease-in-out infinite;
  }
  
  .premium-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }
  
  .premium-gradient {
    background-size: 200% 200%;
    animation: gradient-shift 3s ease infinite;
  }
  
  .premium-border {
    animation: border-dance 4s ease infinite;
  }
  
  .glass-effect {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  
  .dark .glass-effect {
    background: rgba(0, 0, 0, 0.3);
  }
  
  .premium-card {
    position: relative;
    overflow: hidden;
  }
  
  .premium-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    transition: left 0.5s;
  }
  
  .premium-card:hover::before {
    left: 100%;
  }
  
  .luxury-shadow {
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06),
      0 20px 25px -5px rgba(139, 92, 246, 0.1),
      0 10px 10px -5px rgba(139, 92, 246, 0.04);
  }
  
  .dark .luxury-shadow {
    box-shadow: 
      0 4px 6px -1px rgba(0, 0, 0, 0.3),
      0 2px 4px -1px rgba(0, 0, 0, 0.2),
      0 20px 25px -5px rgba(139, 92, 246, 0.2),
      0 10px 10px -5px rgba(139, 92, 246, 0.1);
  }
  
  .golden-glow {
    box-shadow: 0 0 30px rgba(251, 191, 36, 0.3);
  }
  
  .premium-text-gradient {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .golden-text {
    background: linear-gradient(135deg, #f6d365 0%, #fda085 50%, #f6d365 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

// ============================================================================
// THUMBNAIL HELPER
// ============================================================================
const getShortThumbnail = (short: any): string => {
  const thumbnailCandidates = [
    short.thumbnailUrl,
    short.thumbnail,
    short.videothumbnail,
    short.videothumb,
  ];

  for (const thumb of thumbnailCandidates) {
    if (thumb && typeof thumb === "string" && thumb.startsWith("http")) {
      return thumb;
    }
  }

  if (short.videoUrl && typeof short.videoUrl === "string") {
    if (short.videoUrl.includes("supabase.co") || short.videoUrl.includes("supabase.in")) {
      return short.videoUrl;
    }
  }

  return "fallback";
};

const getShortVideoUrl = (short: any): string => {
  if (!short?.videoUrl) return "";
  if (short.videoUrl.startsWith("http")) return short.videoUrl;
  return short.videoUrl;
};

// ============================================================================
// PREMIUM STAT CARD COMPONENT
// ============================================================================
const PremiumStatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  gradient, 
  delay = 0 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  gradient: string;
  delay?: number;
}) => (
  <div 
    className="premium-card group relative rounded-2xl p-4 sm:p-5 transition-all duration-500 hover:scale-105 luxury-shadow"
    style={{ 
      background: gradient,
      animationDelay: `${delay}ms`
    }}
  >
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    
    <div className="relative z-10 flex items-center gap-3 sm:gap-4">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
      </div>
      <div>
        <p className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wider">{label}</p>
        <p className="text-white text-xl sm:text-2xl font-bold">{value}</p>
      </div>
    </div>
    
    {/* Sparkle effects */}
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
      <Sparkles className="w-4 h-4 text-white/60 animate-pulse" />
    </div>
  </div>
);

// ============================================================================
// PREMIUM VIDEO CARD COMPONENT
// ============================================================================
const PremiumVideoCard = ({ video, router, index }: { video: any; router: any; index: number }) => {
  const getVideoThumbnail = (video: any): string => {
    const explicitThumbnail = video?.thumbnailUrl || video?.thumbnail || video?.videothumbnail || video?.videothumb;
    if (explicitThumbnail?.startsWith("http")) return explicitThumbnail;
    
    const videoUrl = video?.filepath || video?.videofile || video?.videoLink;
    if (videoUrl?.includes("supabase.co")) return videoUrl;
    
    if (videoUrl?.includes("cloudinary.com") && videoUrl.includes("/video/upload/")) {
      try {
        const match = videoUrl.match(/https:\/\/res\.cloudinary\.com\/([^/]+)\/video\/upload\/(.+)/);
        if (match) {
          const cloudName = match[1];
          let publicId = match[2];
          publicId = publicId.split("/").filter((segment: string) => !segment.match(/^(f_|vc_|ac_|af_|br_|q_|w_|h_|c_|so_|t_)/)).join("/");
          publicId = publicId.replace(/\.(mp4|mov|avi|mkv|webm)$/i, "");
          return `https://res.cloudinary.com/${cloudName}/video/upload/so_0,w_640,h_360,c_fill,q_auto:good/${publicId}.jpg`;
        }
      } catch (error) {
        console.error("Thumbnail generation error:", error);
      }
    }
    return "/placeholder-thumbnail.jpg";
  };

  const channelName = video.uploadedBy?.channelname || video.uploadedBy?.name || video?.videochanel || "Unknown Channel";

  return (
    <div
      onClick={() => router.push(`/watch/${video._id}`)}
      className="group cursor-pointer premium-card rounded-2xl overflow-hidden transition-all duration-500 hover:scale-[1.02] luxury-shadow bg-white dark:bg-gray-900/80 border border-gray-100 dark:border-gray-800/50"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Thumbnail Container */}
      <div className="relative w-full aspect-video overflow-hidden">
        {/* Premium overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-all duration-500">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 dark:bg-gray-900/95 flex items-center justify-center shadow-2xl transform scale-50 group-hover:scale-100 transition-transform duration-500">
            <Play className="w-8 h-8 sm:w-10 sm:h-10 text-violet-600 dark:text-violet-400 ml-1" fill="currentColor" />
          </div>
        </div>
        
        {/* Thumbnail */}
        {getVideoThumbnail(video).includes("supabase.co") ? (
          <img
            src={getVideoThumbnail(video)}
            alt={video?.videotitle || "Video thumbnail"}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            loading="lazy"
          />
        ) : (
          <video
            src={getVideoThumbnail(video)}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            preload="metadata"
            muted
            playsInline
          />
        )}
        
        {/* Duration badge */}
        {video?.duration && (
          <div className="absolute bottom-3 right-3 z-20 bg-black/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {video.duration}
          </div>
        )}
        
        {/* Premium badge for high view videos */}
        {video.views > 1000 && (
          <div className="absolute top-3 left-3 z-20 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
            <Flame className="w-3 h-3" />
            Trending
          </div>
        )}
      </div>
      
      {/* Video Info */}
      <div className="p-4 sm:p-5">
        <div className="flex gap-3 sm:gap-4">
          {/* Channel Avatar */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/channel/${video.uploadedBy?._id}`);
            }}
            className="flex-shrink-0"
          >
            <div className="relative">
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12 ring-2 ring-violet-500/30 group-hover:ring-violet-500 transition-all duration-500">
                <AvatarImage src={getImageUrl(video.uploadedBy?.image, true)} alt={channelName} />
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold">
                  {channelName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Verified badge */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors duration-300">
              {video?.videotitle || "Untitled Video"}
            </h3>
            
            <p
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/channel/${video.uploadedBy?._id}`);
              }}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 mb-2 cursor-pointer font-medium transition-colors"
            >
              {channelName}
            </p>
            
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {(video.views || 0).toLocaleString()} views
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-400" />
              <span>
                {video.createdAt ? new Date(video.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "Recently"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PREMIUM SHORT CARD COMPONENT
// ============================================================================
const PremiumShortCard = ({ short, router, channel, index }: { short: any; router: any; channel: any; index: number }) => {
  const thumbnailUrl = getShortThumbnail(short);
  const videoUrl = getShortVideoUrl(short);

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        const shortId = short._id || short.id;
        if (shortId) router.push(`/shorts?id=${shortId}`);
      }}
      className="group cursor-pointer transform transition-all duration-500 hover:scale-[1.03] active:scale-95"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Thumbnail Container */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden luxury-shadow">
        {/* Gradient border effect */}
        <div className="absolute inset-0 rounded-2xl sm:rounded-3xl p-[2px] bg-gradient-to-br from-rose-500 via-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0">
          <div className="absolute inset-[2px] rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-900" />
        </div>
        
        <div 
          className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl"
          style={{ paddingBottom: "177.78%" }}
        >
          {/* Background gradient */}
          <div 
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)"
            }}
          />
          
          {/* Media content */}
          {thumbnailUrl && thumbnailUrl !== "fallback" && thumbnailUrl.startsWith("http") ? (
            <img
              src={thumbnailUrl}
              alt={short.title || "Short"}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out z-10"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : videoUrl && videoUrl.startsWith("http") ? (
            <video
              src={videoUrl}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out z-10"
              preload="metadata"
              muted
              playsInline
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center p-4">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-10 h-10 text-white ml-1" fill="white" />
                </div>
                <p className="text-white font-bold tracking-wider">SHORT</p>
              </div>
            </div>
          )}
          
          {/* Gradient overlay */}
          <div 
            className="absolute inset-x-0 bottom-0 h-32 sm:h-40 z-20 pointer-events-none"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.5), transparent)"
            }}
          />
          
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-all duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-30" />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 flex items-center justify-center shadow-2xl transform scale-50 group-hover:scale-100 transition-transform duration-500">
                <Play className="w-8 h-8 sm:w-10 sm:h-10 text-rose-500 ml-1" fill="currentColor" />
              </div>
            </div>
          </div>
          
          {/* Views badge */}
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-30 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            {(short.views || 0).toLocaleString()}
          </div>
          
          {/* Duration badge */}
          {short.duration && (
            <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-30 bg-rose-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full">
              {short.duration}s
            </div>
          )}
          
          {/* Premium indicator */}
          <div className="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Crown className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Title & Channel Info */}
      <div className="mt-3 sm:mt-4 px-1">
        <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors duration-300">
          {short.title}
        </h3>
        
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-rose-500/30 group-hover:ring-rose-500 transition-all duration-300"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const channelId = short.userId?._id || short.userId || channel?._id;
              if (channelId) router.push(`/channel/${channelId}`);
            }}
          >
            <Avatar className="w-full h-full">
              <AvatarImage
                src={getImageUrl(short.userId?.image || short.userId?.avatar || channel?.image, true)}
                alt={short.userId?.channelName || short.userId?.name || channel?.channelname || "Channel"}
              />
              <AvatarFallback className="bg-gradient-to-br from-rose-500 to-pink-600 text-white text-xs font-bold">
                {(short.userId?.channelName || short.userId?.name || channel?.channelname || "U")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium line-clamp-1 flex-1">
            {short.userId?.channelName || short.userId?.name || channel?.channelname || "Unknown"}
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const ChannelPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, updateUser } = useUser();

  const infoBarRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);

  // State
  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [shorts, setShorts] = useState<any[]>([]);
  const [shortsLoading, setShortsLoading] = useState(false);
  const [shortsError, setShortsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"videos" | "shorts">("videos");
  const [contentTab, setContentTab] = useState<"videos" | "shorts">("videos");
  const [refreshKey, setRefreshKey] = useState(0);
  const [renderKey, setRenderKey] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================
  useEffect(() => {
    isMountedRef.current = true;
    setIsMounted(true);
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    const handleForceRefresh = (event: CustomEvent) => {
      setRefreshKey((prev) => prev + 1);
      setRenderKey((prev) => prev + 1);
    };
    window.addEventListener("forceChannelRefresh", handleForceRefresh as EventListener);
    return () => window.removeEventListener("forceChannelRefresh", handleForceRefresh as EventListener);
  }, []);

  // ============================================================================
  // FETCH CHANNEL DATA
  // ============================================================================
  useEffect(() => {
    const fetchChannel = async () => {
      if (!id || typeof id !== "string") return;
      try {
        setLoading(true);
        const response = await axiosInstance.get(`/auth/channel/${id}`);
        if (response.data.success && response.data.user) {
          const channelData = response.data.user;
          if (typeof channelData.subscribers !== "number") channelData.subscribers = 0;
          setChannel(channelData);
          if (user && user._id === id) {
            const updatedUser = {
              ...user,
              image: channelData.image || user.image,
              bannerImage: channelData.bannerImage || user.bannerImage,
              channelname: channelData.channelname || user.channelname,
              description: channelData.description || user.description,
              subscribers: channelData.subscribers,
            };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            updateUser(updatedUser);
          }
        } else {
          setChannel(null);
        }
      } catch (error) {
        setChannel(null);
      } finally {
        setLoading(false);
      }
    };
    fetchChannel();
  }, [id, user?._id]);

  // ============================================================================
  // FETCH VIDEOS
  // ============================================================================
  useEffect(() => {
    const fetchVideos = async () => {
      if (!id || typeof id !== "string") return;
      try {
        setVideosLoading(true);
        const response = await axiosInstance.get(`/video/channel/${id}`, {
          params: { _t: Date.now(), nocache: "true", mobile: "true" },
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0" },
          transformRequest: [(data, headers) => {
            delete headers["If-None-Match"];
            delete headers["If-Modified-Since"];
            return data;
          }],
        });
        if (response.data.success && Array.isArray(response.data.data)) {
          setVideos(response.data.data);
        } else if (response.data.videos && Array.isArray(response.data.videos)) {
          setVideos(response.data.videos);
        } else {
          setVideos([]);
        }
      } catch (error) {
        setVideos([]);
      } finally {
        setVideosLoading(false);
      }
    };
    const timer = setTimeout(fetchVideos, 150);
    return () => clearTimeout(timer);
  }, [id, refreshKey]);

  // ============================================================================
  // FETCH SHORTS
  // ============================================================================
  useEffect(() => {
    const fetchShorts = async () => {
      if (!id || typeof id !== "string") return;
      try {
        setShortsLoading(true);
        setShortsError(null);
        const response = await axiosInstance.get(`/shorts/channel/${id}`, {
          params: { page: 1, limit: 100, _t: Date.now(), nocache: "true", mobile: "true" },
          headers: { "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0" },
          transformRequest: [(data, headers) => {
            delete headers["If-None-Match"];
            delete headers["If-Modified-Since"];
            return data;
          }],
        });
        if (response.data.success) {
          const fetchedShorts = response.data.data || response.data.shorts || [];
          const processedShorts = fetchedShorts.map((short: any) => ({
            ...short,
            thumbnailUrl: short.thumbnailUrl || short.thumbnail,
            videoUrl: short.videoUrl || short.video,
          }));
          setShorts(processedShorts);
        } else {
          setShorts([]);
        }
      } catch (error: any) {
        if (error.response?.status !== 404) setShortsError("Failed to load shorts");
        setShorts([]);
      } finally {
        setShortsLoading(false);
      }
    };
    const timer = setTimeout(fetchShorts, 200);
    return () => clearTimeout(timer);
  }, [id, refreshKey]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleVideoUploadSuccess = (newVideo: any) => {
    setVideos((prevVideos) => [newVideo, ...prevVideos]);
  };

  const handleStartCall = async () => {
    if (!user) {
      setCallError("Please login to make calls");
      setTimeout(() => setCallError(null), 3000);
      return;
    }
    if (!id || typeof id !== "string") {
      setCallError("Invalid channel ID");
      setTimeout(() => setCallError(null), 3000);
      return;
    }
    if (user._id === id) {
      setCallError("You cannot call yourself!");
      setTimeout(() => setCallError(null), 3000);
      return;
    }
    if (!channel) {
      setCallError("Channel data not loaded");
      setTimeout(() => setCallError(null), 3000);
      return;
    }

    try {
      setIsInitiatingCall(true);
      setCallError(null);
      const remotePersonName = channel.name || channel.channelname || "Unknown User";
      const remotePersonImage = channel.image || "https://github.com/shadcn.png";
      const response = await axiosInstance.post("/call/initiate", { receiverId: id });
      if (!response.data.success) throw new Error(response.data.message || "Failed to initiate call");
      const { call } = response.data;
      if (!isSocketConnected()) throw new Error("Socket not connected. Please refresh the page.");
      const socket = getSocket();
      socket.emit("call-user", {
        userToCall: id,
        from: user._id,
        name: user.name || user.channelname || "User",
        image: user.image || "",
        roomId: call.roomId,
        callId: call._id,
      });
      router.push({
        pathname: `/call/${call.roomId}`,
        query: {
          callId: call._id,
          remoteName: remotePersonName,
          remoteImage: remotePersonImage,
          initiator: "true",
        },
      });
    } catch (error: any) {
      setCallError(error.response?.data?.message || error.message || "Failed to initiate call. Please try again.");
      setTimeout(() => setCallError(null), 5000);
    } finally {
      setIsInitiatingCall(false);
    }
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 animate-spin" />
            <div className="absolute inset-1 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
              <Diamond className="w-8 h-8 text-violet-500 animate-pulse" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading channel...</p>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="text-center p-8">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
            <User className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Channel not found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">This channel doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push("/")}
            className="px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-violet-500/25"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isOwnChannel = user?._id === id;

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <ProtectedRoute requireAuth={true}>
      {/* Inject premium styles */}
      <style jsx global>{premiumStyles}</style>
      
      <div className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#0a0a0f] dark:via-[#0f0f18] dark:to-[#0a0a0f]">
        
        {/* Premium Background Effects */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 dark:bg-violet-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-pink-500/10 dark:bg-pink-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl" />
          
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(139, 92, 246, 0.5) 1px, transparent 1px),
                linear-gradient(90deg, rgba(139, 92, 246, 0.5) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        <div className="relative w-full z-10">
          {/* Channel Header */}
          <ChannelHeader
            channel={channel}
            user={user}
            onStartCall={handleStartCall}
            isInitiatingCall={isInitiatingCall}
            callError={callError}
            onAvatarUpdate={() => setRefreshKey((prev) => prev + 1)}
          />

          {/* ================================================================
              PREMIUM STATS SECTION
              ================================================================ */}
          {channel && isMounted && (
            <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto -mt-8 sm:-mt-12 relative z-20 mb-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {/* Channel Name Card */}
                <PremiumStatCard
                  icon={Crown}
                  label="Channel"
                  value={channel.channelname || channel.name || "Creator"}
                  gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  delay={0}
                />
                
                {/* Joined Date Card */}
                <PremiumStatCard
                  icon={Calendar}
                  label="Member Since"
                  value={channel.joinedon 
                    ? new Date(channel.joinedon).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    : "2024"
                  }
                  gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                  delay={100}
                />
                
                {/* Videos Count Card */}
                <PremiumStatCard
                  icon={Video}
                  label="Videos"
                  value={videos.length}
                  gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
                  delay={200}
                />
                
                {/* Shorts Count Card */}
                <PremiumStatCard
                  icon={Film}
                  label="Shorts"
                  value={shorts.length}
                  gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
                  delay={300}
                />
              </div>
            </div>
          )}

          {/* ================================================================
              PREMIUM UPLOAD SECTION - OWN CHANNEL ONLY
              ================================================================ */}
          {isOwnChannel && (
            <div className="px-4 sm:px-6 lg:px-8 pb-8 max-w-7xl mx-auto">
              <div className="relative premium-card rounded-3xl overflow-hidden">
                {/* Glass effect background */}
                <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl" />
                
                {/* Gradient border */}
                <div className="absolute inset-0 rounded-3xl p-[1px] bg-gradient-to-br from-violet-500/50 via-purple-500/50 to-pink-500/50">
                  <div className="absolute inset-[1px] rounded-3xl bg-white dark:bg-gray-900" />
                </div>
                
                <div className="relative z-10 p-5 sm:p-6 lg:p-8">
                  {/* Upload Tabs */}
                  <div className="flex items-center gap-2 mb-6 p-1.5 bg-gray-100 dark:bg-gray-800/50 rounded-2xl w-fit">
                    <button
                      type="button"
                      onClick={() => setActiveTab("videos")}
                      className={`
                        flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300
                        ${activeTab === "videos"
                          ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50"
                        }
                      `}
                    >
                      <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Videos</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setActiveTab("shorts")}
                      className={`
                        flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300
                        ${activeTab === "shorts"
                          ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/25"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50"
                        }
                      `}
                    >
                      <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>Shorts</span>
                    </button>
                  </div>

                  {/* Upload Content */}
                  {activeTab === "videos" ? (
                    <div>
                      {/* Channel info badge */}
                      <div className="flex items-center gap-3 mb-6 p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl border border-violet-200/50 dark:border-violet-700/30">
                        <div className="relative">
                          <Avatar className="w-12 h-12 ring-2 ring-violet-500">
                            <AvatarImage src={getImageUrl(channel?.image, true)} alt={channel?.channelname || channel?.name} />
                            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold">
                              {(channel?.channelname || channel?.name || "C")[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{channel?.channelname || channel?.name}</p>
                          <p className="text-sm text-violet-600 dark:text-violet-400 font-medium">Uploading as this channel</p>
                        </div>
                      </div>
                      
                      <VideoUploader
                        channelId={id as string}
                        channelName={channel?.channelname || channel?.name}
                        onUploadSuccess={handleVideoUploadSuccess}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12">
                      <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-pink-600 rounded-3xl blur-xl opacity-30 animate-pulse" />
                        <div className="relative bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-3xl p-8 sm:p-10 border border-rose-200/50 dark:border-rose-700/30">
                          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30">
                            <Play className="w-10 h-10 text-white" fill="white" />
                          </div>
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Upload Shorts</h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                            Create engaging vertical videos (9:16) to reach more viewers
                          </p>
                          <button
                            onClick={() => router.push("/shorts/upload")}
                            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-bold transition-all hover:opacity-90 shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40"
                          >
                            <Upload className="w-5 h-5" />
                            Go to Shorts Upload
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              PREMIUM CONTENT TABS
              ================================================================ */}
          <div className="w-full pb-32 sm:pb-16">
            <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              
              {/* Premium Tab Navigation */}
              <div className="flex items-center justify-center mb-8">
                <div className="inline-flex items-center p-1.5 bg-gray-100 dark:bg-gray-800/50 rounded-2xl backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                  <button
                    onClick={() => setContentTab("videos")}
                    className={`
                      flex items-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all duration-300
                      ${contentTab === "videos"
                        ? "bg-white dark:bg-gray-900 text-violet-600 dark:text-violet-400 shadow-lg"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }
                    `}
                  >
                    <Grid className="w-5 h-5" />
                    <span>Videos</span>
                    <span className={`
                      px-2.5 py-0.5 rounded-full text-xs font-bold transition-all
                      ${contentTab === "videos"
                        ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }
                    `}>
                      {videos.length}
                    </span>
                  </button>
                  
                  <button
                    onClick={() => setContentTab("shorts")}
                    className={`
                      flex items-center gap-2.5 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all duration-300
                      ${contentTab === "shorts"
                        ? "bg-white dark:bg-gray-900 text-rose-500 dark:text-rose-400 shadow-lg"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }
                    `}
                  >
                    <Film className="w-5 h-5" />
                    <span>Shorts</span>
                    <span className={`
                      px-2.5 py-0.5 rounded-full text-xs font-bold transition-all
                      ${contentTab === "shorts"
                        ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }
                    `}>
                      {shorts.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* ================================================================
                  VIDEOS CONTENT
                  ================================================================ */}
              {contentTab === "videos" && (
                <div className="w-full">
                  {videosLoading ? (
                    <div className="text-center py-16">
                      <div className="relative w-16 h-16 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 animate-spin" />
                        <div className="absolute inset-1 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                          <Video className="w-6 h-6 text-violet-500" />
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">Loading videos...</p>
                    </div>
                  ) : videos.length > 0 ? (
                    <>
                      {/* Section Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                            <Video className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Videos</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{videos.length} {videos.length === 1 ? 'video' : 'videos'} uploaded</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Videos Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        {videos.map((video, index) => (
                          <PremiumVideoCard key={video._id} video={video} router={router} index={index} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full blur-xl opacity-20" />
                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                          <Video className="w-12 h-12 text-gray-400" />
                        </div>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">No videos yet</h3>
                      <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                        {isOwnChannel
                          ? "Start your journey! Upload your first video to share with the world."
                          : "This channel hasn't uploaded any videos yet. Check back soon!"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ================================================================
                  SHORTS CONTENT
                  ================================================================ */}
              {contentTab === "shorts" && (
                <div className="w-full">
                  {shortsLoading ? (
                    <div className="text-center py-16">
                      <div className="relative w-16 h-16 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 animate-spin" />
                        <div className="absolute inset-1 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                          <Film className="w-6 h-6 text-rose-500" />
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">Loading shorts...</p>
                    </div>
                  ) : shortsError ? (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                        <Film className="w-12 h-12 text-red-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Shorts</h3>
                      <p className="text-red-500 mb-6">{shortsError}</p>
                      <button
                        onClick={() => setRefreshKey((prev) => prev + 1)}
                        className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : shorts.length > 0 ? (
                    <>
                      {/* Section Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
                            <Play className="w-5 h-5 text-white" fill="white" />
                          </div>
                          <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Shorts</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{shorts.length} {shorts.length === 1 ? 'short' : 'shorts'} uploaded</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Shorts Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
                        {shorts.map((short, index) => (
                          <PremiumShortCard key={short._id || short.id} short={short} router={router} channel={channel} index={index} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16">
                      <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full blur-xl opacity-20" />
                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                          <Film className="w-12 h-12 text-gray-400" />
                        </div>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">No shorts yet</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        {isOwnChannel
                          ? "Create engaging short-form content to grow your audience!"
                          : "This channel hasn't uploaded any shorts yet. Check back soon!"}
                      </p>
                      {isOwnChannel && (
                        <button
                          onClick={() => router.push("/shorts/upload")}
                          className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-rose-500/25"
                        >
                          <Upload className="w-5 h-5" />
                          Upload Your First Short
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  return { props: {} };
};

export default ChannelPage;
