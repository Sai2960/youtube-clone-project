// components/ui/ShortPlayer.tsx - COMPLETE WITH UNIFIED AVATAR UTILS

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Share2,
  MoreVertical,
  Volume2,
  VolumeX,
  Play,
  Trash2,
  AlertTriangle,
  Flag,
  X,
} from "lucide-react";
import CommentsModal from "./CommentsModal";
import ShareModal from "./ShareModal";
import ShortTranslation from "./ShortTranslation";
import { getShortAvatar, getShortChannelName } from "@/lib/imageUtils";
import { getImageUrl } from "@/lib/imageUtils";

interface ShortPlayerProps {
  short: {
    _id: string;
    title: string;
    description: string;
    videoUrl: string;
    views: number;
    likesCount: number;
    dislikesCount: number;
    commentsCount: number;
    shares: number;
    originalLanguage?: string;
    userId: {
      _id: string;
      name: string;
      avatar?: string | null;
      image?: string | null;
      channelName?: string;
      channelname?: string;
      subscribers?: number;
    };
    channelName: string;
    channelAvatar?: string | null;
    hasLiked?: boolean;
    hasDisliked?: boolean;
    isSubscribed?: boolean;
  };
  isActive: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onDelete?: (shortId: string) => void;
}

const DEFAULT_AVATAR_SVG =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';

const ShortPlayer: React.FC<ShortPlayerProps> = ({
  short,
  isActive,
  onNext,
  onPrevious,
  onDelete,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isModalOpenRef = useRef(false);

    const touchStartYRef = useRef(0);
  const touchEndYRef = useRef(0);
  const touchMoveCountRef = useRef(0);
  const lastNavigationTimeRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [hasLiked, setHasLiked] = useState(short.hasLiked || false);
  const [hasDisliked, setHasDisliked] = useState(short.hasDisliked || false);
  const [likesCount, setLikesCount] = useState(short.likesCount || 0);
  const [dislikesCount, setDislikesCount] = useState(short.dislikesCount || 0);
  const [sharesCount, setSharesCount] = useState(short.shares || 0);
  const [commentsCount, setCommentsCount] = useState(short.commentsCount || 0);
  const [viewsCount, setViewsCount] = useState(short.views || 0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribersCount, setSubscribersCount] = useState(
    short.userId.subscribers || 0
  );
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  // Translation states
  const [translatedTitle, setTranslatedTitle] = useState(short.title);
  const [translatedDescription, setTranslatedDescription] = useState(
    short.description
  );
  const [currentTranslation, setCurrentTranslation] = useState<{
    language: string;
    title: string;
    description: string;
  } | null>(null);

  // Touch/drag states
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartTimeRef = useRef<number>(0);

  // Report states
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  // ✅ USE UTILITY FUNCTIONS FOR AVATAR & CHANNEL NAME
  const channelAvatar = getShortAvatar(short);
  const channelName = getShortChannelName(short);

  const getApiUrl = () =>
    process.env.NEXT_PUBLIC_API_URL || "http://${process.env.NEXT_PUBLIC_BACKEND_URL||"https://youtube-clone-project-q3pd.onrender.com"}";

  // Translation handlers
  const handleTranslated = (
    title: string,
    description: string,
    language: string
  ) => {
    setTranslatedTitle(title);
    setTranslatedDescription(description);
    setCurrentTranslation({ language, title, description });
  };

  const showOriginal = () => {
    setTranslatedTitle(short.title);
    setTranslatedDescription(short.description);
    setCurrentTranslation(null);
  };
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);

  // Add this useEffect (place it after other useEffect hooks):
  useEffect(() => {
    const handleAvatarUpdate = () => {
      console.log("🔄 ShortPlayer: Avatar update event detected!");
      setAvatarRefreshKey((prev) => prev + 1);
    };

    window.addEventListener("avatarUpdated", handleAvatarUpdate);
    window.addEventListener("storage", handleAvatarUpdate);

    return () => {
      window.removeEventListener("avatarUpdated", handleAvatarUpdate);
      window.removeEventListener("storage", handleAvatarUpdate);
    };
  }, []);

  // Update modal ref
  useEffect(() => {
    isModalOpenRef.current =
      showDeleteConfirm ||
      showComments ||
      showShareModal ||
      showMenu ||
      showReportModal ||
      showVolumeSlider;
  }, [
    showDeleteConfirm,
    showComments,
    showShareModal,
    showMenu,
    showReportModal,
    showVolumeSlider,
  ]);

  useEffect(() => {
  // Track short view in history
  const trackShortView = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !short._id) return;

      // Get userId from token
      const payload = JSON.parse(atob(token.split(".")[1]));
      const userId = payload.userId || payload.id;

      if (!userId) return;

      const apiUrl = getApiUrl();
      
      // Add to history
      await axios.post(
        `${apiUrl}/history/short/${short._id}`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Short added to history:', short._id);
    } catch (error) {
      console.error("Error tracking short view:", error);
    }
  };

  // Only track if this short is active
  if (isActive && short._id) {
    // Add a small delay to ensure user actually watched
    const timer = setTimeout(() => {
      trackShortView();
    }, 1000); // Track after 1 second of viewing

    return () => clearTimeout(timer);
  }
}, [isActive, short._id]);

  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const userId = payload.userId || payload.id;
        setCurrentUserId(userId);
        checkSubscriptionStatus(userId);
      } catch (error) {
        console.error("Error parsing token:", error);
      }
    }
  }, [short.userId._id]);

  const checkSubscriptionStatus = async (userId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !userId) return;

      const apiUrl = getApiUrl();
      const response = await axios.get(`${apiUrl}/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success && response.data.result) {
        const subscribedChannels =
          response.data.result.subscribedChannels || [];
        const isSubbed = subscribedChannels.some(
          (channelId: string) => channelId === short.userId._id
        );
        setIsSubscribed(isSubbed);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive && !isModalOpenRef.current) {
      // Critical: Set attributes for mobile
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('x5-playsinline', 'true');
      
      // Ensure muted for autoplay policy
      const shouldMute = isMuted;
      video.muted = shouldMute;
      
      // Use RAF for smoother start
      requestAnimationFrame(() => {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              // Restore sound after successful play
              if (!shouldMute) {
                setTimeout(() => {
                  video.muted = false;
                }, 150);
              }
            })
            .catch((err) => {
              console.log("Autoplay prevented, trying muted:", err);
              // Fallback: force mute and retry
              video.muted = true;
              video.play()
                .then(() => setIsPlaying(true))
                .catch(() => setIsPlaying(false));
            });
        }
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive, isMuted]);

  // ✅ ADD: Passive event listener fix
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventDefaultTouch = (e: TouchEvent) => {
      if (isModalOpenRef.current) return;
      
      const target = e.target as HTMLElement;
      // Don't prevent on buttons, inputs, or scrollable content
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('.volume-control') ||
        target.closest('[class*="Modal"]')
      ) {
        return;
      }
      
      // Only prevent vertical scroll
      const touch = e.touches[0];
      const deltaY = Math.abs(touch.clientY - touchStartYRef.current);
      const deltaX = Math.abs(touch.clientX - (touchStartYRef.current || 0));
      
      if (deltaY > deltaX && deltaY > 10) {
        e.preventDefault();
      }
    };

    // Use non-passive listener to allow preventDefault
    container.addEventListener('touchmove', preventDefaultTouch, { passive: false });
    
    return () => {
      container.removeEventListener('touchmove', preventDefaultTouch);
    };
  }, []);

  // ✅ ADD: Prevent modal interference
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isModalOpenRef.current && isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else if (!isModalOpenRef.current && isActive && !isPlaying) {
      const timer = setTimeout(() => {
        video.play()
          .then(() => setIsPlaying(true))
          .catch(() => {});
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isModalOpenRef.current, isActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVideoEnd = () => {
      if (!isModalOpenRef.current) {
        onNext();
      }
    };

    video.addEventListener("ended", handleVideoEnd);
    return () => video.removeEventListener("ended", handleVideoEnd);
  }, [onNext]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu && !(event.target as Element).closest(".menu-button")) {
        setShowMenu(false);
      }
      if (
        showVolumeSlider &&
        !(event.target as Element).closest(".volume-control")
      ) {
        setShowVolumeSlider(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu, showVolumeSlider]);

  // Touch/Mouse handlers
 // ✅ OPTIMIZED Touch/Mouse handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isModalOpenRef.current) return;
    
    const y = e.targetTouches[0].clientY;
    touchStartYRef.current = y;
    touchEndYRef.current = y;
    setTouchStart(y);
    setTouchEnd(y);
    dragStartTimeRef.current = Date.now();
    touchMoveCountRef.current = 0;
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isModalOpenRef.current) return;
    
    // Throttle: only process every 3rd move event
    touchMoveCountRef.current++;
    if (touchMoveCountRef.current % 3 !== 0) return;
    
    const y = e.targetTouches[0].clientY;
    touchEndYRef.current = y;
    setTouchEnd(y);

    const distance = Math.abs(touchStartYRef.current - y);
    if (distance > 15) { // Increased threshold
      setIsDragging(true);
    }
  };

  const handleTouchEnd = () => {
    if (isModalOpenRef.current) return;

    const distance = touchStartYRef.current - touchEndYRef.current;
    const minSwipeDistance = 60; // Increased from 50
    const dragDuration = Date.now() - dragStartTimeRef.current;
    const velocity = Math.abs(distance) / (dragDuration + 1);
    
    // Throttle navigation (prevent rapid swipes)
    const timeSinceLastNav = Date.now() - lastNavigationTimeRef.current;
    if (timeSinceLastNav < 400) { // 400ms cooldown
      setIsDragging(false);
      setTouchStart(0);
      setTouchEnd(0);
      touchMoveCountRef.current = 0;
      return;
    }

    // More forgiving swipe detection
    if (
      Math.abs(distance) > minSwipeDistance &&
      dragDuration < 700 && // Increased from 600
      velocity > 0.25 // Reduced from 0.3
    ) {
      lastNavigationTimeRef.current = Date.now();
      setIsDragging(false);
      
      // Use RAF for smoother transition
      requestAnimationFrame(() => {
        if (distance > 0) {
          onNext();
        } else {
          onPrevious();
        }
      });
    } else {
      setIsDragging(false);
    }

    setTouchStart(0);
    setTouchEnd(0);
    touchMoveCountRef.current = 0;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isModalOpenRef.current) return;
    const y = e.clientY;
    touchStartYRef.current = y;
    touchEndYRef.current = y;
    setTouchStart(y);
    setTouchEnd(y);
    dragStartTimeRef.current = Date.now();
    touchMoveCountRef.current = 0;
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isModalOpenRef.current || touchStartYRef.current === 0) return;
    
    touchMoveCountRef.current++;
    if (touchMoveCountRef.current % 2 !== 0) return;
    
    const y = e.clientY;
    touchEndYRef.current = y;
    setTouchEnd(y);

    const distance = Math.abs(touchStartYRef.current - y);
    if (distance > 15) {
      setIsDragging(true);
    }
  };

  const handleMouseUp = () => {
    if (isModalOpenRef.current) return;

    const distance = touchStartYRef.current - touchEndYRef.current;
    const minSwipeDistance = 60;
    const dragDuration = Date.now() - dragStartTimeRef.current;
    const velocity = Math.abs(distance) / (dragDuration + 1);
    
    const timeSinceLastNav = Date.now() - lastNavigationTimeRef.current;
    if (timeSinceLastNav < 400) {
      setIsDragging(false);
      setTouchStart(0);
      setTouchEnd(0);
      touchMoveCountRef.current = 0;
      touchStartYRef.current = 0;
      touchEndYRef.current = 0;
      return;
    }

    if (
      Math.abs(distance) > minSwipeDistance &&
      dragDuration < 700 &&
      velocity > 0.25
    ) {
      lastNavigationTimeRef.current = Date.now();
      setIsDragging(false);
      
      requestAnimationFrame(() => {
        if (distance > 0) {
          onNext();
        } else {
          onPrevious();
        }
      });
    } else {
      setIsDragging(false);
    }

    setTouchStart(0);
    setTouchEnd(0);
    touchMoveCountRef.current = 0;
    touchStartYRef.current = 0;
    touchEndYRef.current = 0;
  };

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isModalOpenRef.current || isDragging) return;

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current
          .play()
          .catch((err) => console.error("Play error:", err));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      if (newMutedState) {
        setShowVolumeSlider(false);
      }
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      if (newVolume === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const toggleVolumeSlider = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowVolumeSlider(!showVolumeSlider);
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login?redirect=/shorts");
        return;
      }

      const response = await axios.post(
        `${getApiUrl()}/api/shorts/${short._id}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setHasLiked(response.data.data.hasLiked);
        setHasDisliked(response.data.data.hasDisliked);
        setLikesCount(response.data.data.likesCount);
        setDislikesCount(response.data.data.dislikesCount);
      }
    } catch (error: any) {
      console.error("Error liking short:", error);
      if (error.response?.status === 401)
        router.push("/login?redirect=/shorts");
    }
  };

  const handleDislike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login?redirect=/shorts");
        return;
      }

      const response = await axios.post(
        `${getApiUrl()}/api/shorts/${short._id}/dislike`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setHasLiked(response.data.data.hasLiked);
        setHasDisliked(response.data.data.hasDisliked);
        setLikesCount(response.data.data.likesCount);
        setDislikesCount(response.data.data.dislikesCount);
      }
    } catch (error: any) {
      console.error("Error disliking short:", error);
      if (error.response?.status === 401)
        router.push("/login?redirect=/shorts");
    }
  };

  const handleSubscribe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login?redirect=/shorts");
        return;
      }

      if (currentUserId && currentUserId === short.userId._id) return;

      const response = await axios.post(
        `${getApiUrl()}/api/shorts/channel/${short.userId._id}/subscribe`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setIsSubscribed(response.data.data.isSubscribed);
        setSubscribersCount(response.data.data.subscribersCount);
      }
    } catch (error: any) {
      console.error("Error subscribing:", error.response?.data || error);
      if (error.response?.status === 401)
        router.push("/login?redirect=/shorts");
    }
  };

  const handleDeleteShort = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      if (!token) {
        alert("Please login to delete shorts");
        router.push("/login?redirect=/shorts");
        setIsDeleting(false);
        return;
      }

      if (currentUserId !== short.userId._id) {
        alert("You can only delete your own shorts");
        setIsDeleting(false);
        return;
      }

      const apiUrl = getApiUrl();
      const deleteUrl = `${apiUrl}/api/shorts/${short._id}`;

      const response = await axios({
        method: "DELETE",
        url: deleteUrl,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      });

      if (response.data.success || response.status === 200) {
        setShowDeleteConfirm(false);
        setShowMenu(false);
        isModalOpenRef.current = false;

        const div = document.createElement("div");
        div.innerHTML = "✅ Short deleted successfully!";
        div.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #22c55e;
          color: white;
          padding: 24px 48px;
          border-radius: 16px;
          font-size: 20px;
          font-weight: bold;
          z-index: 999999;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        `;
        document.body.appendChild(div);

        deleteTimeoutRef.current = setTimeout(() => {
          if (document.body.contains(div)) {
            document.body.removeChild(div);
          }
        }, 2000);

        if (onDelete) {
          onDelete(short._id);
        }

        deleteTimeoutRef.current = setTimeout(() => {
          onNext();
        }, 1000);
      } else {
        throw new Error("Delete failed");
      }
    } catch (error: any) {
      console.error("DELETE ERROR:", error);
      setIsDeleting(false);

      let msg = "Failed to delete short";

      if (error.code === "ECONNABORTED") {
        msg = "Request timeout";
      } else if (error.code === "ERR_NETWORK") {
        msg = "Network error";
      } else if (error.response) {
        switch (error.response.status) {
          case 401:
            msg = "Session expired";
            setTimeout(() => router.push("/login?redirect=/shorts"), 2000);
            break;
          case 403:
            msg = "Not authorized";
            break;
          case 404:
            msg = "Short not found";
            break;
          default:
            msg = error.response.data?.message || msg;
        }
      }

      alert(`❌ ${msg}`);
    } finally {
      setTimeout(() => setIsDeleting(false), 1000);
    }
  };

  const openDeleteConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMenu(false);
    setShowDeleteConfirm(true);
    isModalOpenRef.current = true;
  };

  const closeDeleteConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
    isModalOpenRef.current = false;
  };

  const openReportModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowReportModal(true);
    setReportReason("");
    setReportDetails("");
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setReportReason("");
    setReportDetails("");
  };

  const handleSubmitReport = async () => {
    if (!reportReason) {
      alert("Please select a reason for reporting");
      return;
    }

    setIsReporting(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login?redirect=/shorts");
        return;
      }

      const div = document.createElement("div");
      div.innerHTML = "✅ Report submitted successfully!";
      div.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #3b82f6;
        color: white;
        padding: 24px 48px;
        border-radius: 16px;
        font-size: 20px;
        font-weight: bold;
        z-index: 999999;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      `;
      document.body.appendChild(div);

      setTimeout(() => {
        if (document.body.contains(div)) {
          document.body.removeChild(div);
        }
      }, 2000);

      closeReportModal();
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Failed to submit report. Please try again.");
    } finally {
      setIsReporting(false);
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
    setShowShareModal(true);
  };

  const handleShareComplete = async () => {
    try {
      await axios.post(`${getApiUrl()}/api/shorts/${short._id}/share`);
      setSharesCount((prev) => prev + 1);
    } catch (error) {
      console.error("Error updating share count:", error);
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + "M";
    if (count >= 1000) return (count / 1000).toFixed(1) + "K";
    return count.toString();
  };

  const handleChannelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/channel/${short.userId._id}`);
  };

  const isOwnShort = currentUserId && currentUserId === short.userId._id;

  const reportReasons = [
    "Spam or misleading",
    "Hateful or abusive content",
    "Harassment or bullying",
    "Harmful or dangerous acts",
    "Child abuse",
    "Promotes terrorism",
    "Sexual content",
    "Violent or graphic content",
    "Infringes my rights",
    "Other",
  ];

  return (
   <div
      ref={containerRef}
      className="relative w-full h-screen bg-black select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (isDragging && !isModalOpenRef.current) {
          handleMouseUp();
        }
      }}
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: 'pan-y',
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* Video */}
     <video
  ref={videoRef}
  src={short.videoUrl}
  className="w-full h-full object-contain cursor-pointer bg-black"
  loop
  playsInline
  webkit-playsinline="true"
  x5-playsinline="true"
  onClick={togglePlayPause}
  onError={(e) => console.error("Video error:", e)}
  style={{
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'pan-y',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  }}
/>

      {/* Gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
      </div>

 {/* Header with Theme-Compatible Menu */}
<div className="absolute top-4 left-4 right-4 flex items-center justify-between z-[50] pointer-events-auto">
  <button
    onClick={(e) => {
      e.stopPropagation();
      router.push("/shorts");
    }}
    className="text-white text-2xl font-bold hover:text-gray-300 transition"
  >
    Shorts
  </button>

  <div className="relative menu-button">
    <button
      onClick={(e) => {
        e.stopPropagation();
        setShowMenu(!showMenu);
      }}
      className="text-white hover:bg-white/20 rounded-full p-2 transition"
    >
      <MoreVertical size={24} />
    </button>


 {showMenu && (
      <>
        {/* Backdrop for closing menu */}
        <div 
          className="fixed inset-0 z-[98]"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
          }}
        />
        
        {/* UNIFIED MENU - Same style for both mobile and desktop */}
        <div 
          className="absolute top-full right-0 mt-2 rounded-xl shadow-2xl overflow-hidden z-[99] border"
          style={{
            backgroundColor: 'var(--bg-secondary, #272727)',
            borderColor: 'var(--border-color, #3f3f3f)',
            minWidth: '200px',
            maxWidth: '280px',
          }}
        >
          {/* Delete Short Option */}
          {isOwnShort ? (
            <button
              onClick={openDeleteConfirm}
              className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors"
              style={{ 
                color: 'var(--text-primary, #fff)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-hover, #3f3f3f)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Trash2 size={20} className="text-red-500 flex-shrink-0" />
              <span className="font-medium text-sm">Delete Short</span>
            </button>
          ) : (
            <div 
              className="w-full px-4 py-3 flex items-center gap-3 opacity-50 cursor-not-allowed"
              style={{ 
                color: 'var(--text-disabled, #717171)',
              }}
            >
              <Trash2 size={20} className="flex-shrink-0" />
              <span className="font-medium text-sm">Only Channel Owner</span>
            </div>
          )}
          
          {/* Divider */}
          <div 
            className="h-px mx-3"
            style={{ backgroundColor: 'var(--border-color, #3f3f3f)' }}
          />

           <button
            onClick={openReportModal}
            className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors"
            style={{ 
              color: 'var(--text-primary, #fff)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover, #3f3f3f)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Flag size={20} className="flex-shrink-0" style={{ color: 'var(--text-primary, #fff)' }} />
            <span className="leading-none">Report</span>
          </button>
        </div>

       </>
    )}
  </div>
</div>

     {/* Delete Confirmation Modal */}
{showDeleteConfirm && (
  <div
    className="fixed inset-0 bg-black/80 z-[999] pointer-events-auto flex items-end md:items-center justify-center"
    onClick={closeDeleteConfirm}
  >
  {/* ✅ MOBILE MODAL - THEME COMPATIBLE BOTTOM SLIDE */}
<div
  className="md:hidden rounded-t-3xl p-4 pb-safe w-full shadow-2xl animate-slideUp max-w-md mx-auto"
  onClick={(e) => e.stopPropagation()}
  style={{
    backgroundColor: 'var(--bg-secondary, #1f2937)',
  }}
>
  <div className="flex items-center gap-2.5 mb-3">
    <div className="bg-red-500/20 p-2 rounded-full flex-shrink-0">
      <AlertTriangle size={20} className="text-red-500" />
    </div>
    <h3 className="text-base font-bold" style={{ color: 'var(--text-primary, #fff)' }}>
      Delete Short?
    </h3>
  </div>

  <p className="mb-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary, #d1d5db)' }}>
    Delete <span className="font-bold" style={{ color: 'var(--text-primary, #fff)' }}>"{short.title}"</span>?
  </p>
  
  <p className="text-red-400 font-semibold text-xs mb-5">
    This action cannot be undone.
  </p>

  {/* TWO BUTTON LAYOUT FOR MOBILE */}
  <div className="flex gap-2">
    <button
      onClick={closeDeleteConfirm}
      disabled={isDeleting}
      className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition active:scale-95"
      style={{
        backgroundColor: 'var(--bg-tertiary, #374151)',
        color: 'var(--text-primary, #fff)',
      }}
    >
      Cancel
    </button>
   
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleDeleteShort();
      }}
      disabled={isDeleting}
      className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-95"
    >
      {isDeleting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          <span className="text-xs">Deleting...</span>
        </>
      ) : (
        <>
          <Trash2 size={16} />
          <span>Delete</span>
        </>
      )}
    </button>
  </div>
</div>

   {/* DESKTOP MODAL - THEME COMPATIBLE */}
    <div
      className="hidden md:block rounded-2xl p-6 max-w-md w-full shadow-2xl border"
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: 'var(--bg-secondary, #1f2937)',
        borderColor: 'var(--border-color, #374151)',
      }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-red-500/20 p-3 rounded-full">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary, #fff)' }}>
          Delete Short?
        </h3>
      </div>

      <p className="mb-2 text-base leading-relaxed" style={{ color: 'var(--text-secondary, #d1d5db)' }}>
        Delete <span className="font-bold" style={{ color: 'var(--text-primary, #fff)' }}>"{short.title}"</span>?
      </p>
      
      <p className="text-red-400 font-semibold mb-8">
        This cannot be undone.
      </p>

      <div className="flex gap-4">
        <button
          onClick={closeDeleteConfirm}
          disabled={isDeleting}
          className="flex-1 px-6 py-3.5 rounded-xl font-semibold disabled:opacity-50 transition active:scale-95 border-2"
          style={{
            backgroundColor: 'var(--bg-tertiary, #374151)',
            color: 'var(--text-primary, #fff)',
            borderColor: 'var(--border-color, #4b5563)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover, #4b5563)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary, #374151)';
          }}
        >
          Cancel
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteShort();
          }}
          disabled={isDeleting}
          className="flex-1 px-6 py-3.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
        >
          {isDeleting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 size={20} />
              Delete
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)}

      {/* Report Modal - MOBILE BOTTOM SLIDE */}
      {showReportModal && (
        <div
          className="fixed inset-0 bg-black/80 z-[999999] pointer-events-auto flex items-end md:items-center justify-center"
          onClick={closeReportModal}
        >
          {/* ✅ MOBILE MODAL - BOTTOM SLIDE */}
          <div
            className="md:hidden bg-gray-900 rounded-t-3xl p-5 pb-8 w-full max-h-[85vh] overflow-y-auto shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="bg-blue-500/20 p-2 rounded-full">
                  <Flag size={18} className="text-blue-400" />
                </div>
                <h3 className="text-base font-bold text-white">Report Short</h3>
              </div>
              <button
                onClick={closeReportModal}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-gray-400 mb-4 text-xs">
              Help us understand what's wrong with this short
            </p>

            <div className="space-y-2 mb-4">
              {reportReasons.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition text-sm font-medium ${
                    reportReason === reason
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-200 hover:bg-gray-700 active:bg-gray-600"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Additional details (optional)"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none mb-4 text-sm"
            />

            <div className="flex gap-3">
              <button
                onClick={closeReportModal}
                disabled={isReporting}
                className="flex-1 px-5 py-3.5 bg-gray-800 text-white border-2 border-gray-700 rounded-xl font-semibold text-sm disabled:opacity-50 transition hover:bg-gray-700 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={isReporting || !reportReason}
                className="flex-1 px-5 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
              >
                {isReporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  "Submit Report"
                )}
              </button>
            </div>
          </div>

         {/* DESKTOP MODAL - THEME COMPATIBLE */}
          <div
            className="hidden md:block rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-secondary, #1f2937)',
              borderColor: 'var(--border-color, #374151)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-2 rounded-full">
                  <Flag size={22} className="text-blue-400" />
                </div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary, #fff)' }}>
                  Report Short
                </h3>
              </div>
              <button
                onClick={closeReportModal}
                className="transition"
                style={{ color: 'var(--text-secondary, #9ca3af)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary, #fff)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary, #9ca3af)';
                }}
              >
                <X size={24} />
              </button>
            </div>

            <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary, #9ca3af)' }}>
              Help us understand what's wrong with this short
            </p>

            <div className="space-y-2 mb-4">
              {reportReasons.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition text-sm ${
                    reportReason === reason
                      ? "bg-blue-600 text-white"
                      : ""
                  }`}
                  style={
                    reportReason !== reason
                      ? {
                          backgroundColor: 'var(--bg-tertiary, #374151)',
                          color: 'var(--text-primary, #e5e7eb)',
                        }
                      : undefined
                  }
                  onMouseEnter={(e) => {
                    if (reportReason !== reason) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover, #4b5563)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (reportReason !== reason) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary, #374151)';
                    }
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Additional details (optional)"
              rows={3}
              className="w-full rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none mb-4 border"
              style={{
                backgroundColor: 'var(--bg-tertiary, #374151)',
                borderColor: 'var(--border-color, #4b5563)',
                color: 'var(--text-primary, #fff)',
              }}
            />

            <div className="flex gap-3">
              <button
                onClick={closeReportModal}
                disabled={isReporting}
                className="flex-1 px-6 py-3 rounded-lg font-semibold disabled:opacity-50 transition active:scale-95 border-2"
                style={{
                  backgroundColor: 'var(--bg-tertiary, #374151)',
                  color: 'var(--text-primary, #fff)',
                  borderColor: 'var(--border-color, #4b5563)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover, #4b5563)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary, #374151)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={isReporting || !reportReason}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
              >
                {isReporting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  "Submit Report"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Play Icon Overlay */}
      {!isPlaying && !isModalOpenRef.current && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm rounded-full p-8">
            <Play size={48} className="text-white" fill="white" />
          </div>
        </div>
      )}

      {/* MOBILE OPTIMIZED CONTENT SECTION */}
      <div className="absolute bottom-0 left-0 right-0 z-[30]">
        <div className="p-3 pb-24 md:p-4 md:pb-4">
          <div className="flex items-end justify-between gap-3">
            {/* Left Content */}
            <div className="flex-1 pr-2 text-white min-w-0 max-w-[calc(100%-88px)] md:max-w-[calc(100%-80px)]">
              {/* Channel info */}
              <div className="flex items-center mb-2.5 pointer-events-auto">
                <img
                  key={`avatar-${short._id}-${channelAvatar}-${avatarRefreshKey}`}
                  src={getImageUrl(
                    short.userId?.image || short.channelAvatar,
                    true
                  )}
                  alt={channelName}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full mr-2.5 cursor-pointer object-cover border-2 border-white/20 flex-shrink-0 bg-gray-800"
                  onClick={handleChannelClick}
                  crossOrigin="anonymous"
                  loading="eager"
                  style={{
                    display: "block",
                    minWidth: "36px",
                    minHeight: "36px",
                  }}
                  onError={(e) => {
                    console.error(
                      "❌ ShortPlayer avatar failed:",
                      channelAvatar
                    );
                    e.currentTarget.src = DEFAULT_AVATAR_SVG;
                    e.currentTarget.style.display = "block";
                  }}
                  onLoad={(e) => {
                    console.log("✅ ShortPlayer avatar loaded:", channelAvatar);
                    e.currentTarget.style.display = "block";
                  }}
                />
                <div className="flex-1 min-w-0 mr-2">
                  <p
                    className="font-semibold text-sm md:text-base cursor-pointer hover:underline truncate leading-tight mb-0.5"
                    onClick={handleChannelClick}
                  >
                    @{channelName}
                  </p>
                  <p className="text-xs md:text-sm text-gray-300 leading-tight truncate">
                    {formatCount(subscribersCount)} subscribers
                  </p>
                </div>

                {!isOwnShort && (
                 <button
  onClick={handleSubscribe}
  className={`ml-1 px-4 md:px-6 py-1.5 md:py-2 rounded-full font-semibold text-sm md:text-base transition-all transform hover:scale-105 flex-shrink-0 ${
    isSubscribed
      ? "bg-youtube-hover text-youtube-primary"
      : "bg-white text-black hover:bg-gray-100"
  }`}
  style={{ WebkitTapHighlightColor: 'transparent' }}
>
                    {isSubscribed ? "Subscribed" : "Subscribe"}
                  </button>
                )}
              </div>

              {/* Title & Description */}
              <div className="mb-1.5">
                <h3 className="font-bold text-base md:text-lg mb-1 line-clamp-2 leading-snug">
                  {translatedTitle}
                </h3>
                {translatedDescription && (
                  <p className="text-sm md:text-base text-gray-300 line-clamp-2 leading-snug">
                    {translatedDescription}
                  </p>
                )}
              </div>

              {/* Views Count */}
              <p className="text-xs md:text-sm text-gray-400 font-medium">
                {formatCount(viewsCount)} views
              </p>
            </div>

            {/* Right Action Buttons - MOBILE OPTIMIZED */}
            
<div className="flex flex-col items-center justify-end gap-2.5 pb-0 pointer-events-auto md:gap-5">
              {/* Like Button */}
             <button
  onClick={handleLike}
  className="flex flex-col items-center gap-0.5 transition-all transform active:scale-95 group touch-manipulation min-h-[44px] min-w-[44px] justify-center md:min-h-[44px] md:min-w-[44px]"
  style={{ WebkitTapHighlightColor: 'transparent' }}
>
                <div
               className={`rounded-full p-2 transition-all shadow-lg border md:p-3.5 ${
                    hasLiked
                      ? "bg-blue-600 border-blue-500 shadow-blue-500/50"
                      : "bg-youtube-tertiary/90 border-youtube/50 shadow-black/50"
                  }`}
                >
                  <ThumbsUp
                    size={22}
                    className={`${
                      hasLiked ? "text-white" : "text-white"
                    } md:w-[26px] md:h-[26px]`}
                    fill={hasLiked ? "white" : "none"}
                    strokeWidth={2.5}
                  />
                </div>
                <span
                 className="text-[10px] font-semibold transition-colors md:text-xs leading-none"
                  style={{ color: hasLiked ? "#60a5fa" : "white" }}
                >
                  {formatCount(likesCount)}
                </span>
              </button>

              {/* Dislike Button */}
             
<button
  onClick={handleDislike}
  className="flex flex-col items-center gap-1 transition-all transform active:scale-95 group touch-manipulation min-h-[48px] min-w-[48px] justify-center md:min-h-[44px] md:min-w-[44px]"
  style={{ WebkitTapHighlightColor: 'transparent' }}
>
                <div
                  className={`rounded-full p-2.5 transition-all shadow-lg border md:p-3.5 ${
                    hasDisliked
                      ? "bg-red-600 border-red-500 shadow-red-500/50"
                      : "bg-youtube-tertiary/90 border-youtube/50 shadow-black/50"
                  }`}
                >
                  <ThumbsDown
                    size={22}
                    className={`${
                      hasDisliked ? "text-white" : "text-white"
                    } md:w-[26px] md:h-[26px]`}
                    fill={hasDisliked ? "white" : "none"}
                    strokeWidth={2.5}
                  />
                </div>
                <span
                  className="text-[11px] font-bold transition-colors md:text-xs leading-tight"
                  style={{ color: hasDisliked ? "#f87171" : "#9ca3af" }}
                >
                  Dislike
                </span>
              </button>

              {/* Comments Button */}
             <button
  onClick={(e) => {
    e.stopPropagation();
    setShowComments(true);
  }}
  className="flex flex-col items-center gap-1 transition-all transform active:scale-95 group touch-manipulation min-h-[48px] min-w-[48px] justify-center md:min-h-[44px] md:min-w-[44px]"
  style={{ WebkitTapHighlightColor: 'transparent' }}
>
                <div className="bg-youtube-tertiary/90 border border-youtube/50 rounded-full p-2.5 transition-all shadow-lg md:p-3.5">
                  <MessageCircle
                    size={22}
                    className="text-white md:w-[26px] md:h-[26px]"
                    strokeWidth={2.5}
                  />
                </div>
                <span className="text-white text-[11px] font-bold transition-colors md:text-xs leading-tight">
                  {formatCount(commentsCount)}
                </span>
              </button>

              {/* Share Button */}
             <button
  onClick={handleShareClick}
  className="flex flex-col items-center gap-1 transition-all transform active:scale-95 group touch-manipulation min-h-[48px] min-w-[48px] justify-center md:min-h-[44px] md:min-w-[44px]"
  style={{ WebkitTapHighlightColor: 'transparent' }}
>

                <div className="bg-youtube-tertiary/90 border border-youtube/50 rounded-full p-2.5 transition-all shadow-lg md:p-3.5">
                  <Share2
                    size={22}
                    className="text-white md:w-[26px] md:h-[26px]"
                    strokeWidth={2.5}
                  />
                </div>
                <span className="text-white text-[11px] font-bold transition-colors md:text-xs leading-tight">
                  Share
                </span>
              </button>

              {/* Volume Control - THEME AWARE */}
              <div className="relative flex flex-col items-center min-h-[48px] min-w-[48px] justify-center md:min-h-[44px] md:min-w-[44px] volume-control">
                <button
  onClick={toggleVolumeSlider}
  className="flex flex-col items-center transition-all transform hover:scale-110 active:scale-95 group"
  style={{ WebkitTapHighlightColor: 'transparent' }}
>
                  <div className="bg-youtube-tertiary/90 border border-youtube/50 rounded-full p-2.5 transition-all shadow-lg md:p-3.5">
                    {isMuted || volume === 0 ? (
                      <VolumeX
                        size={22}
                        className="text-white group-hover:text-yellow-400 transition-colors md:w-[26px] md:h-[26px]"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Volume2
                        size={22}
                        className="text-white group-hover:text-yellow-400 transition-colors md:w-[26px] md:h-[26px]"
                        strokeWidth={2.5}
                      />
                    )}
                  </div>
                </button>

                {/* Volume Slider Popup - THEME AWARE */}
                {showVolumeSlider && (
                  <div
                    className="absolute bottom-full right-0 mb-2 rounded-xl p-2.5 shadow-2xl md:p-3 border"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      backdropFilter: "blur(16px)",
                      borderColor: "var(--border-color)",
                      minWidth: "80px",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col items-center gap-2.5">
                      <span
                        className="text-sm font-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {Math.round(volume * 100)}%
                      </span>

                      <div
                        className="relative h-28 w-2 rounded-full overflow-hidden"
                        style={{ backgroundColor: "var(--bg-hover)" }}
                      >
                        <div
                          className="absolute bottom-0 w-full rounded-full transition-all bg-gradient-to-t from-blue-600 to-blue-400"
                          style={{ height: `${volume * 100}%` }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={volume}
                          onChange={(e) =>
                            handleVolumeChange(parseFloat(e.target.value))
                          }
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          style={
                            {
                              WebkitAppearance: "slider-vertical",
                            } as React.CSSProperties
                          }
                        />
                      </div>

                      <div className="flex flex-col gap-1 w-full">
                        <button
                          onClick={() => handleVolumeChange(1)}
                          className="text-xs transition px-2 py-1.5 rounded text-center font-medium"
                          style={{
                            color: "var(--text-secondary)",
                            backgroundColor: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--text-primary)";
                            e.currentTarget.style.backgroundColor =
                              "var(--bg-hover)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color =
                              "var(--text-secondary)";
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }}
                        >
                          100%
                        </button>
                        <button
                          onClick={() => handleVolumeChange(0.5)}
                          className="text-xs transition px-2 py-1.5 rounded text-center font-medium"
                          style={{
                            color: "var(--text-secondary)",
                            backgroundColor: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--text-primary)";
                            e.currentTarget.style.backgroundColor =
                              "var(--bg-hover)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color =
                              "var(--text-secondary)";
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }}
                        >
                          50%
                        </button>
                        <button
                          onClick={() => handleVolumeChange(0)}
                          className="text-xs transition px-2 py-1.5 rounded text-center font-medium"
                          style={{
                            color: "var(--text-secondary)",
                            backgroundColor: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = "var(--text-primary)";
                            e.currentTarget.style.backgroundColor =
                              "var(--bg-hover)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color =
                              "var(--text-secondary)";
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }}
                        >
                          Mute
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            handleShareComplete();
          }}
          videoId={short._id}
          videoTitle={short.title}
          currentTime={currentTime}
          isShort={true}
        />
      )}

      {showComments && (
        <CommentsModal
          shortId={short._id}
          commentsCount={commentsCount}
          onClose={() => setShowComments(false)}
          onCommentAdded={() => setCommentsCount((prev) => prev + 1)}
        />
      )}
    </div>
  );
};

export default ShortPlayer;
