/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/channel/[id]/index.tsx - COMPLETE FINAL FIXED VERSION

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
import { Calendar, Video, Upload, Play, Film, Grid, User } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { GetServerSideProps } from "next";
// ============================================================================
// THUMBNAIL HELPER - FIXED VERSION
// ============================================================================
const getShortThumbnail = (short: any): string => {
  console.log("🖼️ Getting thumbnail for short:", {
    id: short._id,
    thumbnailUrl: short.thumbnailUrl?.substring(0, 100),
    thumbnail: short.thumbnail?.substring(0, 100),
    videoUrl: short.videoUrl?.substring(0, 100),
  });

  // ✅ PRIORITY 1: Check explicit thumbnail fields
  const thumbnailCandidates = [
    short.thumbnailUrl,
    short.thumbnail,
    short.videothumbnail,
    short.videothumb,
  ];

  for (const thumb of thumbnailCandidates) {
    if (thumb && typeof thumb === "string" && thumb.startsWith("http")) {
      console.log("✅ Using explicit thumbnail:", thumb.substring(0, 80));
      return thumb;
    }
  }

  // ✅ PRIORITY 2: For Supabase videos, use video URL directly
  if (short.videoUrl && typeof short.videoUrl === "string") {
    if (
      short.videoUrl.includes("supabase.co") ||
      short.videoUrl.includes("supabase.in")
    ) {
      console.log("📦 Using Supabase video URL as thumbnail");
      return short.videoUrl;
    }
  }

  // ✅ Fallback placeholder
  console.warn("⚠️ No thumbnail available for short:", short._id);
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 320"%3E%3Crect width="180" height="320" fill="%231F2937"/%3E%3Cpath d="M70 140L110 160L70 180V140Z" fill="%23EF4444"/%3E%3Ctext x="90" y="200" text-anchor="middle" fill="%239CA3AF" font-family="Arial" font-size="12"%3ENo Thumbnail%3C/text%3E%3C/svg%3E';
};
// ============================================================================
// MAIN COMPONENT - STATE & REFS
// ============================================================================

const ChannelPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, updateUser } = useUser();

  // ✅ Refs for Android visibility fix
  const infoBarRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);

  // State: Channel Data
  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State: Call Functionality
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  // State: Videos
  const [videos, setVideos] = useState<any[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);

  // State: Shorts
  const [shorts, setShorts] = useState<any[]>([]);
  const [shortsLoading, setShortsLoading] = useState(false);
  const [shortsError, setShortsError] = useState<string | null>(null);

  // State: Tabs
  const [activeTab, setActiveTab] = useState<"videos" | "shorts">("videos");
  const [contentTab, setContentTab] = useState<"videos" | "shorts">("videos");

  // State: Render Control
  const [refreshKey, setRefreshKey] = useState(0);
  const [renderKey, setRenderKey] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  // ============================================================================
  // LIFECYCLE HOOKS - CLIENT MOUNTING & VISIBILITY
  // ============================================================================

  // ✅ Client-side mounting
  useEffect(() => {
    isMountedRef.current = true;
    setIsMounted(true);
    console.log("✅ Component Mounted");
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ✅ ANDROID FIX: Force info bar visibility
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

  // ✅ DEBUG: Log data changes
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

  // ============================================================================
  // 🔴 ANDROID: LISTEN FOR FORCE REFRESH EVENTS
  // ============================================================================
  useEffect(() => {
    const handleForceRefresh = (event: CustomEvent) => {
      console.log("🔄 Force refresh event received:", event.detail);

      // Increment both keys to force complete re-render
      setRefreshKey((prev) => prev + 1);
      setRenderKey((prev) => prev + 1);
    };

    window.addEventListener(
      "forceChannelRefresh",
      handleForceRefresh as EventListener
    );

    return () => {
      window.removeEventListener(
        "forceChannelRefresh",
        handleForceRefresh as EventListener
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

          // ✅ Ensure subscribers is a number
          if (typeof channelData.subscribers !== "number") {
            channelData.subscribers = 0;
          }

          setChannel(channelData);
          console.log("✅ Channel loaded:", channelData.channelname);

          // ✅ Update user context if viewing own channel
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

        // ✅ CRITICAL FIX: Remove if-none-match header, use custom timestamp
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
            // ✅ REMOVED: "If-None-Match" - this was causing CORS error
          },
          // ✅ CRITICAL: Disable Axios's automatic ETag handling
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
            response.data.videos.length
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

        // ✅ CRITICAL FIX: Remove if-none-match header
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
            // ✅ REMOVED: "If-None-Match" - this was causing CORS error
          },
          // ✅ CRITICAL: Disable Axios's automatic ETag handling
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

          const processedShorts = fetchedShorts.map((short: any) => ({
            ...short,
            thumbnailUrl: short.thumbnailUrl || short.thumbnail,
            videoUrl: short.videoUrl || short.video,
          }));

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
    // ✅ Validation checks
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

      // ✅ Initiate call via API
      const response = await axiosInstance.post("/call/initiate", {
        receiverId: id,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to initiate call");
      }

      const { call } = response.data;

      // ✅ Check socket connection
      if (!isSocketConnected()) {
        throw new Error("Socket not connected. Please refresh the page.");
      }

      // ✅ Emit socket event
      const socket = getSocket();
      socket.emit("call-user", {
        userToCall: id,
        from: user._id,
        name: user.name || user.channelname || "User",
        image: user.image || "",
        roomId: call.roomId,
        callId: call._id,
      });

      // ✅ Navigate to call page
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
          "Failed to initiate call. Please try again."
      );
      setTimeout(() => setCallError(null), 5000);
    } finally {
      setIsInitiatingCall(false);
    }
  };

  // ============================================================================
  // LOADING & ERROR STATES
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading channel...</p>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
            Channel not found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This channel doesn't exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isOwnChannel = user?._id === id;

  // ============================================================================
  // RENDER - MAIN JSX
  // ============================================================================
  return (
    <ProtectedRoute requireAuth={true}>
      <div className="flex-1 min-h-screen bg-white dark:bg-gray-900">
        <div className="w-full">
          {/* Channel Header */}
          <ChannelHeader
            channel={channel}
            user={user}
            onStartCall={handleStartCall}
            isInitiatingCall={isInitiatingCall}
            callError={callError}
            onAvatarUpdate={() => setRefreshKey((prev) => prev + 1)}
          />

          {/* ✅ CHANNEL INFO BAR - MOBILE FIXED */}
          {channel && isMounted && (
            <div
              ref={infoBarRef}
              key={`info-${channel._id}-${videos.length}-${shorts.length}-${renderKey}`}
              className="w-full bg-white dark:bg-[#0f0f0f] border-b border-gray-200 dark:border-gray-800"
              style={{
                position: "relative",
                zIndex: 10,
                marginBottom: "20px",
              }}
            >
              <div className="px-3 sm:px-6 py-3 sm:py-4 max-w-7xl mx-auto">
                {/* Scrollable container */}
                <div
                  className="flex items-center overflow-x-auto scrollbar-hide"
                  style={{ gap: "12px" }}
                >
                  {/* Channel Name */}
                  <div
                    className="flex items-center border-r border-gray-200 dark:border-gray-700"
                    style={{ gap: "8px", paddingRight: "12px", flexShrink: 0 }}
                  >
                    <div
                      className="rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center"
                      style={{
                        width: "28px",
                        height: "28px",
                        minWidth: "28px",
                      }}
                    >
                      <User
                        style={{
                          width: "14px",
                          height: "14px",
                          color: "white",
                        }}
                      />
                    </div>
                    <span
                      className="font-semibold text-gray-900 dark:text-white"
                      style={{ fontSize: "13px", whiteSpace: "nowrap" }}
                    >
                      {channel.channelname || channel.name || "Unknown"}
                    </span>
                  </div>

                  {/* Joined Date */}
                  <div
                    className="flex items-center border-r border-gray-200 dark:border-gray-700"
                    style={{ gap: "6px", paddingRight: "12px", flexShrink: 0 }}
                  >
                    <Calendar
                      className="text-gray-400 dark:text-gray-500"
                      style={{
                        width: "14px",
                        height: "14px",
                        minWidth: "14px",
                      }}
                    />
                    <span
                      className="text-gray-600 dark:text-gray-400"
                      style={{ fontSize: "12px", whiteSpace: "nowrap" }}
                    >
                      Joined{" "}
                      {channel.joinedon
                        ? new Date(channel.joinedon).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "Recently"}
                    </span>
                  </div>

                  {/* Video Count - COMPLETELY FIXED */}
                  <div
                    key={`video-${videos.length}-${renderKey}`}
                    className="flex items-center border-r border-gray-200 dark:border-gray-700"
                    style={{
                      gap: "8px",
                      paddingRight: "12px",
                      flexShrink: 0,
                      minWidth: "fit-content",
                    }}
                  >
                    <div
                      className="rounded bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center"
                      style={{
                        width: "24px",
                        height: "24px",
                        minWidth: "24px",
                        flexShrink: 0,
                      }}
                    >
                      <Video
                        className="text-blue-600 dark:text-blue-400"
                        style={{ width: "14px", height: "14px" }}
                      />
                    </div>
                    <span
                      className="font-medium text-gray-700 dark:text-gray-300"
                      style={{
                        fontSize: "13px",
                        whiteSpace: "nowrap",
                        minWidth: "max-content",
                      }}
                    >
                      {videos.length} {videos.length === 1 ? "video" : "videos"}
                    </span>
                  </div>

                  {/* Shorts Count - COMPLETELY FIXED */}
                  <div
                    key={`shorts-${shorts.length}-${renderKey}`}
                    className="flex items-center"
                    style={{
                      gap: "8px",
                      flexShrink: 0,
                      minWidth: "fit-content",
                    }}
                  >
                    <div
                      className="rounded bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center"
                      style={{
                        width: "24px",
                        height: "24px",
                        minWidth: "24px",
                        flexShrink: 0,
                      }}
                    >
                      <Film
                        className="text-red-600 dark:text-red-400"
                        style={{ width: "14px", height: "14px" }}
                      />
                    </div>
                    <span
                      className="font-medium text-gray-700 dark:text-gray-300"
                      style={{
                        fontSize: "13px",
                        whiteSpace: "nowrap",
                        minWidth: "max-content",
                      }}
                    >
                      {shorts.length} {shorts.length === 1 ? "short" : "shorts"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ DEBUG: Force Refresh Button (remove after testing) */}
          {process.env.NODE_ENV === "development" && (
            <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900 text-center">
              <button
                onClick={() => {
                  console.log("🔄 Force refresh triggered");
                  setRefreshKey((prev) => prev + 1);
                  setRenderKey((prev) => prev + 1);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Force Refresh (Debug)
              </button>
              <span className="ml-4 text-xs">
                Videos: {videos.length} | Shorts: {shorts.length} | Render:{" "}
                {renderKey}
              </span>
            </div>
          )}

          {/* ============================================================================
              UPLOAD SECTION - OWN CHANNEL ONLY
              ============================================================================ */}
          {isOwnChannel && (
            <div
              className="px-4 sm:px-6 pb-6 sm:pb-8 pt-0 max-w-7xl mx-auto"
              style={{ position: "relative", zIndex: 5 }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 md:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                {/* Upload Tabs */}
                <div className="flex items-center gap-0 mb-4 sm:mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide bg-white dark:bg-gray-800">
                  {/* Videos Upload Tab */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("videos")}
                    className={`
                      flex items-center gap-1.5 sm:gap-2 
                      px-4 sm:px-5 md:px-6 
                      py-3 sm:py-3.5 
                      transition-all relative 
                      whitespace-nowrap flex-shrink-0
                      font-semibold
                      bg-transparent
                      ${
                        activeTab === "videos"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }
                    `}
                    style={{
                      borderBottom:
                        activeTab === "videos"
                          ? "3px solid #2563eb"
                          : "3px solid transparent",
                    }}
                  >
                    <Video className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="text-sm sm:text-base">Upload Videos</span>
                  </button>

                  {/* Shorts Upload Tab */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("shorts")}
                    className={`
                      flex items-center gap-1.5 sm:gap-2 
                      px-4 sm:px-5 md:px-6 
                      py-3 sm:py-3.5 
                      transition-all relative 
                      whitespace-nowrap flex-shrink-0
                      font-semibold
                      bg-transparent
                      ${
                        activeTab === "shorts"
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }
                    `}
                    style={{
                      borderBottom:
                        activeTab === "shorts"
                          ? "3px solid #dc2626"
                          : "3px solid transparent",
                    }}
                  >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="text-sm sm:text-base">Upload Shorts</span>
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
                    <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-red-600">
                        <Avatar className="w-full h-full">
                          <AvatarImage
                            src={getImageUrl(channel?.image, true)}
                            alt={channel?.channelname || channel?.name}
                            className="w-full h-full object-cover"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-red-500 to-pink-600 text-white font-semibold text-sm">
                            {(channel?.channelname ||
                              channel?.name ||
                              "C")[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div>
                        <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                          {channel?.channelname || channel?.name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Uploading as this channel
                        </p>
                      </div>
                    </div>

                    <div className="text-center py-6 sm:py-8">
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 sm:p-8 max-w-md mx-auto">
                        <div className="bg-red-100 dark:bg-red-900/50 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                          <Play
                            className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 dark:text-red-400"
                            fill="currentColor"
                          />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2">
                          Upload Shorts
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
                          Go to the Shorts section to upload vertical videos
                          (9:16 aspect ratio)
                        </p>
                        <button
                          onClick={() => router.push("/shorts/upload")}
                          className="bg-red-600 hover:bg-red-700 px-4 sm:px-6 py-2.5 sm:py-3 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl text-sm sm:text-base"
                        >
                          <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                          Go to Shorts Upload
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================================
              CONTENT TABS - VIEW VIDEOS & SHORTS
              ============================================================================ */}
          <div className="w-full pb-32 sm:pb-8 overflow-hidden">
            <div className="w-full sm:px-6 sm:max-w-7xl sm:mx-auto">
              {/* Tab Navigation - YouTube Style */}
              <div className="w-full border-b border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide px-4 sm:px-0">
                  {/* Videos Tab */}
                  <button
                    onClick={() => setContentTab("videos")}
                    className={`
        flex items-center gap-2 px-6 py-3 
        font-semibold text-sm
        transition-all relative whitespace-nowrap
        ${
          contentTab === "videos"
            ? "text-gray-900 dark:text-white"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        }
      `}
                    style={{
                      borderBottom:
                        contentTab === "videos"
                          ? "2px solid #3b82f6"
                          : "2px solid transparent",
                    }}
                  >
                    <Grid className="w-5 h-5" />
                    <span>Videos</span>
                    <span
                      className={`
        text-xs font-bold px-2 py-0.5 rounded-full
        ${
          contentTab === "videos"
            ? "bg-blue-600 text-white"
            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
        }
      `}
                    >
                      {videos.length}
                    </span>
                  </button>

                  {/* Shorts Tab */}
                  <button
                    onClick={() => setContentTab("shorts")}
                    className={`
        flex items-center gap-2 px-6 py-3 
        font-semibold text-sm
        transition-all relative whitespace-nowrap
        ${
          contentTab === "shorts"
            ? "text-gray-900 dark:text-white"
            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        }
      `}
                    style={{
                      borderBottom:
                        contentTab === "shorts"
                          ? "2px solid #dc2626"
                          : "2px solid transparent",
                    }}
                  >
                    <Film className="w-5 h-5" />
                    <span>Shorts</span>
                    <span
                      className={`
        text-xs font-bold px-2 py-0.5 rounded-full
        ${
          contentTab === "shorts"
            ? "bg-red-600 text-white"
            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
        }
      `}
                    >
                      {shorts.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Videos Content */}
              {contentTab === "videos" && (
                <div className="w-full px-2 sm:px-0">
                  {videosLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600 dark:text-gray-400">
                        Loading videos...
                      </p>
                    </div>
                  ) : videos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {videos.map((video) => {
                        // ✅ SAME THUMBNAIL LOGIC AS HOME PAGE
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
                                /https:\/\/res\.cloudinary\.com\/([^/]+)\/video\/upload\/(.+)/
                              );
                              if (match) {
                                const cloudName = match[1];
                                let publicId = match[2];
                                publicId = publicId
                                  .split("/")
                                  .filter(
                                    (segment) =>
                                      !segment.match(
                                        /^(f_|vc_|ac_|af_|br_|q_|w_|h_|c_|so_|t_)/
                                      )
                                  )
                                  .join("/");
                                publicId = publicId.replace(
                                  /\.(mp4|mov|avi|mkv|webm)$/i,
                                  ""
                                );
                                return `https://res.cloudinary.com/${cloudName}/video/upload/so_0,w_640,h_360,c_fill,q_auto:good/${publicId}.jpg`;
                              }
                            } catch (error) {
                              console.error(
                                "❌ Thumbnail generation error:",
                                error
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
                            className="cursor-pointer group"
                          >
                            {/* Thumbnail */}
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 mb-3 shadow-sm hover:shadow-lg transition-shadow">
                              {getVideoThumbnail(video).includes(
                                "supabase.co"
                              ) ? (
                                <img
                                  src={getVideoThumbnail(video)}
                                  alt={video?.videotitle || "Video thumbnail"}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                  onError={(e) => {
                                    const target =
                                      e.currentTarget as HTMLImageElement;
                                    const currentVideo = video;
                                    console.error(
                                      "❌ Thumbnail failed, trying video element"
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
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  preload="metadata"
                                  poster={getVideoThumbnail(video)}
                                  muted
                                  playsInline
                                />
                              )}
                              {video?.duration && (
                                <div className="absolute bottom-2 right-2 bg-black/90 text-white text-xs font-bold px-2 py-0.5 rounded">
                                  {video.duration}
                                </div>
                              )}
                            </div>

                            {/* Video Info */}
                            <div className="flex gap-3">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/channel/${video.uploadedBy?._id}`
                                  );
                                }}
                                className="flex-shrink-0"
                              >
                                <Avatar className="w-9 h-9 ring-2 ring-transparent hover:ring-blue-500 transition-all">
                                  <AvatarImage
                                    src={getImageUrl(
                                      video.uploadedBy?.image,
                                      true
                                    )}
                                    alt={channelName}
                                  />
                                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                                    {channelName[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </div>

                              <div className="flex-1 min-w-0">
                                <h3
                                  className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-3 mb-1 leading-snug group-hover:text-blue-600 transition-colors"
                                  style={{
                                    wordBreak: "break-all",
                                    overflowWrap: "anywhere",
                                    hyphens: "auto",
                                  }}
                                >
                                  {video?.videotitle || "Untitled Video"}
                                </h3>

                                <p
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(
                                      `/channel/${video.uploadedBy?._id}`
                                    );
                                  }}
                                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-1 cursor-pointer"
                                >
                                  {channelName}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
                                  <span>{video.views || 0} views</span>
                                  <span>•</span>
                                  <span>
                                    {video.createdAt
                                      ? new Date(
                                          video.createdAt
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
                    <div className="text-center py-12">
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mx-auto mb-4">
                        <Video className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        No videos yet
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                        {isOwnChannel
                          ? "Upload your first video to get started!"
                          : "This channel hasn't uploaded any videos yet."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Shorts Content - COMPLETE WITH FIXED THUMBNAILS */}
              {contentTab === "shorts" && (
                <div className="w-full overflow-hidden">
                  <div className="px-2 sm:px-0">
                    {shortsLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">
                          Loading shorts...
                        </p>
                      </div>
                    ) : shortsError ? (
                      <div className="text-center py-12">
                        <div className="bg-red-100 dark:bg-red-900/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                          <Film className="w-10 h-10 text-red-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          Error Loading Shorts
                        </h3>
                        <p className="text-red-600 dark:text-red-400 mb-4">
                          {shortsError}
                        </p>
                        <button
                          onClick={() => setRefreshKey((prev) => prev + 1)}
                          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    ) : shorts.length > 0 ? (
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                              <Play
                                className="w-5 h-5 text-white"
                                fill="white"
                              />
                            </div>
                            Shorts
                          </h2>
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                            {shorts.length} short
                            {shorts.length !== 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Shorts Grid - MOBILE & DESKTOP OPTIMIZED */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4 w-full pb-4 px-1 sm:px-0">
                          {shorts.map((short, index) => {
                            const thumbnailUrl = getShortThumbnail(short);

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
                                className="group cursor-pointer w-full transform transition-all duration-300 active:scale-95 md:hover:scale-[1.02]"
                              >
                                {/* Thumbnail Container */}
                                <div className="relative w-full rounded-lg sm:rounded-xl overflow-hidden bg-black shadow-md active:shadow-xl md:hover:shadow-2xl transition-all duration-300 border border-gray-200 dark:border-gray-700 active:border-red-500 dark:active:border-red-500 md:hover:border-red-500 dark:md:hover:border-red-500 active:ring-2 active:ring-red-500/50 md:hover:ring-2 md:hover:ring-red-500/50">
                                  <div
                                    className="relative w-full"
                                    style={{ paddingBottom: "177.78%" }}
                                  >
                                    {/* Thumbnail - Supabase Video or Image */}
                                    {thumbnailUrl.includes("supabase.co") ||
                                    thumbnailUrl.includes("supabase.in") ? (
                                      <video
                                        src={thumbnailUrl}
                                        className="absolute inset-0 w-full h-full object-cover group-active:scale-105 md:group-hover:scale-110 transition-transform duration-700 ease-out"
                                        preload="metadata"
                                        muted
                                        playsInline
                                        poster={thumbnailUrl}
                                        onError={(e) => {
                                          console.error(
                                            "❌ Video thumbnail failed:",
                                            thumbnailUrl.substring(0, 100)
                                          );
                                          const target =
                                            e.currentTarget as HTMLVideoElement;
                                          target.style.display = "none";
                                          const parent = target.parentElement;
                                          if (
                                            parent &&
                                            !parent.querySelector("img")
                                          ) {
                                            const imgElement =
                                              document.createElement("img");
                                            imgElement.src =
                                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 320"%3E%3Crect width="180" height="320" fill="%23DC2626"/%3E%3Cpath d="M70 140L110 160L70 180V140Z" fill="white"/%3E%3Ctext x="90" y="200" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold"%3EShort%3C/text%3E%3C/svg%3E';
                                            imgElement.className =
                                              "absolute inset-0 w-full h-full object-cover";
                                            parent.appendChild(imgElement);
                                          }
                                        }}
                                      />
                                    ) : (
                                      <img
                                        src={thumbnailUrl}
                                        alt={short.title}
                                        className="absolute inset-0 w-full h-full object-cover group-active:scale-105 md:group-hover:scale-110 transition-transform duration-700 ease-out"
                                        loading="lazy"
                                        onError={(e) => {
                                          const target =
                                            e.currentTarget as HTMLImageElement;
                                          if (
                                            target.src.includes(
                                              "data:image/svg"
                                            )
                                          )
                                            return;
                                          console.error(
                                            "❌ Image thumbnail failed:",
                                            target.src.substring(0, 100)
                                          );
                                          target.src =
                                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 320"%3E%3Crect width="180" height="320" fill="%23DC2626"/%3E%3Cpath d="M70 140L110 160L70 180V140Z" fill="white"/%3E%3Ctext x="90" y="200" text-anchor="middle" fill="white" font-family="Arial" font-size="14" font-weight="bold"%3EShort%3C/text%3E%3C/svg%3E';
                                        }}
                                      />
                                    )}
                                    {/* Gradient Overlay - MOBILE & DESKTOP */}
                                    <div className="absolute inset-x-0 bottom-0 h-24 sm:h-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none group-active:from-black/95 md:group-hover:from-black/95 transition-all duration-300" />

                                    {/* Red Overlay - MOBILE & DESKTOP */}
                                    <div className="absolute inset-0 bg-red-600/0 group-active:bg-red-600/15 md:group-hover:bg-red-600/10 transition-all duration-300 pointer-events-none" />

                                    {/* Views Badge - MOBILE & DESKTOP */}
                                    <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-black/80 backdrop-blur-sm text-white text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-2.5 sm:py-1 rounded-md flex items-center gap-1 group-active:bg-red-600 group-active:scale-105 md:group-hover:bg-red-600 md:group-hover:scale-110 transition-all duration-300">
                                      <Play
                                        className="w-2.5 h-2.5 sm:w-3 sm:h-3"
                                        fill="white"
                                      />
                                      <span>
                                        {(short.views || 0).toLocaleString()}
                                      </span>
                                    </div>

                                    {/* Duration Badge - MOBILE & DESKTOP */}
                                    {short.duration && (
                                      <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-black/80 backdrop-blur-sm text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2 sm:py-1 rounded-md group-active:bg-red-600 group-active:scale-105 md:group-hover:bg-red-600 md:group-hover:scale-110 transition-all duration-300">
                                        {short.duration}s
                                      </div>
                                    )}

                                    {/* Play Button Overlay - MOBILE ACTIVE + DESKTOP HOVER */}
                                    <div className="absolute inset-0 bg-black/0 group-active:bg-black/40 md:group-hover:bg-black/50 transition-all duration-500 flex items-center justify-center">
                                      <div className="opacity-0 group-active:opacity-100 md:group-hover:opacity-100 transform scale-50 group-active:scale-90 md:group-hover:scale-100 transition-all duration-500 ease-out">
                                        <div className="relative">
                                          <div className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-75"></div>
                                          <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-2xl ring-2 ring-white/40 group-active:ring-4 md:group-hover:ring-8 transition-all duration-300">
                                            <Play
                                              className="w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 text-white ml-1"
                                              fill="white"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Shine Effect - MOBILE ACTIVE + DESKTOP HOVER */}
                                    <div className="absolute inset-0 opacity-0 group-active:opacity-100 md:group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-active:translate-x-full md:group-hover:translate-x-full transition-transform duration-1000"></div>
                                    </div>

                                    {/* Index Badge - MOBILE ACTIVE + DESKTOP HOVER */}
                                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-0 group-active:opacity-100 md:group-hover:opacity-100 transition-all duration-300 bg-black/70 backdrop-blur-sm text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-md">
                                      #{index + 1}
                                    </div>
                                  </div>
                                </div>

                                {/* Title & Channel Info */}
                                <div className="mt-2 sm:mt-3 px-1">
                                  <h3
                                    className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white line-clamp-4 leading-snug mb-1 group-active:text-red-600 dark:group-active:text-red-500 md:group-hover:text-red-600 dark:md:group-hover:text-red-500 transition-colors duration-300"
                                    style={{
                                      wordBreak: "break-word",
                                      overflowWrap: "break-word",
                                      hyphens: "auto",
                                      display: "-webkit-box",
                                      WebkitLineClamp: 4,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {short.title}
                                  </h3>

                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-pink-600 flex-shrink-0 ring-1 ring-gray-200 dark:ring-gray-700 group-active:ring-2 group-active:ring-red-500 md:group-hover:ring-2 md:group-hover:ring-red-500 transition-all duration-300 transform group-active:scale-110 md:group-hover:scale-110"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const channelId =
                                          short.userId?._id ||
                                          short.userId ||
                                          channel?._id;
                                        if (channelId)
                                          router.push(`/channel/${channelId}`);
                                      }}
                                    >
                                      <Avatar className="w-full h-full">
                                        <AvatarImage
                                          src={getImageUrl(
                                            short.userId?.image ||
                                              short.userId?.avatar ||
                                              channel?.image,
                                            true
                                          )}
                                          alt={
                                            short.userId?.channelName ||
                                            short.userId?.name ||
                                            channel?.channelname ||
                                            "Channel"
                                          }
                                          className="w-full h-full object-cover"
                                        />
                                        <AvatarFallback className="bg-gradient-to-br from-red-500 to-pink-600 text-white text-[10px] sm:text-xs font-bold">
                                          {(short.userId?.channelName ||
                                            short.userId?.name ||
                                            channel?.channelname ||
                                            "U")[0].toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    </div>

                                    <p
                                      className="text-xs text-gray-600 dark:text-gray-400 font-medium line-clamp-1 flex-1 min-w-0 cursor-pointer active:text-gray-900 dark:active:text-white md:hover:text-gray-900 dark:md:hover:text-white transition-colors duration-300"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const channelId =
                                          short.userId?._id ||
                                          short.userId ||
                                          channel?._id;
                                        if (channelId)
                                          router.push(`/channel/${channelId}`);
                                      }}
                                    >
                                      {short.userId?.channelName ||
                                        short.userId?.name ||
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
                      <div className="text-center py-12">
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center mx-auto mb-4">
                          <Film className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          No shorts yet
                        </h3>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                          {isOwnChannel
                            ? "Upload your first short to get started!"
                            : "This channel hasn't uploaded any shorts yet."}
                        </p>
                        {isOwnChannel && (
                          <button
                            onClick={() => router.push("/shorts/upload")}
                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors inline-flex items-center gap-2 shadow-lg"
                          >
                            <Upload className="w-5 h-5" />
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
// ✅ CRITICAL FIX: Disable static generation for dynamic channel pages
// This prevents the "Cannot find module 'critters'" error during build
export const getServerSideProps: GetServerSideProps = async (context) => {
  // You could optionally fetch initial channel data here if needed
  // For now, we'll let the client-side useEffect handle it
  return {
    props: {}, // Empty props - we get everything client-side
  };
};

export default ChannelPage;
