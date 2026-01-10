import React, { useEffect, useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Share2,
  ThumbsDown,
  ThumbsUp,
  ChevronDown,
  Bell,
  BellOff,
  Bookmark,
  Download,
  MoreVertical,
  Trash2,
  X,
} from "lucide-react";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";
import axiosInstance from "@/lib/axiosinstance";
import DeleteVideoButton from "./DeleteVideoButton";
import DownloadButton from "./DownloadButton";
import { formatViews, formatTimeAgo } from "@/lib/formatUtils";
import { getImageUrl } from "@/lib/imageUtils";
import ReactDOM from "react-dom";

interface VideoInfoProps {
  video: any;
  onShare?: (currentTime?: number) => void;
}

const VideoInfo = ({ video, onShare }: VideoInfoProps) => {
  const router = useRouter();
  const { user } = useUser();

  // State declarations
  const [likes, setLikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation states
  const [likeAnimation, setLikeAnimation] = useState(false);
  const [dislikeAnimation, setDislikeAnimation] = useState(false);
  const [likeRipple, setLikeRipple] = useState(false);
  const [dislikeRipple, setDislikeRipple] = useState(false);

  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Avatar image reload state
  const [imageKey, setImageKey] = useState(Date.now());

  // Subscription state
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showSubscribeMenu, setShowSubscribeMenu] = useState(false);
  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notificationPreference, setNotificationPreference] = useState<
    "all" | "personalized" | "none"
  >("all");

  // Mobile more menu state
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  // Helper functions
  const getUserId = () => {
    if (!user) {
      console.log("❌ No user logged in");
      return null;
    }
    const id = user._id || user.id;
    console.log("👤 Current User:", {
      id: id,
      email: user.email,
      name: user.name,
      fullUser: user,
    });
    return id;
  };

  const getVideoUploaderId = () => {
    if (!video) {
      console.log("❌ No video data");
      return null;
    }

    const uploaderId =
      video.uploadedBy?._id ||
      video.uploadedBy?.id ||
      video.uploadedBy ||
      video.user?._id ||
      video.user?.id ||
      video.user ||
      video.videoowner?._id ||
      video.videoowner?.id ||
      video.videoowner;

    console.log("🎥 Video Uploader:", {
      uploaderId: uploaderId,
      videoId: video._id,
      videoTitle: video.videotitle,
      uploadedByRaw: video.uploadedBy,
      userRaw: video.user,
      videoownerRaw: video.videoowner,
    });

    return uploaderId;
  };

  const currentUserId = getUserId();
  const videoUploaderId = getVideoUploaderId();

  const isOwner = (() => {
    if (!currentUserId) {
      console.log("❌ isOwner = false: User not logged in");
      return false;
    }

    if (!videoUploaderId) {
      console.log("❌ isOwner = false: Video uploader ID not found");
      return false;
    }

    const userId = String(currentUserId).trim();
    const uploaderId = String(videoUploaderId).trim();
    const match = userId === uploaderId;

    console.log("🔐 OWNERSHIP CHECK:", {
      currentUserId: userId,
      videoUploaderId: uploaderId,
      match: match,
      comparison: `"${userId}" === "${uploaderId}"`,
      result: match ? "✅ USER OWNS VIDEO" : "❌ NOT OWNER",
    });

    return match;
  })();
  const handleChannelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const channelId = video?.uploadedBy?._id || video?.uploadedBy;
    if (channelId) {
      router.push(`/channel/${channelId}`);
    }
  };

  // Avatar update listener
  useEffect(() => {
    const handleAvatarUpdate = () => {
      console.log("🔄 Avatar updated, refreshing video info");
      setImageKey(Date.now());
    };
    window.addEventListener("avatarUpdated", handleAvatarUpdate);
    return () =>
      window.removeEventListener("avatarUpdated", handleAvatarUpdate);
  }, []);

  // Refetch reaction status on route change
  useEffect(() => {
    const handleRouteChange = () => {
      if (user?._id && video?._id) {
        axiosInstance
          .get(`/like/${user._id}`)
          .then((response) => {
            if (response.data.success) {
              let likesArray = response.data.likes || [];
              let dislikesArray = response.data.dislikes || [];

              if (likesArray.length === 0 && response.data.videos) {
                const allVideos =
                  response.data.videos || response.data.data || [];
                likesArray = allVideos.filter(
                  (item: any) => !item.reaction || item.reaction === "like"
                );
                dislikesArray = allVideos.filter(
                  (item: any) => item.reaction === "dislike"
                );
              }

              const videoIsLiked = likesArray.some((item: any) => {
                const videoId = item.videoid?._id || item.videoid;
                return String(videoId) === String(video._id);
              });

              const videoIsDisliked = dislikesArray.some((item: any) => {
                const videoId = item.videoid?._id || item.videoid;
                return String(videoId) === String(video._id);
              });

              setIsLiked(videoIsLiked);
              setIsDisliked(videoIsDisliked);
            }
          })
          .catch((error) => {
            console.error("Error refetching reactions:", error);
          });
      }
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events, user?._id, video?._id]);
  // Scroll indicator effect
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;

      const hasMoreContent = scrollWidth > clientWidth;
      const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 10;

      setShowScrollIndicator(hasMoreContent && !isAtEnd);
    };

    container.addEventListener("scroll", handleScroll);
    const timeoutId = setTimeout(handleScroll, 100);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, [video._id]);

  // Resize observer for scroll indicator
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const scrollLeft = container.scrollLeft;

      const hasMoreContent = scrollWidth > clientWidth;
      const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 10;

      setShowScrollIndicator(hasMoreContent && !isAtEnd);
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [user, isOwner]);

  // Click outside menu handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowSubscribeMenu(false);
        setShowMoreMenu(false);
      }
    };
    if (showSubscribeMenu || showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSubscribeMenu, showMoreMenu]);

  // Mobile menu body scroll lock
  useEffect(() => {
    if (
      (showSubscribeMenu || showMoreMenu) &&
      typeof window !== "undefined" &&
      window.innerWidth < 768
    ) {
      document.body.classList.add("notification-open");
    } else {
      document.body.classList.remove("notification-open");
    }
    return () => {
      document.body.classList.remove("notification-open");
    };
  }, [showSubscribeMenu, showMoreMenu]);
  // Fetch subscription status
  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (!videoUploaderId) return;

      try {
        const response = await axiosInstance.get(
          `/user/subscription-status/${videoUploaderId}`
        );

        console.log("📊 Subscription status response:", response.data);

        if (response.data.success) {
          setIsSubscribed(response.data.isSubscribed || false);
          setSubscriberCount(response.data.subscriberCount || 0);

          console.log("✅ Subscriber count updated:", {
            subscriberCount: response.data.subscriberCount,
            isSubscribed: response.data.isSubscribed,
          });
        }
      } catch (error: any) {
        console.error("Error fetching subscription status:", error);
        setSubscriberCount(0);
      }
    };

    fetchSubscriptionStatus();

    const handleUserChange = () => {
      fetchSubscriptionStatus();
    };

    window.addEventListener("userUpdated", handleUserChange);

    return () => {
      window.removeEventListener("userUpdated", handleUserChange);
    };
  }, [videoUploaderId, user?._id]);

  // Refresh subscriber count when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      if (videoUploaderId) {
        axiosInstance
          .get(`/user/subscription-status/${videoUploaderId}`)
          .then((response) => {
            if (response.data.success) {
              setSubscriberCount(response.data.subscriberCount || 0);
            }
          })
          .catch((error) => {
            console.error("Error refreshing subscriber count:", error);
          });
      }
    };

    router.events.on("routeChangeComplete", handleRouteChange);

    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events, videoUploaderId]);
  // Fetch reaction status (likes/dislikes)
  useEffect(() => {
    const fetchReactionStatus = async () => {
      if (!user?._id || !video?._id) {
        setIsLiked(false);
        setIsDisliked(false);
        return;
      }

      try {
        const response = await axiosInstance.get(
          `/like/check/${video._id}/${user._id}`
        );

        console.log("🔍 Reaction check response:", response.data);

        if (response.data.success) {
          setIsLiked(response.data.liked || false);
          setIsDisliked(response.data.disliked || false);

          if (response.data.video) {
            setLikes(response.data.video.Like || 0);
            setDislikes(response.data.video.Dislike || 0);
          }

          console.log("✅ Reaction state loaded:", {
            videoId: video._id,
            isLiked: response.data.liked,
            isDisliked: response.data.disliked,
            likes: response.data.video?.Like,
            dislikes: response.data.video?.Dislike,
          });
        }
      } catch (error: any) {
        console.error("Error fetching reaction status:", error);
        setIsLiked(false);
        setIsDisliked(false);
      }
    };

    fetchReactionStatus();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchReactionStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?._id, video?._id, router.asPath]);

  // Update likes/dislikes counts
  useEffect(() => {
    if (video?._id) {
      setLikes(video.Like || 0);
      setDislikes(video.Dislike || 0);
    }
  }, [video?._id, video?.Like, video?.Dislike]);

  // DEBUG: Monitor like/dislike changes
  useEffect(() => {
    console.log("📊 Like/Dislike State:", {
      videoId: video._id,
      likes,
      dislikes,
      isLiked,
      isDisliked,
      backendLikes: video.Like,
      backendDislikes: video.Dislike,
    });
  }, [
    likes,
    dislikes,
    isLiked,
    isDisliked,
    video._id,
    video.Like,
    video.Dislike,
  ]);

  // Track video views
  useEffect(() => {
    const handleViews = async () => {
      if (!video?._id) return;
      try {
        if (user?._id) {
          await axiosInstance.post(`/history/video/${video._id}`, {
            userId: user._id,
            watchDuration: 0,
            watchPercentage: 0,
          });
        } else {
          await axiosInstance.post(`/history/views/${video._id}`);
        }
      } catch (error: any) {
        console.log("View tracking error");
      }
    };
    handleViews();
  }, [user, video?._id]);
  // Subscribe/Unsubscribe handler
  const handleSubscribe = async () => {
    if (!user) {
      setError("Please log in to subscribe");
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (!videoUploaderId) {
      setError("Channel not found");
      return;
    }
    setIsSubscribing(true);
    setError(null);
    try {
      const endpoint = isSubscribed
        ? `/user/unsubscribe/${videoUploaderId}`
        : `/user/subscribe/${videoUploaderId}`;
      const response = await axiosInstance.post(endpoint);
      if (response.data.success) {
        setIsSubscribed(response.data.isSubscribed);
        setSubscriberCount(response.data.subscriberCount);
        setShowSubscribeMenu(false);
        setShowUnsubscribeModal(false);
      }
    } catch (error: any) {
      console.error("Subscription error:", error);
      setError(
        error.response?.data?.message || "Failed to update subscription"
      );
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSubscribing(false);
    }
  };

  // Notification preference handler
  const handleNotificationChange = (pref: "all" | "personalized" | "none") => {
    setNotificationPreference(pref);
    setShowSubscribeMenu(false);
  };

  // Bell icon click handler
  const handleBellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSubscribeMenu(!showSubscribeMenu);
  };
  // Like button handler
  const handleLike = async () => {
    if (!user?._id) {
      setError("Please log in to like videos");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (likeAnimation) return;

    try {
      setError(null);
      setLikeAnimation(true);
      setLikeRipple(true);

      const res = await axiosInstance.post(`/like/video/${video._id}`, {
        userId: user._id,
        isLike: true,
      });

      console.log("✅ Server Response:", res.data);

      if (res.data.success) {
        setLikes(res.data.likes);
        setDislikes(res.data.dislikes);
        setIsLiked(res.data.liked);
        setIsDisliked(res.data.disliked);

        console.log("✅ UI updated:", {
          likes: res.data.likes,
          dislikes: res.data.dislikes,
          liked: res.data.liked,
          disliked: res.data.disliked,
        });
      }

      setTimeout(() => {
        setLikeAnimation(false);
        setLikeRipple(false);
      }, 650);
    } catch (error: any) {
      console.error("❌ Like error:", error);
      setError(error.response?.data?.message || "Failed to like video");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Dislike button handler
  const handleDislike = async () => {
    if (!user?._id) {
      setError("Please log in to dislike videos");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (dislikeAnimation) return;

    try {
      setError(null);
      setDislikeAnimation(true);
      setDislikeRipple(true);

      const res = await axiosInstance.post(`/like/video/${video._id}`, {
        userId: user._id,
        isLike: false,
      });

      console.log("✅ Server Response:", res.data);

      if (res.data.success) {
        setLikes(res.data.likes);
        setDislikes(res.data.dislikes);
        setIsLiked(res.data.liked);
        setIsDisliked(res.data.disliked);

        console.log("✅ UI updated:", {
          likes: res.data.likes,
          dislikes: res.data.dislikes,
          liked: res.data.liked,
          disliked: res.data.disliked,
        });
      }

      setTimeout(() => {
        setDislikeAnimation(false);
        setDislikeRipple(false);
      }, 650);
    } catch (error: any) {
      console.error("❌ Dislike error:", error);
      setError(error.response?.data?.message || "Failed to dislike video");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Download handler
  const handleDownload = async () => {
    if (!user?._id) {
      setError("Please log in to download videos");
      setTimeout(() => setError(null), 3000);
      return;
    }
    try {
      const response = await axiosInstance.get(`/video/download/${video._id}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${video.videotitle}.mp4`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      console.error("Download error:", error);
      setError("Failed to download video");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Watch later handler
  const handleWatchLater = async () => {
    if (!user?._id) {
      setError("Please log in to save videos");
      setTimeout(() => setError(null), 3000);
      return;
    }
    try {
      setError(null);
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user._id,
      });
      if (res.data.success) {
        setIsWatchLater(res.data.watchlater);
        setShowMoreMenu(false);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || "Failed to save");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Share handler
  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      const videoUrl = `${window.location.origin}/watch/${video._id}`;
      if (navigator.share) {
        navigator.share({
          title: video.videotitle,
          url: videoUrl,
        });
      } else {
        navigator.clipboard.writeText(videoUrl).then(() => {
          alert("Link copied!");
        });
      }
    }
  };

  // Video deleted handler
  const handleVideoDeleted = () => {
    setShowMoreMenu(false);
    window.location.href = "/";
  };
  return (
    <div className="w-full space-y-0 overflow-x-hidden bg-white dark:bg-[#0f0f0f]">
      {/* 1. Title and Views Section */}
      <div className="px-3 pt-3 pb-1 md:px-0 md:pt-0">
        <h1 className="text-[18px] md:text-xl font-semibold text-youtube-primary mb-1 leading-snug line-clamp-2">
          {video.videotitle}
        </h1>
        <div className="flex items-center gap-2 text-xs text-youtube-secondary font-medium">
          <span className="font-medium">{formatViews(video?.views || 0)}</span>
          <span>•</span>
          <span>
            {video?.createdAt ? formatTimeAgo(video.createdAt) : "Recently"}
          </span>
        </div>
      </div>

      {/* 2. Channel Row (Avatar, Name, Subscribe) */}
      <div className="px-3 py-2 md:px-0 md:pt-3">
        <div className="flex items-center justify-between md:border-b border-youtube dark:border-neutral-800 md:pb-3">
          <div
            onClick={handleChannelClick}
            className="flex items-center gap-3 cursor-pointer hover:bg-youtube-hover dark:hover:bg-neutral-800 rounded-lg p-2 -ml-2 transition-colors group flex-1 min-w-0"
          >
            <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-transparent group-hover:ring-blue-500 transition-all">
              <AvatarImage
                key={`videoinfo-avatar-${imageKey}`}
                src={getImageUrl(
                  video?.uploadedBy?.image || video?.videoowner?.image,
                  true
                )}
                alt={video.videochanel || "Channel"}
              />
              <AvatarFallback className="bg-youtube-hover dark:bg-neutral-800 text-youtube-primary text-sm font-medium">
                {video.videochanel ? video.videochanel[0]?.toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-[15px] text-youtube-primary truncate group-hover:text-blue-600 transition-colors">
                {video.uploadedBy?.channelname ||
                  video.uploadedBy?.name ||
                  video.videochanel ||
                  "Unknown Channel"}
              </h3>
              <p className="text-xs text-youtube-secondary truncate">
                {subscriberCount > 0
                  ? `${subscriberCount.toLocaleString()} subscribers`
                  : "0 subscribers"}
              </p>
            </div>
          </div>

          {/* Subscribe + Bell */}
          {!isOwner && user && videoUploaderId && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={handleSubscribe}
                disabled={isSubscribing}
                className={`h-9 px-4 rounded-full font-semibold text-sm transition-all whitespace-nowrap ${
                  isSubscribed
                    ? "bg-youtube-hover dark:bg-neutral-800 hover:bg-youtube-tertiary dark:hover:bg-neutral-700 text-youtube-primary"
                    : "bg-white hover:bg-gray-100 text-black dark:bg-white dark:text-black"
                } ${isSubscribing ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isSubscribing ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">
                      {isSubscribed ? "Unsubscribing" : "Subscribing"}
                    </span>
                  </span>
                ) : (
                  <span>{isSubscribed ? "Subscribed" : "Subscribe"}</span>
                )}
              </Button>

              {isSubscribed && (
                <div className="relative" ref={menuRef}>
                  <Button
                    onClick={handleBellClick}
                    className="h-9 w-9 p-0 rounded-full bg-youtube-hover dark:bg-neutral-800 hover:bg-youtube-tertiary dark:hover:bg-neutral-700 transition-all flex items-center justify-center flex-shrink-0"
                    title="Notification preferences"
                  >
                    {notificationPreference === "none" ? (
                      <BellOff className="w-5 h-5 text-youtube-primary" />
                    ) : (
                      <Bell className="w-5 h-5 text-youtube-primary" />
                    )}
                  </Button>
                  {showSubscribeMenu && (
                    <>
                      <div
                        className="md:hidden fixed inset-0 bg-black/50 z-[9998]"
                        onClick={() => setShowSubscribeMenu(false)}
                      />
                      <div
                        className="hidden md:block fixed inset-0 z-[9998]"
                        onClick={() => setShowSubscribeMenu(false)}
                      />
                      <div
                        className="fixed md:absolute bottom-0 md:bottom-auto left-0 right-0 md:left-auto md:right-0 w-full md:w-64 bg-youtube-secondary dark:bg-neutral-900 rounded-t-2xl md:rounded-xl shadow-2xl border-t md:border border-youtube dark:border-neutral-800 py-2 z-[9999] animate-in slide-in-from-bottom md:slide-in-from-top-2 fade-in duration-200 max-h-[70vh] overflow-y-auto"
                        style={
                          typeof window !== "undefined" &&
                          window.innerWidth >= 768
                            ? { top: "calc(100% + 8px)" }
                            : {}
                        }
                      >
                        <div className="md:hidden flex justify-center py-2">
                          <div className="w-10 h-1 bg-youtube-disabled dark:bg-neutral-700 rounded-full" />
                        </div>
                        <div className="px-4 py-2 text-xs text-youtube-disabled dark:text-neutral-500 font-semibold uppercase tracking-wide">
                          Notifications
                        </div>
                        <button
                          onClick={() => handleNotificationChange("all")}
                          className={`w-full px-4 py-3 text-left hover:bg-youtube-hover dark:hover:bg-neutral-800 flex items-start gap-3 transition-colors ${
                            notificationPreference === "all"
                              ? "bg-youtube-hover dark:bg-neutral-800"
                              : ""
                          }`}
                        >
                          <Bell className="w-5 h-5 text-youtube-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-youtube-primary">
                              All
                            </div>
                          </div>
                          {notificationPreference === "all" && (
                            <svg
                              className="w-5 h-5 text-youtube-primary flex-shrink-0 mt-0.5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() =>
                            handleNotificationChange("personalized")
                          }
                          className={`w-full px-4 py-3 text-left hover:bg-youtube-hover dark:hover:bg-neutral-800 flex items-start gap-3 transition-colors ${
                            notificationPreference === "personalized"
                              ? "bg-youtube-hover dark:bg-neutral-800"
                              : ""
                          }`}
                        >
                          <Bell className="w-5 h-5 text-youtube-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-youtube-primary">
                              Personalized
                            </div>
                          </div>
                          {notificationPreference === "personalized" && (
                            <svg
                              className="w-5 h-5 text-youtube-primary flex-shrink-0 mt-0.5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleNotificationChange("none")}
                          className={`w-full px-4 py-3 text-left hover:bg-youtube-hover dark:hover:bg-neutral-800 flex items-start gap-3 transition-colors ${
                            notificationPreference === "none"
                              ? "bg-youtube-hover dark:bg-neutral-800"
                              : ""
                          }`}
                        >
                          <BellOff className="w-5 h-5 text-youtube-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-youtube-primary">
                              None
                            </div>
                          </div>
                          {notificationPreference === "none" && (
                            <svg
                              className="w-5 h-5 text-youtube-primary flex-shrink-0 mt-0.5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                        <div className="border-t border-youtube dark:border-neutral-800 my-2"></div>
                        <button
                          onClick={() => {
                            setShowSubscribeMenu(false);
                            setShowUnsubscribeModal(true);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-youtube-hover dark:hover:bg-neutral-800 text-youtube-primary font-medium transition-colors text-sm"
                        >
                          Unsubscribe
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0 ml-4">
            <div className="flex items-center bg-youtube-secondary dark:bg-neutral-800 rounded-full overflow-hidden shadow-sm">
              <button
                className={`relative px-4 py-2 flex items-center gap-2 transition-all duration-200 ${
                  isLiked
                    ? "text-blue-600 dark:text-blue-500"
                    : "text-youtube-primary"
                } ${
                  likeAnimation ? "animate-like-bounce" : ""
                } overflow-hidden hover:bg-youtube-hover dark:hover:bg-neutral-700/50`}
                onClick={handleLike}
                disabled={!user}
              >
                {likeRipple && (
                  <span className="absolute inset-0 animate-ripple-effect bg-blue-500/30 rounded-full pointer-events-none" />
                )}
                <ThumbsUp
                  className="w-5 h-5 relative z-10"
                  fill={isLiked ? "currentColor" : "none"}
                  strokeWidth={2.5}
                />
                <span className="text-sm font-medium tabular-nums relative z-10">
                  {likes}
                </span>
              </button>
              <div className="w-px h-6 bg-youtube dark:bg-neutral-700" />
              <button
                className={`relative px-4 py-2 transition-all duration-200 ${
                  isDisliked
                    ? "text-blue-600 dark:text-blue-500"
                    : "text-youtube-primary"
                } ${
                  dislikeAnimation ? "animate-dislike-bounce" : ""
                } overflow-hidden hover:bg-youtube-hover dark:hover:bg-neutral-700/50`}
                onClick={handleDislike}
                disabled={!user}
              >
                {dislikeRipple && (
                  <span className="absolute inset-0 animate-ripple-effect bg-blue-500/30 rounded-full pointer-events-none" />
                )}
                <ThumbsDown
                  className="w-5 h-5 relative z-10"
                  fill={isDisliked ? "currentColor" : "none"}
                  strokeWidth={2.5}
                />
              </button>
            </div>

            <button
              className="px-4 py-2 bg-youtube-secondary dark:bg-neutral-800 rounded-full flex items-center gap-2 text-youtube-primary hover:bg-youtube-hover dark:hover:bg-neutral-700 transition-all active:scale-95 shadow-sm flex-shrink-0"
              onClick={handleShare}
            >
              <Share2 className="w-5 h-5" />
              <span className="text-sm font-medium">Share</span>
            </button>

            {user && (
              <DownloadButton
                videoId={video._id}
                videoTitle={video.videotitle}
                quality="480p"
                variant="compact"
              />
            )}

            {user && (
              <button
                className={`px-4 py-2 bg-youtube-secondary dark:bg-neutral-800 rounded-full flex items-center gap-2 hover:bg-youtube-hover dark:hover:bg-neutral-700 transition-all active:scale-95 shadow-sm flex-shrink-0 ${
                  isWatchLater
                    ? "text-blue-600 dark:text-blue-500"
                    : "text-youtube-primary"
                }`}
                onClick={handleWatchLater}
              >
                <Bookmark
                  className="w-5 h-5"
                  fill={isWatchLater ? "currentColor" : "none"}
                />
                <span className="text-sm font-medium">
                  {isWatchLater ? "Saved" : "Save"}
                </span>
              </button>
            )}

            {isOwner && (
              <DeleteVideoButton
                videoId={video._id}
                videoTitle={video.videotitle}
                onDeleted={handleVideoDeleted}
                variant="icon"
              />
            )}
          </div>
        </div>
      </div>
      {/* Mobile Action Buttons - YouTube Flat Design */}
      <div className="md:hidden px-3 py-3 bg-white dark:bg-[#0f0f0f] border-b border-gray-200 dark:border-neutral-800">
        <div
          className="flex items-center gap-4 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Like Button - Standalone with count */}
          <button
            className={`relative flex items-center gap-2.5 transition-all duration-200 flex-shrink-0 ${
              isLiked
                ? "text-[#065fd4] dark:text-[#3EA6FF]"
                : "text-gray-700 dark:text-white"
            } hover:text-gray-900 dark:hover:text-white/80 active:scale-95 overflow-hidden`}
            onClick={handleLike}
            disabled={!user}
          >
            {likeRipple && (
              <span className="absolute inset-0 mobile-like-ripple bg-[#065fd4]/50 dark:bg-[#3EA6FF]/50 rounded-full pointer-events-none z-0" />
            )}
            <ThumbsUp
              className={`w-6 h-6 relative z-10 transition-all duration-200 ${
                likeAnimation ? "mobile-like-animate" : ""
              }`}
              fill={isLiked ? "currentColor" : "none"}
              strokeWidth={2}
            />
            <span
              className={`text-sm font-medium tabular-nums whitespace-nowrap relative z-10 transition-all duration-200 ${
                isLiked ? "text-[#065fd4] dark:text-[#3EA6FF]" : ""
              }`}
            >
              {likes}
            </span>
          </button>

          {/* Dislike Button - Standalone */}
          <button
            className={`relative flex items-center transition-all duration-200 flex-shrink-0 ${
              isDisliked
                ? "text-red-600 dark:text-red-500"
                : "text-gray-700 dark:text-white"
            } hover:text-gray-900 dark:hover:text-white/80 active:scale-95 overflow-hidden`}
            onClick={handleDislike}
            disabled={!user}
          >
            {dislikeRipple && (
              <span className="absolute inset-0 mobile-dislike-ripple bg-red-600/50 dark:bg-red-500/50 rounded-full pointer-events-none z-0" />
            )}
            <ThumbsDown
              className={`w-6 h-6 relative z-10 transition-all duration-200 ${
                dislikeAnimation ? "mobile-dislike-animate" : ""
              }`}
              fill={isDisliked ? "currentColor" : "none"}
              strokeWidth={2}
            />
          </button>

          {/* Share Button */}
          <button
            className="flex items-center gap-2.5 text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-white/80 transition-colors flex-shrink-0 active:scale-95"
            onClick={handleShare}
          >
            <Share2 className="w-6 h-6" strokeWidth={2} />
            <span className="text-sm font-medium whitespace-nowrap">Share</span>
          </button>

          {/* Download Button */}
          {user && (
            <button
              className="flex items-center gap-2.5 text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-white/80 transition-colors flex-shrink-0 active:scale-95"
              onClick={handleDownload}
            >
              <Download className="w-6 h-6" strokeWidth={2} />
              <span className="text-sm font-medium whitespace-nowrap">
                Download
              </span>
            </button>
          )}

          {/* Save Button */}
          {user && (
            <button
              className={`flex items-center gap-2.5 transition-colors flex-shrink-0 active:scale-95 ${
                isWatchLater
                  ? "text-[#065fd4] dark:text-[#3EA6FF]"
                  : "text-gray-700 dark:text-white"
              } hover:text-gray-900 dark:hover:text-white/80`}
              onClick={handleWatchLater}
            >
              <Bookmark
                className="w-6 h-6"
                fill={isWatchLater ? "currentColor" : "none"}
                strokeWidth={2}
              />
              <span className="text-sm font-medium whitespace-nowrap">
                Save
              </span>
            </button>
          )}

          {user && isOwner && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2.5 text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors flex-shrink-0 active:scale-95"
            >
              <Trash2 className="w-6 h-6" strokeWidth={2} />
              <span className="text-sm font-medium whitespace-nowrap">
                Delete
              </span>
            </button>
          )}
          {/* More Menu (Non-Owners) */}
          {user && !isOwner && (
            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-white/80 transition-colors active:scale-95"
              >
                <MoreVertical className="w-6 h-6" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scrollbar styling */}
      <style jsx global>{`
        .md\\:hidden .flex.items-center.gap-4::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        .md\\:hidden .flex.items-center.gap-4 {
          -ms-overflow-style: none;
          scrollbar-width: none !important;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }

        /* Remove any dots/indicators on mobile */
        @media (max-width: 768px) {
          .overflow-x-auto::after,
          .overflow-x-auto::before {
            display: none !important;
          }

          /* Mobile-only Like/Dislike animations */
          @keyframes mobile-like-pulse {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.4);
              filter: drop-shadow(0 0 8px rgba(6, 95, 212, 0.6));
            }
            100% {
              transform: scale(1);
            }
          }

          @keyframes mobile-dislike-pulse {
            0% {
              transform: scale(1) rotate(0deg);
            }
            50% {
              transform: scale(1.4) rotate(-15deg);
              filter: drop-shadow(0 0 8px rgba(220, 38, 38, 0.6));
            }
            100% {
              transform: scale(1) rotate(0deg);
            }
          }

          @keyframes mobile-like-ripple {
            0% {
              transform: scale(0);
              opacity: 0.8;
            }
            50% {
              opacity: 0.5;
            }
            100% {
              transform: scale(3);
              opacity: 0;
            }
          }

          @keyframes mobile-dislike-ripple {
            0% {
              transform: scale(0);
              opacity: 0.8;
            }
            50% {
              opacity: 0.5;
            }
            100% {
              transform: scale(3);
              opacity: 0;
            }
          }

          .mobile-like-animate {
            animation: mobile-like-pulse 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .mobile-dislike-animate {
            animation: mobile-dislike-pulse 0.6s
              cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .mobile-like-ripple {
            animation: mobile-like-ripple 0.7s ease-out forwards;
          }

          .mobile-dislike-ripple {
            animation: mobile-dislike-ripple 0.7s ease-out forwards;
          }
        }
      `}</style>
      {/* Description */}
      <div className="px-3 md:px-0">
        <div
          className="bg-youtube-secondary dark:bg-neutral-800/50 rounded-xl p-3 cursor-pointer hover:bg-youtube-hover dark:hover:bg-neutral-800 transition-colors mt-3"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          <div className="flex gap-2 text-xs font-semibold text-youtube-primary mb-2">
            <span>{formatViews(video?.views || 0)} views</span>
            <span>•</span>
            <span>
              {video?.createdAt ? formatTimeAgo(video.createdAt) : "Recently"}
            </span>
          </div>
          <div
            className={`text-sm text-youtube-primary ${
              showFullDescription ? "" : "line-clamp-2"
            }`}
          >
            <p className="whitespace-pre-wrap">
              {video.videodescription || "No description"}
            </p>
          </div>
          <button className="text-sm font-semibold text-youtube-primary flex items-center gap-1 mt-2">
            {showFullDescription ? "Show less" : "...more"}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                showFullDescription ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>
      {/* Unsubscribe Modal */}
      {showUnsubscribeModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowUnsubscribeModal(false)}
          />

          <div className="relative bg-youtube-secondary dark:bg-neutral-900 rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-semibold text-youtube-primary text-center">
              Unsubscribe from {video.videochanel || "this channel"}?
            </h3>

            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setShowUnsubscribeModal(false)}
                className="px-4 py-2 text-sm font-medium text-youtube-primary hover:bg-youtube-hover dark:hover:bg-neutral-800 rounded-full transition-colors"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubscribe}
                disabled={isSubscribing}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
              >
                {isSubscribing ? "Unsubscribing..." : "Unsubscribe"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal - Desktop & Mobile with Portal */}
      {typeof window !== "undefined" &&
        showDeleteModal &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100vw",
              height: "100vh",
              zIndex: 2147483647,
              isolation: "isolate",
            }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowDeleteModal(false)}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                zIndex: 1,
              }}
            />

            {/* Modal Container - DESKTOP */}
            <div
              className="hidden md:flex fixed inset-0 items-center justify-center p-4"
              style={{ zIndex: 2 }}
            >
              <div
                className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-neutral-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
                    Delete Video?
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-neutral-400 text-center leading-relaxed">
                      Are you sure you want to delete
                    </p>
                    <div className="max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                      <p
                        className="text-sm font-semibold text-gray-900 dark:text-white leading-relaxed text-center"
                        style={{
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        &quot;{video.videotitle}&quot;
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-neutral-400 text-center leading-relaxed">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="flex-shrink-0 px-6 pb-6 pt-4 border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="px-6 py-2 rounded-lg bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 hover:bg-gray-200 dark:hover:bg-neutral-700 font-medium text-sm transition-all"
                    >
                      Cancel
                    </button>
                    <DeleteVideoButton
                      videoId={video._id}
                      videoTitle={video.videotitle}
                      onDeleted={() => {
                        setShowDeleteModal(false);
                        handleVideoDeleted();
                      }}
                      variant="modal"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Container - MOBILE */}
            <div
              className="md:hidden flex fixed inset-0 items-center justify-center p-4"
              style={{ zIndex: 2 }}
            >
              <div
                className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxHeight: "85vh",
                  height: "auto",
                  minHeight: "300px",
                }}
              >
                <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-neutral-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
                    Delete Video?
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600 dark:text-neutral-400 text-center leading-relaxed">
                      Are you sure you want to delete
                    </p>
                    <div className="max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                      <p
                        className="text-sm font-semibold text-white leading-relaxed"
                        style={{
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        &quot;{video.videotitle}&quot;
                      </p>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-neutral-400 text-center leading-relaxed">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                {/* Footer - ALWAYS VISIBLE */}
                <div className="flex-shrink-0 px-6 pb-6 pt-4 border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="px-6 py-2 rounded-lg bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 hover:bg-gray-200 dark:hover:bg-neutral-700 font-medium text-sm transition-all"
                    >
                      Cancel
                    </button>
                    <DeleteVideoButton
                      videoId={video._id}
                      videoTitle={video.videotitle}
                      onDeleted={() => {
                        setShowDeleteModal(false);
                        handleVideoDeleted();
                      }}
                      variant="modal"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        /* Webkit browsers (Chrome, Safari, Edge) */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(243, 244, 246, 0.5);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.6);
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.8);
          background-clip: padding-box;
        }

        /* Dark mode scrollbar - IMPROVED */
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(64, 64, 64, 0.3);
        }

        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.5);
        }

        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.7);
        }

        /* Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.6) rgba(243, 244, 246, 0.5);
        }

        .dark .custom-scrollbar {
          scrollbar-color: rgba(156, 163, 175, 0.5) rgba(64, 64, 64, 0.3);
        }
      `}</style>
    </div>
  );
};

export default VideoInfo;
