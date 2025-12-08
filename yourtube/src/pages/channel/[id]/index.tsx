/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/channel/[id]/index.tsx - FIXED SHORTS GRID TO MATCH HOME PAGE

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Calendar, Video, Upload, Play, Film, Grid } from "lucide-react";
import ChannelHeader from "@/components/ChannelHeader";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { getSocket, isSocketConnected } from "@/lib/socket";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageUrl, getShortAvatar, getShortChannelName } from "@/lib/imageUtils";

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

  // Fetch channel, videos, shorts logic (unchanged - keeping existing code)
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

  useEffect(() => {
    const fetchVideos = async () => {
      if (!id || typeof id !== "string") return;
      try {
        setVideosLoading(true);
        const response = await axiosInstance.get(`/video/channel/${id}`);
        if (response.data.success && Array.isArray(response.data.data)) {
          setVideos(response.data.data);
        } else if (response.data.data) {
          const videoList = Array.isArray(response.data.data)
            ? response.data.data
            : [response.data.data];
          setVideos(videoList);
        } else {
          setVideos([]);
        }
      } catch (error: any) {
        setVideos([]);
      } finally {
        setVideosLoading(false);
      }
    };
    fetchVideos();
  }, [id]);

  useEffect(() => {
    const fetchShorts = async () => {
      if (!id || typeof id !== "string") return;
      try {
        setShortsLoading(true);
        setShortsError(null);
        const response = await axiosInstance.get(`/shorts/channel/${id}`, {
          params: { page: 1, limit: 100, _t: Date.now() },
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
        if (error.response?.status !== 404) {
          setShortsError("Failed to load shorts");
        }
        setShorts([]);
      } finally {
        setShortsLoading(false);
      }
    };
    fetchShorts();
  }, [id, refreshKey]);

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

  const formatViewsShort = (views?: number): string => {
    if (!views) return "0";
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return `${views}`;
  };

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
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Channel not found</h2>
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

        {/* Channel Info Bar */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6 max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="text-xs sm:text-sm">
                  Joined{" "}
                  {channel.joinedon
                    ? new Date(channel.joinedon).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })
                    : "Recently"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Video className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="text-xs sm:text-sm">
                  {videos.length} video{videos.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Film className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="text-xs sm:text-sm">
                  {shorts.length} short{shorts.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section - Keep existing code */}
        {isOwnChannel && (
          <div className="px-4 sm:px-6 pb-6 sm:pb-8 pt-4 sm:pt-6 max-w-7xl mx-auto">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-0 mb-6 border-b border-gray-200 dark:border-gray-700">
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
                    borderBottom: activeTab === "videos" ? "3px solid #2563eb" : "3px solid transparent",
                  }}
                >
                  <Video className="w-5 h-5 flex-shrink-0" />
                  <span>Upload Videos</span>
                </button>
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
                    borderBottom: activeTab === "shorts" ? "3px solid #dc2626" : "3px solid transparent",
                  }}
                >
                  <Play className="w-5 h-5 flex-shrink-0" />
                  <span>Upload Shorts</span>
                </button>
              </div>

              {activeTab === "videos" ? (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Upload className="w-6 h-6 flex-shrink-0" style={{ color: "#2563eb" }} />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upload Regular Videos</h2>
                  </div>
                  <VideoUploader
                    channelId={id as string}
                    channelName={channel?.channelname || channel?.name}
                    onUploadSuccess={handleVideoUploadSuccess}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }} className="dark:bg-red-900/20 rounded-xl p-8 max-w-md mx-auto">
                    <div style={{ backgroundColor: "rgba(239, 68, 68, 0.2)" }} className="dark:bg-red-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8" style={{ color: "#dc2626" }} fill="currentColor" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Upload Shorts</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Go to the Shorts section to upload vertical videos (9:16 aspect ratio)
                    </p>
                    <button
                      onClick={() => router.push("/shorts/upload")}
                      style={{ backgroundColor: "#dc2626" }}
                      className="px-6 py-3 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Upload className="w-5 h-5" />
                      Go to Shorts Upload
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Tabs */}
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
              <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{videos.length}</span>
              {contentTab === "videos" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />}
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
              <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{shorts.length}</span>
              {contentTab === "shorts" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 dark:bg-red-400" />}
            </button>
          </div>

          {/* Videos Content */}
          {contentTab === "videos" && (
            <div>
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
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No videos yet</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {isOwnChannel ? "Upload your first video to get started!" : "This channel hasn't uploaded any videos yet."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 🔥 FIXED SHORTS CONTENT - MATCH HOME PAGE EXACTLY */}
          {contentTab === "shorts" && (
            <div>
              {shortsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading shorts...</p>
                </div>
              ) : shorts.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 lg:grid lg:grid-cols-6 xl:grid-cols-8 lg:gap-4 lg:overflow-visible">
                  {shorts.map((short, index) => {
                    const shortAvatar = getShortAvatar(short);
                    const shortChannelName = getShortChannelName(short);

                    return (
                      <div
                        key={short._id}
                        onClick={(e) => {
                          if (!(e.target as HTMLElement).closest(".avatar-link")) {
                            router.push({ pathname: "/shorts", query: { start: index.toString() } });
                          }
                        }}
                        className="flex-shrink-0 w-[120px] cursor-pointer group/short lg:w-auto"
                      >
                        <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 mb-2 border border-transparent lg:border-gray-200 dark:lg:border-gray-700">
                          <img
                            src={short.thumbnailUrl}
                            alt={short.title}
                            className="w-full h-full object-cover group-hover/short:scale-110 transition-transform duration-500"
                            loading="lazy"
                          />

                          <div className="hidden lg:flex absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/short:opacity-100 transition-all duration-300 items-center justify-center">
                            <div className="bg-white/30 backdrop-blur-sm rounded-full p-4 transform scale-75 group-hover/short:scale-100 transition-transform duration-300">
                              <Play size={32} className="text-white" fill="white" />
                            </div>
                          </div>

                          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none lg:hidden" />

                          <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-sm rounded px-1.5 py-0.5 text-[11px] font-bold text-white lg:rounded-lg lg:px-3 lg:py-1.5 lg:bottom-3 lg:left-3">
                            {formatViewsShort(short.views)} views
                          </div>
                        </div>

                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1.5 leading-tight lg:text-[15px] lg:group-hover/short:text-red-500 lg:transition-colors">
                          {short.title}
                        </h3>

                        <div className="flex items-center gap-1.5">
                          <img
                            key={`short-${short._id}-${Date.now()}`}
                            src={shortAvatar}
                            alt={shortChannelName}
                            className="avatar-link w-5 h-5 rounded-full object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/channel/${short.userId?._id}`);
                            }}
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';
                            }}
                          />
                          <p
                            className="avatar-link text-xs text-gray-600 dark:text-gray-400 line-clamp-1 font-medium lg:group-hover/short:text-gray-900 dark:lg:group-hover/short:text-white transition-colors flex-1 min-w-0 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/channel/${short.userId?._id}`);
                            }}
                          >
                            {shortChannelName}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Film className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No shorts yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {isOwnChannel ? "Upload your first short to get started!" : "This channel hasn't uploaded any shorts yet."}
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

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default ChannelPage;