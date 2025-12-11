/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/channel/[id]/index.tsx - COMPLETE FINAL FIXED VERSION
import { useState, useEffect } from "react";
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
// THUMBNAIL HELPER - FIXED VERSION
// ============================================================================
const getShortThumbnail = (short: any): string => {
  console.log("🖼️ Getting thumbnail for short:", short._id);

  // Priority 1: Use existing thumbnail fields if they're valid Cloudinary URLs
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
      // Clean the URL
      const cleanThumb = thumb
        .replace(/\/v\d+\//g, "/") // Remove version numbers
        .replace(/^http:\/\//, "https://"); // Ensure HTTPS

      console.log("✅ Using existing thumbnail:", cleanThumb.substring(0, 80));
      return cleanThumb;
    }
  }

  // Priority 2: Generate from videoUrl
  if (short.videoUrl && short.videoUrl.includes("res.cloudinary.com")) {
    try {
      // Remove version numbers first
      const cleanVideoUrl = short.videoUrl.replace(/\/v\d+\//g, "/");

      // Extract public_id
      const match = cleanVideoUrl.match(
        /youtube-clone\/shorts\/videos\/([^.\/]+)/
      );

      if (match) {
        const publicId = `youtube-clone/shorts/videos/${match[1]}`;
        const generatedThumbnail = `https://res.cloudinary.com/dxuxxk0ss/video/upload/so_0,w_640,h_360,c_fill,q_auto:good/${publicId}.jpg`;
        console.log(
          "✅ Generated thumbnail:",
          generatedThumbnail.substring(0, 80)
        );
        return generatedThumbnail;
      }
    } catch (error) {
      console.error("❌ Error generating thumbnail:", error);
    }
  }

  // Fallback: Use a default placeholder
  console.warn("⚠️ No thumbnail available for short:", short._id);
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 320"%3E%3Crect width="180" height="320" fill="%231F2937"/%3E%3Cpath d="M70 140L110 160L70 180V140Z" fill="%23EF4444"/%3E%3Ctext x="90" y="200" text-anchor="middle" fill="%239CA3AF" font-family="Arial" font-size="12"%3ENo Thumbnail%3C/text%3E%3C/svg%3E';
};
const ChannelPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, updateUser } = useUser();

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
  const [isMounted, setIsMounted] = useState(false);

  // ✅ Set mounted on client side only
  useEffect(() => {
    setIsMounted(true);
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
        console.error("❌ Error fetching channel:", error);
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
        
        // ✅ CRITICAL: Force no-cache headers on mobile
        const response = await axiosInstance.get(`/video/channel/${id}`, {
          params: { 
            _t: Date.now(),
            nocache: "true" 
          },
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        console.log("📹 Videos API response:", {
          success: response.data.success,
          count: response.data.data?.length || response.data.videos?.length || 0
        });

        if (response.data.success && Array.isArray(response.data.data)) {
          console.log("✅ Setting videos:", response.data.data.length);
          setVideos(response.data.data);
        } else if (response.data.videos && Array.isArray(response.data.videos)) {
          console.log("✅ Setting videos (alternate):", response.data.videos.length);
          setVideos(response.data.videos);
        } else if (response.data.data) {
          const videoList = Array.isArray(response.data.data)
            ? response.data.data
            : [response.data.data];
          console.log("✅ Setting videos (converted):", videoList.length);
          setVideos(videoList);
        } else {
          console.log("⚠️ No videos in response");
          setVideos([]);
        }
      } catch (error: any) {
        console.error("❌ Error fetching videos:", error.message);
        console.error("   Status:", error.response?.status);
        console.error("   Response:", error.response?.data);
        setVideos([]);
      } finally {
        setVideosLoading(false);
      }
    };

    // ✅ Add small delay to ensure component is mounted
    const timer = setTimeout(() => {
      fetchVideos();
    }, 100);

    return () => clearTimeout(timer);
  }, [id]);

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

        // ✅ CRITICAL: Force no-cache headers on mobile
        const response = await axiosInstance.get(`/shorts/channel/${id}`, {
          params: { 
            page: 1, 
            limit: 100, 
            _t: Date.now(),
            nocache: "true"
          },
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });

        console.log("🎬 Shorts API response:", {
          success: response.data.success,
          count: response.data.data?.length || response.data.shorts?.length || 0
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
        } else {
          console.log("⚠️ No shorts in response");
          setShorts([]);
        }
      } catch (error: any) {
        console.error("❌ Error fetching shorts:", error.message);
        console.error("   Status:", error.response?.status);
        console.error("   Response:", error.response?.data);
        
        if (error.response?.status !== 404) {
          setShortsError("Failed to load shorts");
        }
        setShorts([]);
      } finally {
        setShortsLoading(false);
      }
    };

    // ✅ Add small delay to ensure component is mounted
    const timer = setTimeout(() => {
      fetchShorts();
    }, 150);

    return () => clearTimeout(timer);
  }, [id, refreshKey]);
  // ============================================================================
  // HANDLERS
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
  // LOADING/ERROR STATES
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
  // RENDER
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
          onAvatarUpdate={() => setRefreshKey((prev) => prev + 1)}
        />

      {/* Channel Info Bar - FORCE RENDER WITH SAFE DEFAULTS */}
       {/* ✅ Channel Info Bar - FIXED FOR MOBILE */}
        {isMounted && !loading && channel && (
          <div 
            key={`channel-info-${channel._id}`}
            className="w-full px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
            style={{ 
              transform: 'translateZ(0)',
              willChange: 'transform'
            }}
          >
            <div className="w-full max-w-7xl mx-auto">
              <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-4 lg:gap-6">
                {/* Channel Name Display */}
                <div className="col-span-2 flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                  <User className="w-5 h-5 flex-shrink-0" />
                  <span className="text-base truncate">
                    {channel.channelname || channel.name || "Unknown"}
                  </span>
                </div>

                {/* Joined Date */}
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm whitespace-nowrap">
                    Joined{" "}
                    {channel.joinedon
                      ? new Date(channel.joinedon).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })
                      : "Recently"}
                  </span>
                </div>

                {/* DEBUG INFO - REMOVE AFTER FIXING */}
        <div className="bg-red-500 text-white p-2 text-xs">
          Debug: loading={loading.toString()}, hasChannel={!!channel}, 
          videos={videos.length}, shorts={shorts.length}
        </div>

                {/* Video Count */}
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Video className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm whitespace-nowrap">
                    {videos.length} video{videos.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Shorts Count */}
                <div className="col-span-2 sm:col-span-1 flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Film className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm whitespace-nowrap">
                    {shorts.length} short{shorts.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ============================================================================
            UPLOAD SECTION - COMPLETELY FIXED
            ============================================================================ */}
        {isOwnChannel && (
          <div className="px-4 sm:px-6 pb-6 sm:pb-8 pt-4 sm:pt-6 max-w-7xl mx-auto">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              {/* Upload Tabs - DESKTOP STYLE MATCH */}
              <div className="flex items-center gap-0 mb-6 border-b border-gray-200 dark:border-gray-700">
                {/* Videos Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab("videos")}
                  className="flex items-center gap-2 px-6 py-3.5 transition-all relative"
                  style={{
                    fontWeight: 500,
                    fontSize: "15px",
                    color: activeTab === "videos" ? "#2563eb" : "#6b7280",
                    backgroundColor: "transparent",
                    border: "none",
                    textDecoration: "none",
                    cursor: "pointer",
                    borderBottom:
                      activeTab === "videos"
                        ? "3px solid #2563eb"
                        : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== "videos") {
                      e.currentTarget.style.color = "#374151";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== "videos") {
                      e.currentTarget.style.color = "#6b7280";
                    }
                  }}
                >
                  <Video className="w-5 h-5 flex-shrink-0" />
                  <span style={{ textDecoration: "none" }}>Upload Videos</span>
                </button>

                {/* Shorts Tab - MATCHING DESKTOP STYLE */}
                <button
                  type="button"
                  onClick={() => setActiveTab("shorts")}
                  className="flex items-center gap-2 px-6 py-3.5 transition-all relative"
                  style={{
                    fontWeight: 500,
                    fontSize: "15px",
                    color: activeTab === "shorts" ? "#dc2626" : "#6b7280",
                    backgroundColor: "transparent",
                    border: "none",
                    textDecoration: "none",
                    cursor: "pointer",
                    borderBottom:
                      activeTab === "shorts"
                        ? "3px solid #dc2626"
                        : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== "shorts") {
                      e.currentTarget.style.color = "#374151";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== "shorts") {
                      e.currentTarget.style.color = "#6b7280";
                    }
                  }}
                >
                  <Play className="w-5 h-5 flex-shrink-0" />
                  <span style={{ textDecoration: "none" }}>Upload Shorts</span>
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "videos" ? (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Upload
                      className="w-6 h-6 flex-shrink-0"
                      style={{ color: "#2563eb" }}
                    />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
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
                  <div className="flex items-center gap-3 mb-4">
                    <Upload
                      className="w-6 h-6 flex-shrink-0"
                      style={{ color: "#dc2626" }}
                    />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Upload Shorts
                    </h2>
                  </div>

                  <div className="flex items-center gap-3 mb-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                      style={{ border: "2px solid #dc2626" }}
                    >
                      <Avatar className="w-full h-full">
                        <AvatarImage
                          src={getImageUrl(channel?.image, true)}
                          alt={channel?.channelname || channel?.name}
                          className="w-full h-full object-cover"
                        />
                        <AvatarFallback
                          style={{
                            background:
                              "linear-gradient(to bottom right, #ef4444, #ec4899)",
                          }}
                          className="text-white font-semibold"
                        >
                          {(channel?.channelname ||
                            channel?.name ||
                            "C")[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {channel?.channelname || channel?.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Uploading as this channel
                      </p>
                    </div>
                  </div>

                  <div className="text-center py-8">
                    <div
                      style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                      className="dark:bg-red-900/20 rounded-xl p-8 max-w-md mx-auto"
                    >
                      <div
                        style={{ backgroundColor: "rgba(239, 68, 68, 0.2)" }}
                        className="dark:bg-red-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                      >
                        <Play
                          className="w-8 h-8"
                          style={{ color: "#dc2626" }}
                          fill="currentColor"
                        />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        Upload Shorts
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Go to the Shorts section to upload vertical videos (9:16
                        aspect ratio)
                      </p>
                      <button
                        onClick={() => router.push("/shorts/upload")}
                        style={{ backgroundColor: "#dc2626" }}
                        className="px-6 py-3 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl"
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#b91c1c")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = "#dc2626")
                        }
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
        )}
        {/* Content Tabs (Videos/Shorts viewing) */}
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
            <div>
              {videosLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Loading videos...
                  </p>
                </div>
              ) : videos.length > 0 ? (
                <ChannelVideos videos={videos} />
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
          {/* Shorts Content - EXACT YOUTUBE LAYOUT WITH FIXED THUMBNAILS */}
          {/* Shorts Content - FIXED THUMBNAILS */}
          {contentTab === "shorts" && (
            <div>
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
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                        <Play className="w-5 h-5 text-white" fill="white" />
                      </div>
                      Shorts
                    </h2>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                      {shorts.length} short{shorts.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3">
                    {shorts.map((short) => {
                      const thumbnailUrl = getShortThumbnail(short);
                      console.log("📸 Rendering short thumbnail:", {
                        id: short._id,
                        url: thumbnailUrl?.substring(0, 80),
                      });

                      return (
                        <div
                          key={short._id}
                          onClick={() => router.push(`/shorts?id=${short._id}`)}
                          className="group cursor-pointer"
                        >
                          <div className="relative w-full rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-500">
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
                                  console.error(
                                    "❌ Thumbnail failed for:",
                                    short._id
                                  );
                                  const target =
                                    e.currentTarget as HTMLImageElement;

                                  // Prevent infinite loops
                                  if (target.src.includes("data:image/svg")) {
                                    return;
                                  }

                                  // Try one more time with fresh generation
                                  if (
                                    short.videoUrl &&
                                    short.videoUrl.includes("cloudinary.com")
                                  ) {
                                    const cleanUrl = short.videoUrl.replace(
                                      /\/v\d+\//g,
                                      "/"
                                    );
                                    const match = cleanUrl.match(
                                      /youtube-clone\/shorts\/videos\/([^.\/]+)/
                                    );
                                    if (match) {
                                      const retry = `https://res.cloudinary.com/dxuxxk0ss/video/upload/so_0,w_640,h_360,c_fill,q_auto:good/youtube-clone/shorts/videos/${match[1]}.jpg`;
                                      console.log(
                                        "🔄 Retrying with:",
                                        retry.substring(0, 80)
                                      );
                                      target.src = retry;
                                      return;
                                    }
                                  }

                                  // Final fallback
                                  target.src =
                                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 320"%3E%3Crect width="180" height="320" fill="%231F2937"/%3E%3Cpath d="M70 140L110 160L70 180V140Z" fill="%23EF4444"/%3E%3Ctext x="90" y="200" text-anchor="middle" fill="%239CA3AF" font-family="Arial" font-size="12"%3ENo Thumbnail%3C/text%3E%3C/svg%3E';
                                }}
                                onLoad={() => {
                                  console.log(
                                    "✅ Thumbnail loaded for:",
                                    short._id
                                  );
                                }}
                              />

                              <div className="absolute inset-x-0 bottom-0 h-24 sm:h-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

                              <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-black/80 backdrop-blur-sm text-white text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-2.5 sm:py-1 rounded-md flex items-center gap-1">
                                <Play
                                  className="w-2.5 h-2.5 sm:w-3 sm:h-3"
                                  fill="white"
                                />
                                <span>
                                  {(short.views || 0).toLocaleString()}
                                </span>
                              </div>

                              {short.duration && (
                                <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-black/80 backdrop-blur-sm text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2 sm:py-1 rounded-md">
                                  {short.duration}s
                                </div>
                              )}

                              <div className="hidden sm:flex absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300">
                                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-600 flex items-center justify-center shadow-2xl ring-4 ring-white/30">
                                    <Play
                                      className="w-5 h-5 sm:w-7 sm:h-7 text-white ml-0.5 sm:ml-1"
                                      fill="white"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 sm:mt-3 px-0.5">
                            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight sm:leading-snug mb-1.5 sm:mb-2 group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors">
                              {short.title}
                            </h3>

                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <div
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden bg-gradient-to-br from-red-500 to-pink-600 flex-shrink-0 ring-1 ring-gray-200 dark:ring-gray-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/channel/${
                                      short.userId?._id || channel?._id
                                    }`
                                  );
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
                                className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium line-clamp-1 flex-1 min-w-0 cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/channel/${
                                      short.userId?._id || channel?._id
                                    }`
                                  );
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelPage;
