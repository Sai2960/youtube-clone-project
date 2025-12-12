/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/channel/[id]/index.tsx - ANDROID MOBILE FIX

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

// ============================================================================
// THUMBNAIL HELPER
// ============================================================================
const getShortThumbnail = (short: any): string => {
  console.log("🖼️ Getting thumbnail for short:", short._id);

  const thumbnailCandidates = [
    short.thumbnailUrl,
    short.thumbnail,
    short.videothumbnail,
    short.videothumb,
  ];

  for (const thumb of thumbnailCandidates) {
    if (
      thumb &&
      typeof thumb === "string" &&
      thumb.includes("res.cloudinary.com")
    ) {
      const cleanThumb = thumb
        .replace(/\/v\d+\//g, "/")
        .replace(/^http:\/\//, "https://");
      return cleanThumb;
    }
  }

  if (short.videoUrl && short.videoUrl.includes("res.cloudinary.com")) {
    try {
      const cleanVideoUrl = short.videoUrl.replace(/\/v\d+\//g, "/");
      const match = cleanVideoUrl.match(
        /youtube-clone\/shorts\/videos\/([^.\/]+)/
      );

      if (match) {
        const publicId = `youtube-clone/shorts/videos/${match[1]}`;
        const generatedThumbnail = `https://res.cloudinary.com/dxuxxk0ss/video/upload/so_0,w_640,h_360,c_fill,q_auto:good/${publicId}.jpg`;
        return generatedThumbnail;
      }
    } catch (error) {
      console.error("❌ Error generating thumbnail:", error);
    }
  }

  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 320"%3E%3Crect width="180" height="320" fill="%231F2937"/%3E%3Cpath d="M70 140L110 160L70 180V140Z" fill="%23EF4444"/%3E%3Ctext x="90" y="200" text-anchor="middle" fill="%239CA3AF" font-family="Arial" font-size="12"%3ENo Thumbnail%3C/text%3E%3C/svg%3E';
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const ChannelPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, updateUser } = useUser();

  // Refs
  const infoBarRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);
  const lastFetchTimestamp = useRef<number>(0);
  const isRefreshing = useRef(false);

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
  // 🔴 CRITICAL: CLIENT MOUNTING
  // ============================================================================
  useEffect(() => {
    isMountedRef.current = true;
    setIsMounted(true);
    console.log("✅ Component Mounted");
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ============================================================================
  // 🔴 CRITICAL: ANDROID VISIBILITY FIX
  // ============================================================================
  useEffect(() => {
    if (channel && isMountedRef.current && infoBarRef.current) {
      const checkVisibility = () => {
        if (!infoBarRef.current) return;

        const rect = infoBarRef.current.getBoundingClientRect();

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
  }, [channel?._id, videos.length, shorts.length, renderKey]);

  // ============================================================================
  // 🔴 CRITICAL: FORCE REFRESH ON PAGE VISIBILITY (Android Tab Switch)
  // ============================================================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isRefreshing.current) {
        const now = Date.now();
        // Prevent rapid refreshes (debounce 1 second)
        if (now - lastFetchTimestamp.current < 1000) {
          console.log('⏭️ Skipping refresh - too soon');
          return;
        }
        
        console.log('👁️ Page visible - forcing data refresh');
        isRefreshing.current = true;
        lastFetchTimestamp.current = now;
        
        // Force complete data refresh
        setRefreshKey(prev => prev + 1);
        setRenderKey(prev => prev + 1);
        
        // Reset flag after refresh completes
        setTimeout(() => {
          isRefreshing.current = false;
        }, 500);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ============================================================================
  // 🔴 CRITICAL: FORCE REFRESH ON WINDOW FOCUS (Android)
  // ============================================================================
  useEffect(() => {
    const handleFocus = () => {
      if (!isRefreshing.current) {
        const now = Date.now();
        if (now - lastFetchTimestamp.current < 1000) {
          return;
        }
        
        console.log('🎯 Window focused - forcing refresh');
        isRefreshing.current = true;
        lastFetchTimestamp.current = now;
        
        setRefreshKey(prev => prev + 1);
        setRenderKey(prev => prev + 1);
        
        setTimeout(() => {
          isRefreshing.current = false;
        }, 500);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // ============================================================================
  // 🔴 CRITICAL: PAGESHOW EVENT (Handles BFCache on Android)
  // ============================================================================
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      // If page is loaded from BFCache (back/forward cache)
      if (event.persisted) {
        console.log('🔄 Page loaded from BFCache - forcing refresh');
        setRefreshKey(prev => prev + 1);
        setRenderKey(prev => prev + 1);
      }
    };
    
    window.addEventListener('pageshow', handlePageShow);
    
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
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
  }, [id, user?._id, refreshKey]);

  // ============================================================================
  // FETCH VIDEOS - WITH ANDROID CACHE FIX
  // ============================================================================
  useEffect(() => {
    const fetchVideos = async () => {
      if (!id || typeof id !== "string") return;

      try {
        setVideosLoading(true);

        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);

        const response = await axiosInstance.get(`/video/channel/${id}`, {
          params: {
            _t: timestamp,
            _r: random,
            nocache: "true",
            mobile: "true",
            force: "true"
          },
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        });

        if (response.data.success && Array.isArray(response.data.data)) {
          console.log("✅ Videos loaded:", response.data.data.length);
          setVideos(response.data.data);
          setTimeout(() => setRenderKey(prev => prev + 1), 100);
        } else if (response.data.videos && Array.isArray(response.data.videos)) {
          console.log("✅ Videos loaded (alt):", response.data.videos.length);
          setVideos(response.data.videos);
          setTimeout(() => setRenderKey(prev => prev + 1), 100);
        } else {
          setVideos([]);
        }
      } catch (error: any) {
        console.error("❌ Error fetching videos:", error.message);
        setVideos([]);
      } finally {
        setVideosLoading(false);
      }
    };

    const timer = setTimeout(fetchVideos, 150);
    return () => clearTimeout(timer);
  }, [id, refreshKey]);

  // ============================================================================
  // FETCH SHORTS - WITH ANDROID CACHE FIX
  // ============================================================================
  useEffect(() => {
    const fetchShorts = async () => {
      if (!id || typeof id !== "string") return;

      try {
        setShortsLoading(true);
        setShortsError(null);

        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);

        const response = await axiosInstance.get(`/shorts/channel/${id}`, {
          params: {
            page: 1,
            limit: 100,
            _t: timestamp,
            _r: random,
            nocache: "true",
            mobile: "true",
            force: "true"
          },
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        });

        if (response.data.success) {
          const fetchedShorts = response.data.data || response.data.shorts || [];
          console.log("✅ Shorts loaded:", fetchedShorts.length);

          const processedShorts = fetchedShorts.map((short: any) => ({
            ...short,
            thumbnailUrl: short.thumbnailUrl || short.thumbnail,
            videoUrl: short.videoUrl || short.video,
          }));

          setShorts(processedShorts);
          setTimeout(() => setRenderKey(prev => prev + 1), 100);
        } else {
          setShorts([]);
        }
      } catch (error: any) {
        console.error("❌ Error fetching shorts:", error.message);
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
    console.log("✅ Video upload success");
    setVideos((prevVideos) => [newVideo, ...prevVideos]);
    setRefreshKey(prev => prev + 1);
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
    <div className="flex-1 min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-full mx-auto">
        <ChannelHeader
          channel={channel}
          user={user}
          onStartCall={handleStartCall}
          isInitiatingCall={isInitiatingCall}
          callError={callError}
          onAvatarUpdate={() => {
            setRefreshKey((prev) => prev + 1);
            setRenderKey((prev) => prev + 1);
          }}
        />

        {/* CHANNEL INFO BAR */}
        {channel && isMounted && (
          <div
            ref={infoBarRef}
            key={`info-${channel._id}-${videos.length}-${shorts.length}-${renderKey}`}
            className="w-full px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
            style={{
              display: "block",
              visibility: "visible",
              opacity: 1,
              minHeight: "80px",
              position: "relative",
              zIndex: 10,
            }}
          >
            <div className="w-full max-w-7xl mx-auto">
              <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-4 lg:gap-6">
                <div className="col-span-2 flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="text-sm sm:text-base truncate">
                    {channel.channelname || channel.name || "Unknown"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm whitespace-nowrap">
                    Joined{" "}
                    {channel.joinedon
                      ? new Date(channel.joinedon).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })
                      : "Recently"}
                  </span>
                </div>

                <div 
                  key={`video-count-${videos.length}-${renderKey}`}
                  className="flex items-center gap-1.5 sm:gap-2 text-gray-600 dark:text-gray-400"
                >
                  <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm whitespace-nowrap">
                    {videos.length} video{videos.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div 
                  key={`shorts-count-${shorts.length}-${renderKey}`}
                  className="col-span-2 sm:col-span-1 flex items-center gap-1.5 sm:gap-2 text-gray-600 dark:text-gray-400"
                >
                  <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm whitespace-nowrap">
                    {shorts.length} short{shorts.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* UPLOAD SECTION */}
        {isOwnChannel && (
          <div className="px-4 sm:px-6 pb-6 sm:pb-8 pt-4 sm:pt-6 max-w-7xl mx-auto">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 sm:p-4 md:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-0 mb-4 sm:mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide">
                <button
                  type="button"
                  onClick={() => setActiveTab("videos")}
                  className={`
                    flex items-center gap-1.5 sm:gap-2 
                    px-4 sm:px-5 md:px-6 
                    py-3 sm:py-3.5 
                    transition-all relative 
                    whitespace-nowrap flex-shrink-0
                    font-medium
                    ${
                      activeTab === "videos"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }
                  `}
                  style={{
                    borderBottom:
                      activeTab === "videos"
                        ? "3px solid #2563eb"
                        : "3px solid transparent",
                    backgroundColor: "transparent",
                  }}
                >
                  <Video className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="text-sm sm:text-base">Upload Videos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("shorts")}
                  className={`
                    flex items-center gap-1.5 sm:gap-2 
                    px-4 sm:px-5 md:px-6 
                    py-3 sm:py-3.5 
                    transition-all relative 
                    whitespace-nowrap flex-shrink-0
                    font-medium
                    ${
                      activeTab === "shorts"
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }
                  `}
                  style={{
                    borderBottom:
                      activeTab === "shorts"
                        ? "3px solid #dc2626"
                        : "3px solid transparent",
                    backgroundColor: "transparent",
                  }}
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="text-sm sm:text-base">Upload Shorts</span>
                </button>
              </div>

              {activeTab === "videos" ? (
                <div>
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                      Upload Regular Videos
                    </h2>
                  </div>
                  <VideoUploader
                    channelId={id as string}
                    channelName={channel?.channelname || channel?.name}
                    onUploadSuccess={handleVideoUploadSuccess}
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 text-red-600 dark:text-red-400" />
                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                      Upload Shorts
                    </h2>
                  </div>

                  <div className="text-center py-6 sm:py-8">
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 sm:p-8 max-w-md mx-auto">
                      <div className="bg-red-100 dark:bg-red-900/50 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                        <Play className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 dark:text-red-400" fill="currentColor" />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2">
                        Upload Shorts
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
                        Go to the Shorts section to upload vertical videos
                      </p>
                      <button
                        onClick={() => router.push("/shorts/upload")}
                        className="bg-red-600 hover:bg-red-700 px-4 sm:px-6 py-2.5 sm:py-3 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto shadow-lg text-sm sm:text-base"
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

        {/* CONTENT TABS */}
        <div className="px-4 sm:px-6 pb-6 sm:pb-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setContentTab("videos")}
              className={`flex items-center gap-2 px-4 py-3 font-semibold transition-all relative ${
                contentTab === "videos"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Grid className="w-5 h-5" />
              <span>Videos</span>
              <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                {videos.length}
              </span>
              {contentTab === "videos" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>

            <button
              onClick={() => setContentTab("shorts")}
              className={`flex items-center gap-2 px-4 py-3 font-semibold transition-all relative ${
                contentTab === "shorts"
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Film className="w-5 h-5" />
              <span>Shorts</span>
              <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                {shorts.length}
              </span>
              {contentTab === "shorts" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 dark:bg-red-400" />
              )}
            </button>
          </div>

          {/* Videos Content */}
          {contentTab === "videos" && (
            <div key={`videos-${videos.length}-${renderKey}`}>
              {videosLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading videos...</p>
                </div>
              ) : videos.length > 0 ? (
                <ChannelVideos videos={videos} />
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Video className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No videos yet
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isOwnChannel
                      ? "Upload your first video to get started!"
                      : "This channel hasn't uploaded any videos yet."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Shorts Content */}
          {contentTab === "shorts" && (
            <div key={`shorts-${shorts.length}-${renderKey}`}>
              {shortsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading shorts...</p>
                </div>
              ) : shortsError ? (
                <div className="text-center py-12">
                  <div className="bg-red-100 dark:bg-red-900/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Film className="w-10 h-10 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Error Loading Shorts
                  </h3>
                  <p className="text-red-600 dark:text-red-400 mb-4">{shortsError}</p>
                  <button
                    onClick={() => setRefreshKey((prev) => prev + 1)}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : shorts.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                        <Play className="w-5 h-5 text-white" fill="white" />
                      </div>
                      Shorts
                    </h2>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                      {shorts.length} short{shorts.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
                    {shorts.map((short) => {
                      const thumbnailUrl = getShortThumbnail(short);

                      return (
                        <div
                          key={`short-${short._id}-${renderKey}`}
                          onClick={() => router.push(`/shorts?id=${short._id}`)}
                          className="group cursor-pointer"
                        >
                          <div className="relative w-full rounded-xl overflow-hidden bg-black shadow-md hover:shadow-xl transition-all border border-gray-200 dark:border-gray-700 hover:border-red-500">
                            <div
                              className="relative w-full"
                              style={{ paddingBottom: "177.78%" }}
                            >
                              <img
                                src={thumbnailUrl}
                                alt={short.title}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  if (target.src.includes("data:image/svg")) return;
                                  target.src =
                                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 320"%3E%3Crect width="180" height="320" fill="%231F2937"/%3E%3Cpath d="M70 140L110 160L70 180V140Z" fill="%23EF4444"/%3E%3Ctext x="90" y="200" text-anchor="middle" fill="%239CA3AF" font-family="Arial" font-size="12"%3ENo Thumbnail%3C/text%3E%3C/svg%3E';
                                }}
                              />

                              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

                              <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                                <Play className="w-3 h-3" fill="white" />
                                <span>{(short.views || 0).toLocaleString()}</span>
                              </div>

                              {short.duration && (
                                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md">
                                  {short.duration}s
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 px-0.5">
                            <h3 className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1.5 group-hover:text-red-600 transition-colors">
                              {short.title}
                            </h3>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Film className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No shorts yet
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {isOwnChannel
                      ? "Upload your first short to get started!"
                      : "This channel hasn't uploaded any shorts yet."}
                  </p>
                  {isOwnChannel && (
                    <button
                      onClick={() => router.push("/shorts/upload")}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors inline-flex items-center gap-2"
                    >
                      <Upload className="w-5 h-5" />
                      Upload Short
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelPage;