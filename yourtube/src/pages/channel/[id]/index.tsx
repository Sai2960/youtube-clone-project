/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/channel/[id]/index.tsx - PREMIUM LUXURY VERSION

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import ChannelHeader from "@/components/ChannelHeader";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { getSocket, isSocketConnected } from "@/lib/socket";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageUrl } from "@/lib/imageUtils";
import {
  Calendar,
  Video,
  Upload,
  Play,
  Film,
  Grid,
  User,
  Sparkles,
  Crown,
  Gem,
  Star,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { GetServerSideProps } from "next";

// ============================================================================
// PREMIUM STYLES - CSS-IN-JS
// ============================================================================
const premiumStyles = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
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
  
  .premium-gradient-bg {
    background: linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #f5576c);
    background-size: 400% 400%;
    animation: gradient-shift 15s ease infinite;
  }
  
  .premium-border {
    animation: border-dance 4s ease-in-out infinite;
  }
  
  .premium-glass {
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
  }
  
  .premium-card {
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.05) 100%
    );
    border: 1px solid rgba(255, 255, 255, 0.18);
  }
  
  .dark .premium-card {
    background: linear-gradient(
      135deg,
      rgba(30, 30, 40, 0.9) 0%,
      rgba(20, 20, 30, 0.95) 100%
    );
    border: 1px solid rgba(139, 92, 246, 0.2);
  }
  
  .premium-text-gradient {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .premium-hover-lift {
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  
  .premium-hover-lift:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 
      0 20px 40px rgba(0, 0, 0, 0.15),
      0 0 60px rgba(139, 92, 246, 0.15);
  }
  
  .premium-video-card {
    position: relative;
    overflow: hidden;
  }
  
  .premium-video-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: left 0.5s;
  }
  
  .premium-video-card:hover::before {
    left: 100%;
  }
  
  .premium-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  .premium-scrollbar::-webkit-scrollbar-track {
    background: rgba(139, 92, 246, 0.1);
    border-radius: 3px;
  }
  
  .premium-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 3px;
  }
  
  .premium-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #764ba2, #f093fb);
  }
`;

// ============================================================================
// THUMBNAIL HELPER - FIXED VERSION
// ============================================================================
const getShortThumbnail = (short: any): string => {
  // Try explicit thumbnail fields with full URLs
  const thumbnailCandidates = [
    short.thumbnailUrl,
    short.thumbnail,
    short.videothumbnail,
    short.videothumb,
  ];

  for (const thumb of thumbnailCandidates) {
    if (thumb && typeof thumb === "string" && thumb.startsWith("http")) {
      // Check if URL is complete (has file extension)
      if (thumb.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i)) {
        console.log("✅ Using complete thumbnail URL");
        return thumb;
      }
    }
  }

  // Try video URL as fallback
  if (
    short.videoUrl &&
    typeof short.videoUrl === "string" &&
    short.videoUrl.startsWith("http")
  ) {
    if (short.videoUrl.match(/\.(mp4|webm|mov|avi)(\?|$)/i)) {
      console.log("📦 Using video URL for thumbnail");
      return short.videoUrl;
    }
  }

  console.warn("⚠️ No valid media URL for short:", short._id);
  return "fallback";
};

// ============================================================================
// MAIN COMPONENT - STATE & REFS
// ============================================================================

const ChannelPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, updateUser } = useUser();

  const infoBarRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);

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
  // LIFECYCLE HOOKS - CLIENT MOUNTING & VISIBILITY
  // ============================================================================

  useEffect(() => {
    isMountedRef.current = true;
    setIsMounted(true);
    console.log("✅ Component Mounted");
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (channel && isMountedRef.current && infoBarRef.current) {
      const checkVisibility = () => {
        if (!infoBarRef.current) return;

        const rect = infoBarRef.current.getBoundingClientRect();
        console.log("📏 Info bar:", {
          height: rect.height,
          width: rect.width,
          top: rect.top,
        });

        if (rect.height === 0) {
          console.warn("⚠️ Info bar hidden! Forcing re-render...");
          infoBarRef.current.style.display = "block";
          infoBarRef.current.style.minHeight = "80px";
          infoBarRef.current.style.visibility = "visible";
          infoBarRef.current.style.opacity = "1";
          setRenderKey((prev) => prev + 1);
        }
      };

      checkVisibility();
      const timer = setTimeout(checkVisibility, 200);
      return () => clearTimeout(timer);
    }
  }, [channel?._id, videos.length, shorts.length]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("🔍 CHANNEL PAGE DEBUG:", {
        channelLoaded: !!channel,
        channelId: channel?._id,
        channelName: channel?.channelname || channel?.name,
        videosCount: videos.length,
        shortsCount: shorts.length,
        isMounted,
        renderKey,
        timestamp: new Date().toISOString(),
      });

      (window as any).__debugChannelPage = {
        channel,
        videos,
        shorts,
        isMounted,
        renderKey,
      };
    }
  }, [channel, videos.length, shorts.length, isMounted, renderKey]);

  useEffect(() => {
    const handleForceRefresh = (event: CustomEvent) => {
      console.log("🔄 Force refresh event received:", event.detail);
      setRefreshKey((prev) => prev + 1);
      setRenderKey((prev) => prev + 1);
    };

    window.addEventListener(
      "forceChannelRefresh",
      handleForceRefresh as EventListener,
    );

    return () => {
      window.removeEventListener(
        "forceChannelRefresh",
        handleForceRefresh as EventListener,
      );
    };
  }, []);

  // ============================================================================
  // FETCH CHANNEL DATA
  // ============================================================================

  useEffect(() => {
    const fetchChannel = async () => {
      if (!id || typeof id !== "string") return;

      try {
        setLoading(true);
        console.log("📡 Fetching channel:", id);

        const response = await axiosInstance.get(`/auth/channel/${id}`);

        if (response.data.success && response.data.user) {
          const channelData = response.data.user;

          if (typeof channelData.subscribers !== "number") {
            channelData.subscribers = 0;
          }

          setChannel(channelData);
          console.log("✅ Channel loaded:", channelData.channelname);

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
      } catch (error: any) {
        console.error("❌ Channel fetch error:", error);
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
      if (!id || typeof id !== "string") {
        console.log("⚠️ No channel ID for videos");
        return;
      }

      try {
        setVideosLoading(true);
        console.log("📹 Fetching videos for channel:", id);

        const timestamp = Date.now();

        const response = await axiosInstance.get(`/video/channel/${id}`, {
          params: {
            _t: timestamp,
            nocache: "true",
            mobile: "true",
          },
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
          },
          transformRequest: [
            (data, headers) => {
              delete headers["If-None-Match"];
              delete headers["If-Modified-Since"];
              return data;
            },
          ],
        });

        console.log("📹 Videos API response:", {
          success: response.data.success,
          count:
            response.data.data?.length || response.data.videos?.length || 0,
          timestamp: response.data.timestamp,
        });

        if (response.data.success && Array.isArray(response.data.data)) {
          console.log("✅ Setting videos:", response.data.data.length);
          setVideos(response.data.data);
          setTimeout(() => setRenderKey((prev) => prev + 1), 100);
        } else if (
          response.data.videos &&
          Array.isArray(response.data.videos)
        ) {
          console.log(
            "✅ Setting videos (alternate):",
            response.data.videos.length,
          );
          setVideos(response.data.videos);
          setTimeout(() => setRenderKey((prev) => prev + 1), 100);
        } else {
          console.log("⚠️ No videos in response");
          setVideos([]);
        }
      } catch (error: any) {
        console.error("❌ Error fetching videos:", {
          message: error.message,
          status: error.response?.status,
        });
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
      if (!id || typeof id !== "string") {
        console.log("⚠️ No channel ID for shorts");
        return;
      }

      try {
        setShortsLoading(true);
        setShortsError(null);
        console.log("🎬 Fetching shorts for channel:", id);

        const timestamp = Date.now();

        const response = await axiosInstance.get(`/shorts/channel/${id}`, {
          params: {
            page: 1,
            limit: 100,
            _t: timestamp,
            nocache: "true",
            mobile: "true",
          },
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            Pragma: "no-cache",
            Expires: "0",
          },
          transformRequest: [
            (data, headers) => {
              delete headers["If-None-Match"];
              delete headers["If-Modified-Since"];
              return data;
            },
          ],
        });

        console.log("🎬 Shorts API response:", {
          success: response.data.success,
          count:
            response.data.data?.length || response.data.shorts?.length || 0,
          timestamp: response.data.timestamp,
        });

        if (response.data.success) {
          const fetchedShorts =
            response.data.data || response.data.shorts || [];
          console.log("✅ Setting shorts:", fetchedShorts.length);

          const processedShorts = fetchedShorts.map((short: any) => {
            console.log("🎬 SHORT DATA:", {
              id: short._id,
              title: short.title,
              thumbnailUrl: short.thumbnailUrl,
              thumbnail: short.thumbnail,
              videoUrl: short.videoUrl,
              video: short.video,
              // Log ALL possible URL fields
              allFields: Object.keys(short)
                .filter(
                  (k) =>
                    k.toLowerCase().includes("url") ||
                    k.toLowerCase().includes("video") ||
                    k.toLowerCase().includes("thumb"),
                )
                .reduce((acc, k) => ({ ...acc, [k]: short[k] }), {}),
            });

            return {
              ...short,
              thumbnailUrl:
                short.thumbnailUrl ||
                short.thumbnail ||
                short.thumbnailPath ||
                short.thumb,
              videoUrl:
                short.videoUrl ||
                short.video ||
                short.videoPath ||
                short.filepath,
            };
          });

          setShorts(processedShorts);
          setTimeout(() => setRenderKey((prev) => prev + 1), 100);
        } else {
          console.log("⚠️ No shorts in response");
          setShorts([]);
        }
      } catch (error: any) {
        console.error("❌ Error fetching shorts:", {
          message: error.message,
          status: error.response?.status,
        });

        if (error.response?.status !== 404) {
          setShortsError("Failed to load shorts");
        }
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
    console.log("✅ Video upload success:", newVideo._id);
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

      const remotePersonName =
        channel.name || channel.channelname || "Unknown User";
      const remotePersonImage =
        channel.image || "https://github.com/shadcn.png";

      const response = await axiosInstance.post("/call/initiate", {
        receiverId: id,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to initiate call");
      }

      const { call } = response.data;

      if (!isSocketConnected()) {
        throw new Error("Socket not connected. Please refresh the page.");
      }

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
      setCallError(
        error.response?.data?.message ||
          error.message ||
          "Failed to initiate call. Please try again.",
      );
      setTimeout(() => setCallError(null), 5000);
    } finally {
      setIsInitiatingCall(false);
    }
  };

  // ============================================================================
  // LOADING & ERROR STATES - PREMIUM STYLED
  // ============================================================================

  if (loading) {
    return (
      <>
        <style jsx global>
          {premiumStyles}
        </style>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-purple-950/20 dark:to-gray-900">
          <div className="text-center">
            {/* Premium Loading Spinner */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-purple-200 dark:border-purple-900/50"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 dark:border-t-purple-400 animate-spin"></div>
              <div
                className="absolute inset-2 rounded-full border-4 border-transparent border-t-pink-500 dark:border-t-pink-400 animate-spin"
                style={{
                  animationDirection: "reverse",
                  animationDuration: "1.5s",
                }}
              ></div>
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 animate-pulse flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-lg font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Loading channel...
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Please wait a moment
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!channel) {
    return (
      <>
        <style jsx global>
          {premiumStyles}
        </style>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-purple-950/20 dark:to-gray-900">
          <div className="text-center p-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
              <User className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
              Channel not found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This channel doesn't exist or has been removed.
            </p>
            <button
              onClick={() => router.push("/")}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-purple-500/25 hover:scale-105"
            >
              Go Home
            </button>
          </div>
        </div>
      </>
    );
  }

  const isOwnChannel = user?._id === id;

  const getShortVideoUrl = (short: any): string => {
    if (!short?.videoUrl) return "";
    if (short.videoUrl.startsWith("http")) {
      return short.videoUrl;
    }
    return short.videoUrl;
  };

  // ============================================================================
  // RENDER - PREMIUM MAIN JSX
  // ============================================================================
  return (
    <ProtectedRoute requireAuth={true}>
      <style jsx global>
        {premiumStyles}
      </style>

      {/* Premium Background with Gradient */}
      <div className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50/30 dark:from-gray-950 dark:via-purple-950/20 dark:to-gray-900 premium-scrollbar">
        {/* Decorative Background Elements */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/5 dark:bg-pink-500/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-500/3 to-pink-500/3 dark:from-purple-500/5 dark:to-pink-500/5 rounded-full blur-3xl"></div>
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

          {/* ✅ PREMIUM CHANNEL INFO BAR */}
          {channel && isMounted && (
            <div
              ref={infoBarRef}
              key={`info-${channel._id}-${videos.length}-${shorts.length}-${renderKey}`}
              className="w-full relative z-10"
              style={{
                marginBottom: "24px",
              }}
            >
              {/* Premium Glass Effect Background */}
              <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-purple-500/30 z-0"></div>

              {/* Gradient Accent Line */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 dark:via-purple-400/70 to-transparent z-[1]"></div>

              <div className="relative px-4 sm:px-6 py-4 sm:py-5 max-w-7xl mx-auto z-[2]">
                <div
                  className="flex items-center overflow-x-auto scrollbar-hide premium-scrollbar"
                  style={{ gap: "16px" }}
                >
                  {/* Channel Name - Premium Badge */}
                  <div
                    className="flex items-center bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-xl px-4 py-2.5 border border-purple-200/50 dark:border-purple-500/30"
                    style={{ gap: "10px", flexShrink: 0 }}
                  >
                    <div
                      className="rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-purple-500/25"
                      style={{
                        width: "32px",
                        height: "32px",
                        minWidth: "32px",
                      }}
                    >
                      <Crown
                        style={{
                          width: "16px",
                          height: "16px",
                          color: "white",
                        }}
                      />
                    </div>
                    <span
                      className="font-bold bg-gradient-to-r from-purple-700 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent"
                      style={{ fontSize: "14px", whiteSpace: "nowrap" }}
                    >
                      {channel.channelname || channel.name || "Unknown"}
                    </span>
                  </div>

                  {/* Joined Date - Premium Style */}
                  <div
                    className="flex items-center bg-white/50 dark:bg-gray-800/50 rounded-xl px-4 py-2.5 border border-gray-200/50 dark:border-gray-700/50 shadow-sm"
                    style={{ gap: "8px", flexShrink: 0 }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                      <Calendar
                        className="text-white"
                        style={{
                          width: "14px",
                          height: "14px",
                        }}
                      />
                    </div>
                    <span
                      className="text-gray-700 dark:text-gray-300 font-medium"
                      style={{ fontSize: "13px", whiteSpace: "nowrap" }}
                    >
                      Joined{" "}
                      {channel.joinedon
                        ? new Date(channel.joinedon).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "Recently"}
                    </span>
                  </div>

                  {/* Video Count - Premium Animated */}
                  <div
                    key={`video-${videos.length}-${renderKey}`}
                    className="flex items-center bg-white/50 dark:bg-gray-800/50 rounded-xl px-4 py-2.5 border border-blue-200/50 dark:border-blue-500/30 shadow-sm group hover:shadow-blue-500/20 transition-all duration-300"
                    style={{
                      gap: "10px",
                      flexShrink: 0,
                      minWidth: "fit-content",
                    }}
                  >
                    <div
                      className="rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300"
                      style={{
                        width: "32px",
                        height: "32px",
                        minWidth: "32px",
                        flexShrink: 0,
                      }}
                    >
                      <Video
                        className="text-white"
                        style={{ width: "16px", height: "16px" }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span
                        className="font-bold text-gray-900 dark:text-white"
                        style={{
                          fontSize: "15px",
                          whiteSpace: "nowrap",
                          lineHeight: "1.2",
                        }}
                      >
                        {videos.length}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
                        {videos.length === 1 ? "Video" : "Videos"}
                      </span>
                    </div>
                  </div>

                  {/* Shorts Count - Premium Animated */}
                  <div
                    key={`shorts-${shorts.length}-${renderKey}`}
                    className="flex items-center bg-white/50 dark:bg-gray-800/50 rounded-xl px-4 py-2.5 border border-red-200/50 dark:border-red-500/30 shadow-sm group hover:shadow-red-500/20 transition-all duration-300"
                    style={{
                      gap: "10px",
                      flexShrink: 0,
                      minWidth: "fit-content",
                    }}
                  >
                    <div
                      className="rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/25 group-hover:scale-110 transition-transform duration-300"
                      style={{
                        width: "32px",
                        height: "32px",
                        minWidth: "32px",
                        flexShrink: 0,
                      }}
                    >
                      <Film
                        className="text-white"
                        style={{ width: "16px", height: "16px" }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span
                        className="font-bold text-gray-900 dark:text-white"
                        style={{
                          fontSize: "15px",
                          whiteSpace: "nowrap",
                          lineHeight: "1.2",
                        }}
                      >
                        {shorts.length}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
                        {shorts.length === 1 ? "Short" : "Shorts"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ DEBUG: Force Refresh Button (remove after testing) */}
          {process.env.NODE_ENV === "development" && (
            <div className="px-4 py-2 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 text-center border-y border-yellow-200 dark:border-yellow-800">
              <button
                onClick={() => {
                  console.log("🔄 Force refresh triggered");
                  setRefreshKey((prev) => prev + 1);
                  setRenderKey((prev) => prev + 1);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Force Refresh (Debug)
              </button>
              <span className="ml-4 text-xs text-amber-700 dark:text-amber-300">
                Videos: {videos.length} | Shorts: {shorts.length} | Render:{" "}
                {renderKey}
              </span>
            </div>
          )}

          {/* ============================================================================
              PREMIUM UPLOAD SECTION - OWN CHANNEL ONLY
              ============================================================================ */}
          {isOwnChannel && (
            <div
              className="px-4 sm:px-6 pb-6 sm:pb-8 pt-0 max-w-7xl mx-auto"
              style={{ position: "relative", zIndex: 5 }}
            >
              {/* Premium Card Container */}
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl">
                {/* Animated Gradient Border */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-2xl sm:rounded-3xl animate-pulse opacity-30"></div>

                {/* Inner Card */}
                <div className="relative m-[1px] bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl shadow-purple-500/10">
                  {/* Premium Header Badge */}
                  <div className="flex items-center justify-center mb-4 sm:mb-6">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 rounded-full border border-purple-200/50 dark:border-purple-500/30">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Creator Studio
                      </span>
                      <Sparkles className="w-4 h-4 text-pink-500" />
                    </div>
                  </div>

                  {/* Upload Tabs - Premium Styled */}
                  <div className="flex items-center gap-2 mb-6 sm:mb-8 p-1.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl overflow-x-auto scrollbar-hide">
                    {/* Videos Upload Tab */}
                    <button
                      type="button"
                      onClick={() => setActiveTab("videos")}
                      className={`
                        flex items-center gap-2 
                        px-5 sm:px-6 md:px-8 
                        py-3 sm:py-3.5 
                        rounded-lg
                        transition-all duration-300 relative 
                        whitespace-nowrap flex-1 justify-center
                        font-semibold text-sm sm:text-base
                        ${
                          activeTab === "videos"
                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50"
                        }
                      `}
                    >
                      <Video className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span>Upload Videos</span>
                    </button>

                    {/* Shorts Upload Tab */}
                    <button
                      type="button"
                      onClick={() => setActiveTab("shorts")}
                      className={`
                        flex items-center gap-2 
                        px-5 sm:px-6 md:px-8 
                        py-3 sm:py-3.5 
                        rounded-lg
                        transition-all duration-300 relative 
                        whitespace-nowrap flex-1 justify-center
                        font-semibold text-sm sm:text-base
                        ${
                          activeTab === "shorts"
                            ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50"
                        }
                      `}
                    >
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span>Upload Shorts</span>
                    </button>
                  </div>

                  {/* Tab Content */}
                  {activeTab === "videos" ? (
                    <div>
                      <VideoUploader
                        channelId={id as string}
                        channelName={channel?.channelname || channel?.name}
                        onUploadSuccess={handleVideoUploadSuccess}
                      />
                    </div>
                  ) : (
                    <div>
                      {/* Channel Info Badge */}
                      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 p-4 sm:p-5 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                        <div className="relative">
                          <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full blur opacity-30"></div>
                          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-red-500/50">
                            <Avatar className="w-full h-full">
                              <AvatarImage
                                src={getImageUrl(channel?.image, true)}
                                alt={channel?.channelname || channel?.name}
                                className="w-full h-full object-cover"
                              />
                              <AvatarFallback className="bg-gradient-to-br from-red-500 to-pink-600 text-white font-bold text-sm">
                                {(channel?.channelname ||
                                  channel?.name ||
                                  "C")[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                            {channel?.channelname || channel?.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Star
                              className="w-3 h-3 text-yellow-500"
                              fill="currentColor"
                            />
                            Uploading as this channel
                          </p>
                        </div>
                      </div>

                      {/* Shorts Upload CTA */}
                      <div className="text-center py-8 sm:py-12">
                        <div className="relative inline-block">
                          {/* Animated Glow */}
                          <div className="absolute -inset-4 bg-gradient-to-r from-red-500/20 via-pink-500/20 to-red-500/20 rounded-3xl blur-xl animate-pulse"></div>

                          <div className="relative bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-2xl p-8 sm:p-10 max-w-md border border-red-200/50 dark:border-red-500/30">
                            <div className="relative mb-4 sm:mb-6">
                              <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                              <div className="relative bg-gradient-to-br from-red-500 to-pink-600 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-red-500/30">
                                <Play
                                  className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1"
                                  fill="currentColor"
                                />
                              </div>
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-2">
                              Upload Shorts
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 sm:mb-8">
                              Go to the Shorts section to upload vertical videos
                              (9:16 aspect ratio)
                            </p>
                            <button
                              onClick={() => router.push("/shorts/upload")}
                              className="group bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 px-6 sm:px-8 py-3 sm:py-4 text-white rounded-xl font-bold transition-all duration-300 flex items-center gap-2 mx-auto shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 hover:scale-105"
                            >
                              <Upload className="w-5 h-5 group-hover:animate-bounce" />
                              Go to Shorts Upload
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================================
              PREMIUM CONTENT TABS - VIEW VIDEOS & SHORTS
              ============================================================================ */}
          <div className="w-full pb-32 sm:pb-8 overflow-hidden">
            <div className="w-full sm:px-6 sm:max-w-7xl sm:mx-auto">
              {/* Premium Tab Navigation */}
              <div className="w-full mb-8">
                <div className="relative">
                  {/* Background Blur Effect */}
                  <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/70 backdrop-blur-lg rounded-xl sm:rounded-2xl z-0"></div>

                  <div className="relative flex items-center gap-2 p-2 overflow-x-auto scrollbar-hide px-4 sm:px-2 z-[1]">
                    {/* Videos Tab - Premium */}
                    <button
                      onClick={() => setContentTab("videos")}
                      className={`
                        flex items-center gap-2 sm:gap-3 px-5 sm:px-8 py-3 sm:py-4
                        font-bold text-sm sm:text-base
                        transition-all duration-300 whitespace-nowrap
                        rounded-xl sm:rounded-2xl
                        ${
                          contentTab === "videos"
                            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/30"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                        }
                      `}
                    >
                      <Grid className="w-5 h-5" />
                      <span>Videos</span>
                      <span
                        className={`
                          text-xs font-black px-2.5 py-1 rounded-full
                          ${
                            contentTab === "videos"
                              ? "bg-white/20 text-white"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }
                        `}
                      >
                        {videos.length}
                      </span>
                    </button>

                    {/* Shorts Tab - Premium */}
                    <button
                      onClick={() => setContentTab("shorts")}
                      className={`
                        flex items-center gap-2 sm:gap-3 px-5 sm:px-8 py-3 sm:py-4
                        font-bold text-sm sm:text-base
                        transition-all duration-300 whitespace-nowrap
                        rounded-xl sm:rounded-2xl
                        ${
                          contentTab === "shorts"
                            ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-xl shadow-red-500/30"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                        }
                      `}
                    >
                      <Film className="w-5 h-5" />
                      <span>Shorts</span>
                      <span
                        className={`
                          text-xs font-black px-2.5 py-1 rounded-full
                          ${
                            contentTab === "shorts"
                              ? "bg-white/20 text-white"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                          }
                        `}
                      >
                        {shorts.length}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Videos Content - Premium Styled */}
              {contentTab === "videos" && (
                <div className="w-full px-2 sm:px-0">
                  {videosLoading ? (
                    <div className="text-center py-16">
                      <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900/50"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
                        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <Video className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">
                        Loading videos...
                      </p>
                    </div>
                  ) : videos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {videos.map((video) => {
                        const getVideoThumbnail = (video: any): string => {
                          const explicitThumbnail =
                            video?.thumbnailUrl ||
                            video?.thumbnail ||
                            video?.videothumbnail ||
                            video?.videothumb;

                          if (explicitThumbnail?.startsWith("http")) {
                            return explicitThumbnail;
                          }

                          const videoUrl =
                            video?.filepath ||
                            video?.videofile ||
                            video?.videoLink;
                          if (videoUrl?.includes("supabase.co")) {
                            return videoUrl;
                          }

                          if (
                            videoUrl?.includes("cloudinary.com") &&
                            videoUrl.includes("/video/upload/")
                          ) {
                            try {
                              const match = videoUrl.match(
                                /https:\/\/res\.cloudinary\.com\/([^/]+)\/video\/upload\/(.+)/,
                              );
                              if (match) {
                                const cloudName = match[1];
                                let publicId = match[2];
                                publicId = publicId
                                  .split("/")
                                  .filter(
                                    (segment) =>
                                      !segment.match(
                                        /^(f_|vc_|ac_|af_|br_|q_|w_|h_|c_|so_|t_)/,
                                      ),
                                  )
                                  .join("/");
                                publicId = publicId.replace(
                                  /\.(mp4|mov|avi|mkv|webm)$/i,
                                  "",
                                );
                                return `https://res.cloudinary.com/${cloudName}/video/upload/so_0,w_640,h_360,c_fill,q_auto:good/${publicId}.jpg`;
                              }
                            } catch (error) {
                              console.error(
                                "❌ Thumbnail generation error:",
                                error,
                              );
                            }
                          }

                          return "/placeholder-thumbnail.jpg";
                        };

                        const channelName =
                          video.uploadedBy?.channelname ||
                          video.uploadedBy?.name ||
                          video?.videochanel ||
                          "Unknown Channel";

                        return (
                          <div
                            key={video._id}
                            onClick={() => router.push(`/watch/${video._id}`)}
                            className="cursor-pointer group premium-hover-lift"
                          >
                            {/* Premium Thumbnail Container */}
                            <div className="relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden mb-3 sm:mb-4 shadow-lg group-hover:shadow-2xl group-hover:shadow-blue-500/20 transition-all duration-500">
                              {/* Gradient Border Effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-sm scale-105"></div>

                              <div className="relative w-full h-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                                {getVideoThumbnail(video).includes(
                                  "supabase.co",
                                ) ? (
                                  <img
                                    src={getVideoThumbnail(video)}
                                    alt={video?.videotitle || "Video thumbnail"}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                    loading="lazy"
                                    onError={(e) => {
                                      const target =
                                        e.currentTarget as HTMLImageElement;
                                      const currentVideo = video;
                                      console.error(
                                        "❌ Thumbnail failed, trying video element",
                                      );
                                      target.style.display = "none";
                                      const parent = target.parentElement;
                                      if (
                                        parent &&
                                        !parent.querySelector("video")
                                      ) {
                                        const videoElement =
                                          document.createElement("video");
                                        videoElement.src =
                                          getVideoThumbnail(currentVideo);
                                        videoElement.className =
                                          "w-full h-full object-cover";
                                        videoElement.preload = "metadata";
                                        videoElement.muted = true;
                                        videoElement.playsInline = true;
                                        parent.appendChild(videoElement);
                                      }
                                    }}
                                  />
                                ) : (
                                  <video
                                    src={getVideoThumbnail(video)}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                    preload="metadata"
                                    poster={getVideoThumbnail(video)}
                                    muted
                                    playsInline
                                  />
                                )}

                                {/* Premium Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                {/* Play Button Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/90 dark:bg-white/95 flex items-center justify-center shadow-2xl transform scale-50 group-hover:scale-100 transition-transform duration-500 ease-out">
                                    <Play
                                      className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900 ml-1"
                                      fill="currentColor"
                                    />
                                  </div>
                                </div>

                                {/* Duration Badge - Premium */}
                                {video?.duration && (
                                  <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-black/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md">
                                    {video.duration}
                                  </div>
                                )}

                                {/* Premium Quality Badge */}
                                <div className="absolute top-2 left-2 sm:top-3 sm:left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                                    <Gem className="w-3 h-3" />
                                    <span>HD</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Video Info - Premium Styled */}
                            <div className="flex gap-3 sm:gap-4">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/channel/${video.uploadedBy?._id}`,
                                  );
                                }}
                                className="flex-shrink-0"
                              >
                                <div className="relative">
                                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></div>
                                  <Avatar className="relative w-10 h-10 sm:w-11 sm:h-11 ring-2 ring-white dark:ring-gray-900 shadow-lg">
                                    <AvatarImage
                                      src={getImageUrl(
                                        video.uploadedBy?.image,
                                        true,
                                      )}
                                      alt={channelName}
                                      className="object-cover"
                                    />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                                      {channelName[0]?.toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3
                                  className="font-bold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-2 mb-1.5 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300"
                                  style={{
                                    wordBreak: "break-word",
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {video?.videotitle || "Untitled Video"}
                                </h3>

                                <p
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(
                                      `/channel/${video.uploadedBy?._id}`,
                                    );
                                  }}
                                  className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-1 cursor-pointer font-medium transition-colors"
                                >
                                  {channelName}
                                </p>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                                  <span className="font-medium">
                                    {video.views || 0} views
                                  </span>
                                  <span className="text-gray-300 dark:text-gray-600">
                                    •
                                  </span>
                                  <span>
                                    {video.createdAt
                                      ? new Date(
                                          video.createdAt,
                                        ).toLocaleDateString()
                                      : "Recently"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Empty State - Premium */
                    <div className="text-center py-16 sm:py-20">
                      <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
                        <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                          <Video className="w-12 h-12 sm:w-14 sm:h-14 text-gray-400" />
                        </div>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent mb-2">
                        No videos yet
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                        {isOwnChannel
                          ? "Upload your first video to get started and share your content with the world!"
                          : "This channel hasn't uploaded any videos yet. Check back later!"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Shorts Content - Premium Styled */}
              {contentTab === "shorts" && (
                <div className="w-full overflow-hidden">
                  <div className="px-2 sm:px-0">
                    {shortsLoading ? (
                      <div className="text-center py-16">
                        <div className="relative w-20 h-20 mx-auto mb-6">
                          <div className="absolute inset-0 rounded-full border-4 border-red-200 dark:border-red-900/50"></div>
                          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-red-600 animate-spin"></div>
                          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                            <Film className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 font-medium">
                          Loading shorts...
                        </p>
                      </div>
                    ) : shortsError ? (
                      <div className="text-center py-16">
                        <div className="relative inline-block mb-6">
                          <div className="absolute inset-0 bg-red-500/20 rounded-full blur-2xl"></div>
                          <div className="relative bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-full w-24 h-24 flex items-center justify-center">
                            <Film className="w-12 h-12 text-red-600" />
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          Error Loading Shorts
                        </h3>
                        <p className="text-red-600 dark:text-red-400 mb-6">
                          {shortsError}
                        </p>
                        <button
                          onClick={() => setRefreshKey((prev) => prev + 1)}
                          className="px-8 py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl transition-all duration-300 font-semibold shadow-lg shadow-red-500/25 hover:shadow-xl hover:scale-105"
                        >
                          Retry
                        </button>
                      </div>
                    ) : shorts.length > 0 ? (
                      <div>
                        {/* Premium Header */}
                        <div className="flex items-center justify-between mb-6 sm:mb-8">
                          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                            <div className="relative">
                              <div className="absolute inset-0 bg-red-500/30 rounded-xl blur-lg"></div>
                              <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30">
                                <Play
                                  className="w-5 h-5 sm:w-6 sm:h-6 text-white ml-0.5"
                                  fill="white"
                                />
                              </div>
                            </div>
                            <span className="bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                              Shorts
                            </span>
                          </h2>
                          <span className="text-sm font-bold text-gray-500 dark:text-gray-400 bg-gradient-to-r from-red-500/10 to-pink-500/10 dark:from-red-500/20 dark:to-pink-500/20 px-4 py-2 rounded-full border border-red-200/50 dark:border-red-500/30">
                            {shorts.length} short
                            {shorts.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4 md:gap-5 w-full pb-4 px-1 sm:px-0">
                          {shorts.map((short, index) => {
                            const thumbnailUrl = getShortThumbnail(short);
                            const videoUrl = getShortVideoUrl(short);

                            const hasValidThumbnail =
                              thumbnailUrl &&
                              thumbnailUrl !== "fallback" &&
                              thumbnailUrl.startsWith("http");
                            const hasValidVideo =
                              videoUrl && videoUrl.startsWith("http");

                            return (
                              <div
                                key={short._id || short.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  const shortId = short._id || short.id;
                                  if (shortId) {
                                    router.push(`/shorts?id=${shortId}`);
                                  }
                                }}
                                className="group cursor-pointer w-full transform transition-all duration-500 active:scale-95 premium-hover-lift"
                              >
                                {/* ✅ FIXED CONTAINER - Always visible in both themes */}
                                <div className="aspect-[9/16] rounded-2xl overflow-hidden relative ring-1 ring-red-500/20 dark:ring-red-500/30 shadow-lg group-hover:shadow-2xl group-hover:shadow-red-500/20 transition-all duration-500">
                                  {/* ✅ FIX 1: Solid background layer - ALWAYS VISIBLE */}
                                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 z-0"></div>

                                  {/* Animated Border */}
                                  <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-500 z-[1]"></div>

                                  {/* ✅ CRITICAL FIX: Media Content with proper z-index */}
                                  <div className="absolute inset-0 w-full h-full z-[15]">
                                    {hasValidThumbnail ? (
                                      <img
                                        src={thumbnailUrl}
                                        alt={short.title || "Short"}
                                        className="w-full h-full object-cover relative z-[16]"
                                        loading="lazy"
                                        style={{
                                          display: "block",
                                          backgroundColor: "transparent",
                                          minHeight: "100%",
                                          minWidth: "100%",
                                        }}
                                        onError={(e) => {
                                          console.error(
                                            "❌ Thumbnail failed:",
                                            short._id,
                                          );
                                          const target = e.currentTarget;
                                          target.style.display = "none";

                                          if (hasValidVideo) {
                                            const parent = target.parentElement;
                                            if (
                                              parent &&
                                              !parent.querySelector(
                                                "video.backup-video",
                                              )
                                            ) {
                                              const video =
                                                document.createElement("video");
                                              video.className =
                                                "backup-video w-full h-full object-cover";
                                              video.src = videoUrl;
                                              video.preload = "metadata";
                                              video.muted = true;
                                              video.playsInline = true;
                                              video.style.display = "block";
                                              parent.appendChild(video);
                                            }
                                          }
                                        }}
                                      />
                                    ) : hasValidVideo ? (
                                      <video
                                        src={videoUrl}
                                        className="w-full h-full object-cover relative z-[16]"
                                        preload="metadata"
                                        muted
                                        playsInline
                                        style={{
                                          display: "block",
                                          backgroundColor: "transparent",
                                          minHeight: "100%",
                                          minWidth: "100%",
                                        }}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500 via-pink-600 to-rose-600">
                                        <div className="text-center p-4">
                                          <div className="relative mb-3">
                                            <div className="absolute inset-0 rounded-full animate-ping opacity-50 bg-white/30"></div>
                                            <div className="relative w-16 h-16 mx-auto rounded-full flex items-center justify-center shadow-2xl bg-white/95">
                                              <Play
                                                className="w-8 h-8 ml-1 text-red-600"
                                                fill="currentColor"
                                              />
                                            </div>
                                          </div>
                                          <p
                                            className="text-xs font-black text-white tracking-widest"
                                            style={{
                                              textShadow:
                                                "0 2px 4px rgba(0,0,0,0.3)",
                                            }}
                                          >
                                            {short.title || "SHORT"}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Bottom Gradient - HIGHER z-index */}
                                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-[30]"></div>

                                  {/* Hover Overlay - HIGHER z-index */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-red-600/0 to-transparent group-hover:from-red-600/20 transition-all duration-300 pointer-events-none z-[35]"></div>
                                  {/* Views Badge - z-30 */}
                                  <div className="absolute bottom-3 left-3 bg-black/85 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg z-30">
                                    <Play className="w-3 h-3" fill="white" />
                                    <span>
                                      {(short.views || 0).toLocaleString()}
                                    </span>
                                  </div>

                                  {/* Duration Badge - z-30 */}
                                  {short.duration && (
                                    <div className="absolute bottom-3 right-3 bg-black/85 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-lg z-30">
                                      {short.duration}s
                                    </div>
                                  )}

                                  {/* Play Button - z-40 */}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-500 flex items-center justify-center z-40">
                                    <div className="opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-500 ease-out">
                                      <div className="relative">
                                        <div className="absolute inset-0 rounded-full animate-ping opacity-50 bg-red-600"></div>
                                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-2xl ring-4 ring-white/30">
                                          <Play
                                            className="w-7 h-7 sm:w-8 sm:h-8 text-white ml-1"
                                            fill="white"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Shine Effect - z-50 */}
                                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-50">
                                    <div className="absolute inset-0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                                  </div>
                                </div>

                                {/* Title & Channel Info */}
                                <div className="mt-3 sm:mt-4 px-1">
                                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug mb-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-300">
                                    {short.title}
                                  </h3>

                                  <div className="flex items-center gap-2">
                                    <Avatar className="w-6 h-6 ring-1 ring-gray-200 dark:ring-gray-700">
                                      <AvatarImage
                                        src={getImageUrl(
                                          short.userId?.image || channel?.image,
                                          true,
                                        )}
                                        alt={
                                          short.userId?.channelName ||
                                          channel?.channelname ||
                                          "Channel"
                                        }
                                      />
                                      <AvatarFallback className="bg-gradient-to-br from-red-500 to-pink-600 text-white text-[10px] font-bold">
                                        {(short.userId?.channelName ||
                                          channel?.channelname ||
                                          "U")[0].toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium line-clamp-1">
                                      {short.userId?.channelName ||
                                        channel?.channelname ||
                                        "Unknown"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Empty State - Premium */
                      <div className="text-center py-16 sm:py-20">
                        <div className="relative inline-block mb-6">
                          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-full blur-2xl animate-pulse"></div>
                          <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                            <Film className="w-12 h-12 sm:w-14 sm:h-14 text-gray-400" />
                          </div>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent mb-3">
                          No shorts yet
                        </h3>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                          {isOwnChannel
                            ? "Upload your first short to get started and engage your audience with quick, vertical videos!"
                            : "This channel hasn't uploaded any shorts yet. Check back later for new content!"}
                        </p>
                        {isOwnChannel && (
                          <button
                            onClick={() => router.push("/shorts/upload")}
                            className="group px-8 py-4 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl font-bold transition-all duration-300 inline-flex items-center gap-2 shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 hover:scale-105"
                          >
                            <Upload className="w-5 h-5 group-hover:animate-bounce" />
                            Upload Short
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
  return {
    props: {},
  };
};

export default ChannelPage;
