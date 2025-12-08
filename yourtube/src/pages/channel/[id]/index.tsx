/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/channel/[id]/index.tsx - COMPLETE FINAL VERSION WITH WORKING THUMBNAILS
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
import { getImageUrl } from "@/lib/imageUtils";

// 🔧 THUMBNAIL HELPER - Generates Cloudinary thumbnail from video URL
const getShortThumbnail = (short: any) => {
  // Priority 1: Existing thumbnail URLs
  if (short.thumbnailUrl?.includes('cloudinary')) return short.thumbnailUrl;
  if (short.thumbnail?.includes('cloudinary')) return short.thumbnail;

  // Priority 2: Generate from video URL
  const videoUrl = short.videoUrl || short.video;
  if (videoUrl?.includes('cloudinary.com/')) {
    try {
      // Extract public ID: /upload/v123456/folder/video.mp4 -> folder/video
      const publicIdMatch = videoUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.(?:mp4|mov|webm|avi)/i);
      if (publicIdMatch) {
        const publicId = publicIdMatch[1];
        // Generate optimized thumbnail: first frame, 400x711 (9:16), auto quality
        return `https://res.cloudinary.com/dxuxxk0ss/video/upload/so_0,w_400,h_711,c_fill,q_auto:good,f_jpg/${publicId}.jpg`;
      }
    } catch (e) {
      console.error('Thumbnail generation error:', e);
    }
  }

  // Priority 3: Use video URL directly (shows first frame)
  if (videoUrl) return videoUrl;

  // Fallback
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 711" fill="%23000"%3E%3Ctext x="50%" y="50%" fill="%23666" font-size="20" text-anchor="middle"%3ENo Thumbnail%3C/text%3E%3C/svg%3E';
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

  // Fetch channel
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
            const updatedUser = { ...user, ...channelData, subscribers: channelData.subscribers };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            updateUser(updatedUser);
          }
        }
      } catch (error) {
        console.error("❌ Error fetching channel:", error);
        setChannel(null);
      } finally {
        setLoading(false);
      }
    };
    fetchChannel();
  }, [id, user?._id]);

  // Fetch videos
  useEffect(() => {
    const fetchVideos = async () => {
      if (!id || typeof id !== "string") return;
      try {
        setVideosLoading(true);
        const response = await axiosInstance.get(`/video/channel/${id}`);
        if (response.data.success && Array.isArray(response.data.data)) {
          setVideos(response.data.data);
        } else {
          setVideos([]);
        }
      } catch (error) {
        setVideos([]);
      } finally {
        setVideosLoading(false);
      }
    };
    fetchVideos();
  }, [id]);

  // 🔧 ENHANCED SHORTS FETCH - With thumbnail generation
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
          
          // Process with thumbnail generation
          const processedShorts = fetchedShorts.map((short: any) => {
            const videoUrl = short.videoUrl || short.video;
            let thumbnailUrl = short.thumbnailUrl || short.thumbnail;

            // Generate thumbnail if missing
            if (!thumbnailUrl && videoUrl?.includes('cloudinary.com')) {
              const publicIdMatch = videoUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.(?:mp4|mov|webm)/i);
              if (publicIdMatch) {
                thumbnailUrl = `https://res.cloudinary.com/dxuxxk0ss/video/upload/so_0,w_400,h_711,c_fill,q_auto/${publicIdMatch[1]}.jpg`;
              }
            }

            return {
              ...short,
              thumbnailUrl: thumbnailUrl || videoUrl,
              videoUrl: videoUrl,
              userId: short.userId || short.uploadedBy || {},
              views: short.views || 0
            };
          });

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
    setVideos((prev) => [newVideo, ...prev]);
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
    try {
      setIsInitiatingCall(true);
      const response = await axiosInstance.post("/call/initiate", { receiverId: id });
      if (!response.data.success) throw new Error("Failed to initiate call");
      const { call } = response.data;
      if (!isSocketConnected()) throw new Error("Socket not connected");
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
          remoteName: channel.name || channel.channelname,
          remoteImage: channel.image,
          initiator: "true",
        },
      });
    } catch (error: any) {
      setCallError(error.message || "Failed to initiate call");
      setTimeout(() => setCallError(null), 5000);
    } finally {
      setIsInitiatingCall(false);
    }
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
          <p className="text-gray-600 dark:text-gray-400 mb-4">This channel doesn't exist or has been removed.</p>
          <button onClick={() => router.push("/")} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Go Home</button>
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
          onAvatarUpdate={() => setRefreshKey(prev => prev + 1)}
        />

        {/* Channel Stats Bar */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Calendar className="w-5 h-5" />
              <span className="text-sm">Joined {channel.joinedon ? new Date(channel.joinedon).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Recently"}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Video className="w-5 h-5" />
              <span className="text-sm">{videos.length} videos</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Film className="w-5 h-5" />
              <span className="text-sm">{shorts.length} shorts</span>
            </div>
          </div>
        </div>

        {/* Upload Section (if own channel) */}
        {isOwnChannel && (
          <div className="px-6 py-6 max-w-7xl mx-auto">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex gap-0 mb-6 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab("videos")}
                  className="flex items-center gap-2 px-6 py-3.5 transition-all"
                  style={{
                    fontWeight: 500,
                    color: activeTab === "videos" ? "#2563eb" : "#6b7280",
                    borderBottom: activeTab === "videos" ? "3px solid #2563eb" : "3px solid transparent"
                  }}
                >
                  <Video className="w-5 h-5" />
                  Upload Videos
                </button>
                <button
                  onClick={() => setActiveTab("shorts")}
                  className="flex items-center gap-2 px-6 py-3.5 transition-all"
                  style={{
                    fontWeight: 500,
                    color: activeTab === "shorts" ? "#dc2626" : "#6b7280",
                    borderBottom: activeTab === "shorts" ? "3px solid #dc2626" : "3px solid transparent"
                  }}
                >
                  <Play className="w-5 h-5" />
                  Upload Shorts
                </button>
              </div>

              {activeTab === "videos" ? (
                <VideoUploader
                  channelId={id as string}
                  channelName={channel?.channelname || channel?.name}
                  onUploadSuccess={handleVideoUploadSuccess}
                />
              ) : (
                <div className="text-center py-8">
                  <div className="bg-red-100 dark:bg-red-900/20 rounded-xl p-8 max-w-md mx-auto">
                    <div className="w-16 h-16 bg-red-200 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8 text-red-600" fill="currentColor" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Upload Shorts</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Go to the Shorts section to upload vertical videos</p>
                    <button
                      onClick={() => router.push("/shorts/upload")}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center gap-2 mx-auto"
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
        <div className="px-6 pb-8 max-w-7xl mx-auto">
          <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setContentTab("videos")}
              className={`flex items-center gap-2 px-4 py-3 font-semibold transition-all relative ${
                contentTab === "videos" ? "text-blue-600" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Grid className="w-5 h-5" />
              Videos
              <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{videos.length}</span>
              {contentTab === "videos" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
            </button>
            <button
              onClick={() => setContentTab("shorts")}
              className={`flex items-center gap-2 px-4 py-3 font-semibold transition-all relative ${
                contentTab === "shorts" ? "text-red-600" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Film className="w-5 h-5" />
              Shorts
              <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{shorts.length}</span>
              {contentTab === "shorts" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />}
            </button>
          </div>

          {/* Videos Content */}
          {contentTab === "videos" && (
            videosLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading videos...</p>
              </div>
            ) : videos.length > 0 ? (
              <ChannelVideos videos={videos} />
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                  <Video className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No videos yet</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {isOwnChannel ? "Upload your first video to get started!" : "This channel hasn't uploaded any videos yet."}
                </p>
              </div>
            )
          )}

          {/* 🎬 SHORTS CONTENT - EXACT YOUTUBE STYLE WITH WORKING THUMBNAILS */}
          {contentTab === 'shorts' && (
            shortsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading shorts...</p>
              </div>
            ) : shortsError ? (
              <div className="text-center py-12">
                <div className="bg-red-100 dark:bg-red-900/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <Film className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Shorts</h3>
                <p className="text-red-600 mb-4">{shortsError}</p>
                <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">Retry</button>
              </div>
            ) : shorts.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shorts</h2>
                  <span className="text-sm text-gray-500">{shorts.length} short{shorts.length !== 1 ? 's' : ''}</span>
                </div>

                {/* COMPACT YOUTUBE GRID - 3 to 8 columns */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2">
                  {shorts.map((short) => (
                    <div
                      key={short._id}
                      onClick={() => router.push(`/shorts?id=${short._id}`)}
                      className="group cursor-pointer"
                    >
                      {/* Short Card */}
                      <div className="relative w-full rounded-xl overflow-hidden bg-black shadow-md hover:shadow-2xl transition-all">
                        {/* 9:16 Aspect Ratio */}
                        <div className="relative w-full" style={{ paddingBottom: '177.78%' }}>
                          <img
                            src={getShortThumbnail(short)}
                            alt={short.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              // Fallback chain: video URL -> placeholder
                              const target = e.currentTarget;
                              if (short.videoUrl && target.src !== short.videoUrl) {
                                target.src = short.videoUrl;
                              } else {
                                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 711" fill="%23222"%3E%3Crect width="400" height="711" fill="%23111"/%3E%3Ctext x="200" y="355" text-anchor="middle" fill="%23666" font-size="16"%3EShort%3C/text%3E%3C/svg%3E';
                              }
                            }}
                          />
                          
                          {/* Bottom gradient */}
                          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
                          
                          {/* Views badge */}
                          <div className="absolute bottom-2 left-2 bg-black/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Play className="w-2.5 h-2.5" fill="white" />
                            {(short.views || 0).toLocaleString()}
                          </div>
                          
                          {/* Duration */}
                          {short.duration && (
                            <div className="absolute bottom-2 right-2 bg-black/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                              {short.duration}s
                            </div>
                          )}
                          
                          {/* Play overlay */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all">
                              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-2xl">
                                <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Title */}
                      <div className="mt-2 px-1">
                        <h3 className="text-xs font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight group-hover:text-red-600 transition-colors">
                          {short.title}
                        </h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
                  <Film className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No shorts yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {isOwnChannel ? "Upload your first short to get started!" : "This channel hasn't uploaded any shorts yet."}
                </p>
                {isOwnChannel && (
                  <button
                    onClick={() => router.push('/shorts/upload')}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold inline-flex items-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Upload Short
                  </button>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelPage;