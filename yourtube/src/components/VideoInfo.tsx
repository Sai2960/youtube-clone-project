import React, { useEffect, useState, useRef, useCallback } from "react";
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
  const [isUpdatingNotification, setIsUpdatingNotification] = useState(false);

  // Mobile more menu state
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Portal mount state
  const [portalMounted, setPortalMounted] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const bellButtonRef = useRef<HTMLButtonElement>(null);

  // Ensure portal is mounted on client side
  useEffect(() => {
    setPortalMounted(true);
  }, []);

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
                  (item: any) => !item.reaction || item.reaction === "like",
                );
                dislikesArray = allVideos.filter(
                  (item: any) => item.reaction === "dislike",
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
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMoreMenu]);

  // Mobile menu body scroll lock
  useEffect(() => {
    if (showSubscribeMenu && typeof window !== "undefined") {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
    };
  }, [showSubscribeMenu]);

  // Fetch subscription status
  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      if (!videoUploaderId) return;

      try {
        const response = await axiosInstance.get(
          `/user/subscription-status/${videoUploaderId}`,
        );

        console.log("📊 Subscription status response:", response.data);

        if (response.data.success) {
          setIsSubscribed(response.data.isSubscribed || false);
          setSubscriberCount(response.data.subscriberCount || 0);
          // Load saved notification preference if available
          if (response.data.notificationPreference) {
            setNotificationPreference(response.data.notificationPreference);
          }

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
          `/like/check/${video._id}/${user._id}`,
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
        error.response?.data?.message || "Failed to update subscription",
      );
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsSubscribing(false);
    }
  };

  // Notification preference handler - Updated to persist and work correctly
  const handleNotificationChange = useCallback(
    async (pref: "all" | "personalized" | "none") => {
      if (isUpdatingNotification) return;

      console.log("🔔 Notification preference changing to:", pref);

      const previousPref = notificationPreference;
      setNotificationPreference(pref);
      setIsUpdatingNotification(true);

      try {
        // Make API call to save notification preference
        const response = await axiosInstance.post(
          `/user/notification-preference/${videoUploaderId}`,
          { preference: pref },
        );

        if (response.data.success) {
          console.log("✅ Notification preference updated:", pref);
          // Close menu after successful update with delay for visual feedback
          setTimeout(() => {
            setShowSubscribeMenu(false);
          }, 300);
        } else {
          // Revert on failure
          setNotificationPreference(previousPref);
          setError("Failed to update notification preference");
          setTimeout(() => setError(null), 3000);
        }
      } catch (error: any) {
        console.error("Error updating notification preference:", error);
        // Revert on error
        setNotificationPreference(previousPref);
        // If API doesn't exist yet, just close menu (for testing)
        if (error.response?.status === 404) {
          console.log("API endpoint not found, preference saved locally only");
          setTimeout(() => {
            setShowSubscribeMenu(false);
          }, 300);
        } else {
          setError("Failed to update notification preference");
          setTimeout(() => setError(null), 3000);
        }
      } finally {
        setIsUpdatingNotification(false);
      }
    },
    [videoUploaderId, notificationPreference, isUpdatingNotification],
  );

  // Bell icon click handler - Fixed to prevent navigation
  const handleBellClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("🔔 Bell clicked, toggling menu");
      setShowSubscribeMenu((prev) => !prev);
    },
    [],
  );

  // Close notification menu
  const closeNotificationMenu = useCallback(() => {
    setShowSubscribeMenu(false);
  }, []);

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

  const NotificationMenu = () => {
    if (!showSubscribeMenu || !portalMounted) return null;

    const menuContent = (
      <>
        {/* Mobile Bottom Sheet */}
        <div
          className="md:hidden fixed inset-0 yt-notification-sheet"
          style={{ zIndex: 999999 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeNotificationMenu}
            onTouchEnd={(e) => {
              e.preventDefault();
              closeNotificationMenu();
            }}
          />
          {/* Bottom Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a1a] rounded-t-[28px] shadow-2xl overflow-hidden"
            style={{
              animation: "slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
              maxHeight: "85vh",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle Bar */}
            <div className="flex justify-center py-4 bg-white dark:bg-[#1a1a1a]">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-neutral-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 pb-5 pt-1 border-b border-gray-100 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[19px] font-bold text-gray-900 dark:text-white tracking-tight">
                  Notifications
                </h3>
                <button
                  onClick={closeNotificationMenu}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    closeNotificationMenu();
                  }}
                  className="p-2.5 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-all active:scale-95"
                  type="button"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              <p className="text-[14px] text-gray-500 dark:text-gray-400">
                Choose how often you want to be notified
              </p>
            </div>

            {/* Options Container */}
            <div className="py-6 px-6 space-y-3">
              {/* All Option */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNotificationChange("all");
                }}
                disabled={isUpdatingNotification}
                className={`w-full px-5 py-4 flex items-center justify-center gap-3 rounded-2xl transition-all duration-200 border-2 ${
                  notificationPreference === "all"
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-400 dark:border-blue-500 shadow-lg shadow-blue-500/20"
                    : "bg-gray-50 dark:bg-neutral-800/80 border-gray-200 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-700/80 hover:border-gray-300 dark:hover:border-neutral-600"
                } ${
                  isUpdatingNotification ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <Bell
                  className={`w-5 h-5 ${
                    notificationPreference === "all"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                />
                <span
                  className={`font-semibold text-[15px] ${
                    notificationPreference === "all"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-200"
                  }`}
                >
                  All
                </span>
                {notificationPreference === "all" && (
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-auto"
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

              {/* Personalized Option */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNotificationChange("personalized");
                }}
                disabled={isUpdatingNotification}
                className={`w-full px-5 py-4 flex items-center justify-center gap-3 rounded-2xl transition-all duration-200 border-2 ${
                  notificationPreference === "personalized"
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-400 dark:border-blue-500 shadow-lg shadow-blue-500/20"
                    : "bg-gray-50 dark:bg-neutral-800/80 border-gray-200 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-700/80 hover:border-gray-300 dark:hover:border-neutral-600"
                } ${
                  isUpdatingNotification ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <Bell
                  className={`w-5 h-5 ${
                    notificationPreference === "personalized"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                />
                <span
                  className={`font-semibold text-[15px] ${
                    notificationPreference === "personalized"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-200"
                  }`}
                >
                  Personalized
                </span>
                {notificationPreference === "personalized" && (
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-auto"
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

              {/* None Option */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNotificationChange("none");
                }}
                disabled={isUpdatingNotification}
                className={`w-full px-5 py-4 flex items-center justify-center gap-3 rounded-2xl transition-all duration-200 border-2 ${
                  notificationPreference === "none"
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-400 dark:border-blue-500 shadow-lg shadow-blue-500/20"
                    : "bg-gray-50 dark:bg-neutral-800/80 border-gray-200 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-700/80 hover:border-gray-300 dark:hover:border-neutral-600"
                } ${
                  isUpdatingNotification ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <BellOff
                  className={`w-5 h-5 ${
                    notificationPreference === "none"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                />
                <span
                  className={`font-semibold text-[15px] ${
                    notificationPreference === "none"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-200"
                  }`}
                >
                  None
                </span>
                {notificationPreference === "none" && (
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400 ml-auto"
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
            </div>

            {/* Unsubscribe Section */}
            <div className="border-t border-gray-100 dark:border-neutral-800 px-6 py-5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  closeNotificationMenu();
                  setTimeout(() => setShowUnsubscribeModal(true), 100);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  closeNotificationMenu();
                  setTimeout(() => setShowUnsubscribeModal(true), 100);
                }}
                className="w-full py-4 px-5 text-center text-red-600 dark:text-red-400 font-semibold text-[15px] rounded-2xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 active:bg-red-200 dark:active:bg-red-900/40 transition-all border-2 border-red-200 dark:border-red-800/50"
              >
                Unsubscribe
              </button>
            </div>

            {/* Safe area padding for iOS */}
            <div
              className="bg-white dark:bg-[#1a1a1a]"
              style={{ height: "env(safe-area-inset-bottom, 0px)" }}
            />
          </div>
        </div>

        {/* Desktop Dropdown */}
        <div
          className="hidden md:block fixed inset-0"
          style={{ zIndex: 999999 }}
        >
          {/* Invisible backdrop */}
          <div className="absolute inset-0" onClick={closeNotificationMenu} />
          {/* Dropdown positioned relative to bell button */}
          <div
            className="absolute bg-white dark:bg-[#212121] rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-700/80 overflow-hidden"
            style={{
              width: "300px",
              top: bellButtonRef.current
                ? bellButtonRef.current.getBoundingClientRect().bottom + 12
                : "100px",
              left: bellButtonRef.current
                ? Math.min(
                    bellButtonRef.current.getBoundingClientRect().left,
                    window.innerWidth - 316,
                  )
                : "100px",
              animation: "fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
              boxShadow:
                "0 20px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-neutral-700/80 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-neutral-800/80 dark:to-neutral-800/50">
              <h4 className="text-[15px] font-bold text-gray-900 dark:text-white tracking-tight">
                Notification Preferences
              </h4>
            </div>

            {/* Options */}
            <div className="py-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNotificationChange("all");
                }}
                disabled={isUpdatingNotification}
                className={`w-full px-5 py-3.5 flex items-center gap-4 transition-all duration-200 ${
                  notificationPreference === "all"
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "hover:bg-gray-50 dark:hover:bg-neutral-700/50"
                } ${
                  isUpdatingNotification ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    notificationPreference === "all"
                      ? "bg-blue-100 dark:bg-blue-900/40"
                      : "bg-gray-100 dark:bg-neutral-700"
                  }`}
                >
                  <Bell
                    className={`w-4 h-4 ${
                      notificationPreference === "all"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  />
                </div>
                <span
                  className={`flex-1 text-left text-[14px] ${
                    notificationPreference === "all"
                      ? "text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-gray-700 dark:text-gray-300 font-medium"
                  }`}
                >
                  All
                </span>
                {notificationPreference === "all" && (
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
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
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNotificationChange("personalized");
                }}
                disabled={isUpdatingNotification}
                className={`w-full px-5 py-3.5 flex items-center gap-4 transition-all duration-200 ${
                  notificationPreference === "personalized"
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "hover:bg-gray-50 dark:hover:bg-neutral-700/50"
                } ${
                  isUpdatingNotification ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    notificationPreference === "personalized"
                      ? "bg-blue-100 dark:bg-blue-900/40"
                      : "bg-gray-100 dark:bg-neutral-700"
                  }`}
                >
                  <Bell
                    className={`w-4 h-4 ${
                      notificationPreference === "personalized"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  />
                </div>
                <span
                  className={`flex-1 text-left text-[14px] ${
                    notificationPreference === "personalized"
                      ? "text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-gray-700 dark:text-gray-300 font-medium"
                  }`}
                >
                  Personalized
                </span>
                {notificationPreference === "personalized" && (
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
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
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNotificationChange("none");
                }}
                disabled={isUpdatingNotification}
                className={`w-full px-5 py-3.5 flex items-center gap-4 transition-all duration-200 ${
                  notificationPreference === "none"
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "hover:bg-gray-50 dark:hover:bg-neutral-700/50"
                } ${
                  isUpdatingNotification ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    notificationPreference === "none"
                      ? "bg-blue-100 dark:bg-blue-900/40"
                      : "bg-gray-100 dark:bg-neutral-700"
                  }`}
                >
                  <BellOff
                    className={`w-4 h-4 ${
                      notificationPreference === "none"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  />
                </div>
                <span
                  className={`flex-1 text-left text-[14px] ${
                    notificationPreference === "none"
                      ? "text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-gray-700 dark:text-gray-300 font-medium"
                  }`}
                >
                  None
                </span>
                {notificationPreference === "none" && (
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
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
            </div>

            {/* Unsubscribe */}
            <div className="border-t border-gray-100 dark:border-neutral-700/80 p-3">
              <button
                type="button"
                onClick={() => {
                  closeNotificationMenu();
                  setShowUnsubscribeModal(true);
                }}
                className="w-full px-4 py-3 text-center text-[14px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-semibold rounded-xl"
              >
                Unsubscribe
              </button>
            </div>
          </div>
        </div>
      </>
    );

    return ReactDOM.createPortal(menuContent, document.body);
  };

  return (
    <div className="w-full space-y-0 overflow-x-hidden bg-white dark:bg-[#0f0f0f]">
      {/* Premium Animation Keyframes */}
      <style jsx global>{`
        @keyframes slideUpSheet {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @keyframes pulse-glow {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
          }
        }

        @keyframes like-bounce {
          0%,
          100% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.25);
          }
          50% {
            transform: scale(0.95);
          }
          75% {
            transform: scale(1.1);
          }
        }

        @keyframes dislike-bounce {
          0%,
          100% {
            transform: scale(1) rotate(0deg);
          }
          25% {
            transform: scale(1.2) rotate(-10deg);
          }
          50% {
            transform: scale(0.95) rotate(5deg);
          }
          75% {
            transform: scale(1.1) rotate(-3deg);
          }
        }

        @keyframes ripple-effect {
          0% {
            transform: scale(0);
            opacity: 0.6;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }

        .animate-like-bounce {
          animation: like-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-dislike-bounce {
          animation: dislike-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-ripple-effect {
          animation: ripple-effect 0.6s ease-out forwards;
        }

        /* Premium button hover effects */
        .premium-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .premium-btn::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }

        .premium-btn:hover::before {
          transform: translateX(100%);
        }

        .premium-btn:active {
          transform: scale(0.97);
        }

        /* Glass morphism effect */
        .glass-effect {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        /* Smooth scrollbar hide for mobile */
        .hide-scrollbar::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none !important;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }

        /* Mobile Like/Dislike premium animations */
        @media (max-width: 768px) {
          @keyframes mobile-like-pulse {
            0% {
              transform: scale(1);
            }
            30% {
              transform: scale(1.35);
              filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.7));
            }
            60% {
              transform: scale(0.9);
            }
            100% {
              transform: scale(1);
            }
          }

          @keyframes mobile-dislike-pulse {
            0% {
              transform: scale(1) rotate(0deg);
            }
            30% {
              transform: scale(1.35) rotate(-12deg);
              filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.7));
            }
            60% {
              transform: scale(0.9) rotate(5deg);
            }
            100% {
              transform: scale(1) rotate(0deg);
            }
          }

          @keyframes mobile-ripple {
            0% {
              transform: scale(0);
              opacity: 0.7;
            }
            100% {
              transform: scale(3.5);
              opacity: 0;
            }
          }

          .mobile-like-animate {
            animation: mobile-like-pulse 0.65s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .mobile-dislike-animate {
            animation: mobile-dislike-pulse 0.65s
              cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .mobile-like-ripple {
            animation: mobile-ripple 0.7s ease-out forwards;
          }

          .mobile-dislike-ripple {
            animation: mobile-ripple 0.7s ease-out forwards;
          }
        }

        /* Premium Subscribe button animation */
        .subscribe-btn {
          background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
          transition: all 0.3s ease;
        }

        .subscribe-btn:hover {
          background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .dark .subscribe-btn {
          background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%);
        }

        .dark .subscribe-btn:hover {
          background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
        }

        .subscribed-btn {
          background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        }

        .dark .subscribed-btn {
          background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
        }
      `}</style>

      {/* Premium Error Toast */}
      {error && (
        <div
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999999] px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-3"
          style={{
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "white",
            boxShadow: "0 10px 40px rgba(239, 68, 68, 0.4)",
            animation: "fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          {error}
        </div>
      )}

      {/* 1. Title and Views Section - Premium Design */}
      <div className="px-4 pt-4 pb-2 md:px-0 md:pt-0">
        <h1 className="text-[18px] md:text-[22px] font-bold text-gray-900 dark:text-white mb-2 leading-tight line-clamp-2 tracking-tight">
          {video.videotitle}
        </h1>
        <div className="flex items-center gap-2 text-[13px] text-gray-600 dark:text-gray-400 font-medium">
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            {formatViews(video?.views || 0)}
          </span>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <span>
            {video?.createdAt ? formatTimeAgo(video.createdAt) : "Recently"}
          </span>
        </div>
      </div>

      {/* 2. Channel Row - Premium Aligned Design */}
      <div className="px-4 py-3 md:px-0 md:pt-4">
        <div className="flex items-center justify-between md:border-b border-gray-100 dark:border-neutral-800/80 md:pb-4">
          {/* Channel Info */}
          <div
            onClick={handleChannelClick}
            className="flex items-center gap-3.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800/60 rounded-xl p-2 -ml-2 transition-all duration-200 group flex-1 min-w-0"
          >
            <Avatar className="w-11 h-11 flex-shrink-0 ring-2 ring-gray-100 dark:ring-neutral-700 group-hover:ring-blue-400 dark:group-hover:ring-blue-500 transition-all duration-300 shadow-md">
              <AvatarImage
                key={`videoinfo-avatar-${imageKey}`}
                src={getImageUrl(
                  video?.uploadedBy?.image || video?.videoowner?.image,
                  true,
                )}
                alt={video.videochanel || "Channel"}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-neutral-700 dark:to-neutral-800 text-gray-700 dark:text-white text-sm font-bold">
                {video.videochanel ? video.videochanel[0]?.toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-[15px] text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                {video.uploadedBy?.channelname ||
                  video.uploadedBy?.name ||
                  video.videochanel ||
                  "Unknown Channel"}
              </h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                {subscriberCount > 0
                  ? `${subscriberCount.toLocaleString()} subscribers`
                  : "0 subscribers"}
              </p>
            </div>
          </div>

          {/* Subscribe + Bell Buttons */}
          {!isOwner && user && videoUploaderId && (
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {/* Mobile Subscribe Button */}
              <Button
                onClick={handleSubscribe}
                disabled={isSubscribing}
                className={`md:hidden h-10 px-5 rounded-full font-bold text-[14px] transition-all duration-300 whitespace-nowrap shadow-lg ${
                  isSubscribed
                    ? "subscribed-btn text-gray-800 dark:text-white border border-gray-200 dark:border-neutral-600"
                    : "subscribe-btn text-white dark:text-gray-900"
                } ${isSubscribing ? "opacity-70 cursor-not-allowed" : "active:scale-95"}`}
              >
                {isSubscribing ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  </span>
                ) : (
                  <span>{isSubscribed ? "Subscribed" : "Subscribe"}</span>
                )}
              </Button>

              {/* Desktop Subscribe Button */}
              <Button
                onClick={handleSubscribe}
                disabled={isSubscribing}
                className={`hidden md:flex h-10 px-5 rounded-full font-bold text-[14px] transition-all duration-300 whitespace-nowrap shadow-lg ${
                  isSubscribed
                    ? "subscribed-btn text-gray-800 dark:text-white border border-gray-200 dark:border-neutral-600"
                    : "subscribe-btn text-white dark:text-gray-900"
                } ${isSubscribing ? "opacity-70 cursor-not-allowed" : "hover:-translate-y-0.5 active:scale-95"}`}
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

              {/* Bell Button - Premium Design */}
              {isSubscribed && (
                <button
                  ref={bellButtonRef}
                  type="button"
                  onClick={handleBellClick}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleBellClick(e);
                  }}
                  className="h-10 w-10 rounded-full bg-gray-100 dark:bg-neutral-700/80 hover:bg-gray-200 dark:hover:bg-neutral-600 transition-all duration-300 flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-neutral-600 shadow-md hover:shadow-lg active:scale-95"
                  title="Notification preferences"
                >
                  {notificationPreference === "none" ? (
                    <BellOff className="w-[18px] h-[18px] text-gray-600 dark:text-white" />
                  ) : (
                    <Bell className="w-[18px] h-[18px] text-gray-600 dark:text-white" />
                  )}
                </button>
              )}
            </div>
          )}

          {/* Desktop Action Buttons - Premium Design */}
          <div className="hidden md:flex items-center gap-2.5 flex-shrink-0 ml-4">
            {/* Like/Dislike Group */}
            <div className="flex items-center bg-gray-100 dark:bg-neutral-800/90 rounded-full overflow-hidden shadow-md border border-gray-200/50 dark:border-neutral-700/50">
              <button
                className={`premium-btn relative px-5 py-2.5 flex items-center gap-2.5 transition-all duration-300 ${
                  isLiked
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                    : "text-gray-700 dark:text-white hover:bg-gray-200/70 dark:hover:bg-neutral-700/70"
                } overflow-hidden`}
                onClick={handleLike}
                disabled={!user}
              >
                {likeRipple && (
                  <span className="absolute inset-0 animate-ripple-effect bg-blue-500/40 rounded-full pointer-events-none" />
                )}
                <ThumbsUp
                  className={`w-5 h-5 relative z-10 transition-all duration-300 ${likeAnimation ? "animate-like-bounce" : ""}`}
                  fill={isLiked ? "currentColor" : "none"}
                  strokeWidth={2}
                />
                <span className="text-[14px] font-semibold tabular-nums relative z-10">
                  {likes}
                </span>
              </button>
              <div className="w-[1px] h-7 bg-gray-300 dark:bg-neutral-600" />
              <button
                className={`premium-btn relative px-5 py-2.5 transition-all duration-300 ${
                  isDisliked
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                    : "text-gray-700 dark:text-white hover:bg-gray-200/70 dark:hover:bg-neutral-700/70"
                } overflow-hidden`}
                onClick={handleDislike}
                disabled={!user}
              >
                {dislikeRipple && (
                  <span className="absolute inset-0 animate-ripple-effect bg-blue-500/40 rounded-full pointer-events-none" />
                )}
                <ThumbsDown
                  className={`w-5 h-5 relative z-10 transition-all duration-300 ${dislikeAnimation ? "animate-dislike-bounce" : ""}`}
                  fill={isDisliked ? "currentColor" : "none"}
                  strokeWidth={2}
                />
              </button>
            </div>

            {/* Share Button */}
            <button
              className="premium-btn px-5 py-2.5 bg-gray-100 dark:bg-neutral-800/90 rounded-full flex items-center gap-2.5 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-neutral-700 transition-all duration-300 shadow-md border border-gray-200/50 dark:border-neutral-700/50 flex-shrink-0"
              onClick={handleShare}
            >
              <Share2 className="w-5 h-5" strokeWidth={2} />
              <span className="text-[14px] font-semibold">Share</span>
            </button>

            {/* Download Button */}
            {user && (
              <DownloadButton
                videoId={video._id}
                videoTitle={video.videotitle}
                quality="480p"
                variant="compact"
              />
            )}

            {/* Save Button */}
            {user && (
              <button
                className={`premium-btn px-5 py-2.5 bg-gray-100 dark:bg-neutral-800/90 rounded-full flex items-center gap-2.5 transition-all duration-300 shadow-md border border-gray-200/50 dark:border-neutral-700/50 flex-shrink-0 ${
                  isWatchLater
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                    : "text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-neutral-700"
                }`}
                onClick={handleWatchLater}
              >
                <Bookmark
                  className="w-5 h-5"
                  fill={isWatchLater ? "currentColor" : "none"}
                  strokeWidth={2}
                />
                <span className="text-[14px] font-semibold">
                  {isWatchLater ? "Saved" : "Save"}
                </span>
              </button>
            )}

            {/* Delete Button */}
            {isOwner && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="premium-btn px-5 py-2.5 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center gap-2.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-300 shadow-md border border-red-200/50 dark:border-red-800/50 flex-shrink-0"
              >
                <Trash2 className="w-5 h-5" strokeWidth={2} />
                <span className="text-[14px] font-semibold">Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Action Buttons - Premium Horizontal Design */}
      <div className="md:hidden px-4 py-4 bg-white dark:bg-[#0f0f0f] border-b border-gray-100 dark:border-neutral-800/80">
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-5 overflow-x-auto hide-scrollbar pb-1"
        >
          {/* Like Button */}
          <button
            className={`relative flex items-center gap-2.5 transition-all duration-300 flex-shrink-0 ${
              isLiked
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-700 dark:text-white"
            } active:scale-95`}
            onClick={handleLike}
            disabled={!user}
          >
            {likeRipple && (
              <span className="absolute inset-0 mobile-like-ripple bg-blue-500/40 rounded-full pointer-events-none z-0" />
            )}
            <div className="relative">
              <ThumbsUp
                className={`w-6 h-6 relative z-10 transition-all duration-300 ${
                  likeAnimation ? "mobile-like-animate" : ""
                }`}
                fill={isLiked ? "currentColor" : "none"}
                strokeWidth={2}
              />
            </div>
            <span className="text-[14px] font-semibold tabular-nums whitespace-nowrap">
              {likes}
            </span>
          </button>

          {/* Dislike Button */}
          <button
            className={`relative flex items-center transition-all duration-300 flex-shrink-0 ${
              isDisliked
                ? "text-red-500 dark:text-red-400"
                : "text-gray-700 dark:text-white"
            } active:scale-95`}
            onClick={handleDislike}
            disabled={!user}
          >
            {dislikeRipple && (
              <span className="absolute inset-0 mobile-dislike-ripple bg-red-500/40 rounded-full pointer-events-none z-0" />
            )}
            <ThumbsDown
              className={`w-6 h-6 relative z-10 transition-all duration-300 ${
                dislikeAnimation ? "mobile-dislike-animate" : ""
              }`}
              fill={isDisliked ? "currentColor" : "none"}
              strokeWidth={2}
            />
          </button>

          {/* Share Button */}
          <button
            className="flex items-center gap-2.5 text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-white/80 transition-all duration-200 flex-shrink-0 active:scale-95"
            onClick={handleShare}
          >
            <Share2 className="w-6 h-6" strokeWidth={2} />
            <span className="text-[14px] font-semibold whitespace-nowrap">
              Share
            </span>
          </button>

          {/* Download Button */}
          {user && (
            <button
              className="flex items-center gap-2.5 text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-white/80 transition-all duration-200 flex-shrink-0 active:scale-95"
              onClick={handleDownload}
            >
              <Download className="w-6 h-6" strokeWidth={2} />
              <span className="text-[14px] font-semibold whitespace-nowrap">
                Download
              </span>
            </button>
          )}

          {/* Save Button */}
          {user && (
            <button
              className={`flex items-center gap-2.5 transition-all duration-200 flex-shrink-0 active:scale-95 ${
                isWatchLater
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-700 dark:text-white"
              }`}
              onClick={handleWatchLater}
            >
              <Bookmark
                className="w-6 h-6"
                fill={isWatchLater ? "currentColor" : "none"}
                strokeWidth={2}
              />
              <span className="text-[14px] font-semibold whitespace-nowrap">
                Save
              </span>
            </button>
          )}

          {/* Delete Button */}
          {user && isOwner && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 flex-shrink-0 active:scale-95"
            >
              <Trash2 className="w-6 h-6" strokeWidth={2} />
              <span className="text-[14px] font-semibold whitespace-nowrap">
                Delete
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Description - Premium Card Design */}
      <div className="px-4 md:px-0 overflow-hidden">
        <div
          className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-neutral-800/60 dark:to-neutral-800/40 rounded-2xl p-4 cursor-pointer hover:from-gray-100 hover:to-gray-150 dark:hover:from-neutral-700/60 dark:hover:to-neutral-700/40 transition-all duration-300 mt-4 max-w-full overflow-hidden border border-gray-200/50 dark:border-neutral-700/50 shadow-sm"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          <div className="flex flex-wrap gap-2.5 text-[13px] font-bold text-gray-800 dark:text-white mb-3">
            <span>{formatViews(video?.views || 0)} views</span>
            <span className="text-gray-400 dark:text-gray-500">•</span>
            <span className="text-gray-600 dark:text-gray-300">
              {video?.createdAt ? formatTimeAgo(video.createdAt) : "Recently"}
            </span>
          </div>
          <div
            className={`text-[14px] text-gray-800 dark:text-gray-200 max-w-full leading-relaxed ${
              showFullDescription ? "" : "line-clamp-2"
            }`}
          >
            <p
              className="whitespace-pre-wrap max-w-full"
              style={{
                wordBreak: "break-word",
                overflowWrap: "anywhere",
              }}
            >
              {video.videodescription || "No description"}
            </p>
          </div>
          <button className="text-[14px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 mt-3 hover:text-gray-900 dark:hover:text-white transition-colors duration-200">
            {showFullDescription ? "Show less" : "...more"}
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${
                showFullDescription ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Notification Menu Portal */}
      <NotificationMenu />

      {/* Unsubscribe Modal - Premium Design */}
      {showUnsubscribeModal &&
        portalMounted &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{ zIndex: 9999999 }}
          >
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={() => setShowUnsubscribeModal(false)}
            />

            <div
              className="relative bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-2xl max-w-sm w-full p-7 space-y-6 border border-gray-200/50 dark:border-neutral-700/50"
              style={{
                animation: "fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.35)",
              }}
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
                  <Bell className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Unsubscribe?
                </h3>
                <p className="text-[14px] text-gray-500 dark:text-gray-400">
                  Unsubscribe from {video.videochanel || "this channel"}?
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => setShowUnsubscribeModal(false)}
                  className="px-6 py-3 text-[14px] font-semibold text-gray-700 dark:text-white bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 rounded-full transition-all duration-300 border border-gray-200 dark:border-neutral-600"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubscribe}
                  disabled={isSubscribing}
                  className="px-6 py-3 text-[14px] font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full transition-all duration-300 shadow-lg shadow-blue-500/30"
                >
                  {isSubscribing ? "Unsubscribing..." : "Unsubscribe"}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Delete Confirmation Modal - Premium Design */}
      {showDeleteModal &&
        portalMounted &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center p-4"
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
              className="absolute inset-0 bg-black/70 dark:bg-black/80 backdrop-blur-md"
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

            {/* Modal */}
            <div
              className="relative bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200/50 dark:border-neutral-700/50"
              onClick={(e) => e.stopPropagation()}
              style={{
                zIndex: 2,
                animation: "fadeInScale 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.35)",
              }}
            >
              {/* Header */}
              <div className="px-7 pt-7 pb-5">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-red-500 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                  Delete Video?
                </h3>
              </div>

              {/* Content */}
              <div className="px-7 pb-5">
                <p className="text-[14px] text-gray-600 dark:text-gray-400 text-center mb-4">
                  This will permanently delete:
                </p>
                <p
                  className="text-[14px] text-red-600 dark:text-red-400 font-semibold text-center break-words bg-red-50 dark:bg-red-500/10 px-4 py-3 rounded-xl border border-red-200 dark:border-red-500/30"
                  style={{
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  &quot;{video.videotitle}&quot;
                </p>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-4 text-center flex items-center justify-center gap-2">
                  <span className="text-amber-500 text-lg">⚠️</span>
                  This action cannot be undone.
                </p>
              </div>

              {/* Footer with Buttons */}
              <div className="px-7 pb-7 pt-3 flex justify-center gap-3 bg-gray-50/50 dark:bg-neutral-800/30">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-3 rounded-full bg-gray-100 dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-neutral-600 font-semibold text-[14px] transition-all duration-300"
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
          </div>,
          document.body,
        )}
    </div>
  );
};

export default VideoInfo;
