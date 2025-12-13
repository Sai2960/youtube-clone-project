/* eslint-disable react-hooks/exhaustive-deps */
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
  onLikeUpdate?: (shortId: string, liked: boolean, likesCount: number, disliked?: boolean, dislikesCount?: number) => void; // ✅ ADD THIS
}

const DEFAULT_AVATAR_SVG =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';

const ShortPlayer: React.FC<ShortPlayerProps> = ({
  short,
  isActive,
  onNext,
  onPrevious,
  onDelete,
  onLikeUpdate,
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
  const [hasLiked, setHasLiked] = useState(Boolean(short.hasLiked));
const [hasDisliked, setHasDisliked] = useState(Boolean(short.hasDisliked));
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
const [channelName, setChannelName] = useState(getShortChannelName(short));
const channelAvatar = getShortAvatar(short);

  const getApiUrl = () =>
    // ✅ CORRECT - Simple fallback chain
    "https://youtube-clone-project-q3pd.onrender.com";
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

  useEffect(() => {
  const handleChannelUpdate = () => {
    console.log("🔄 ShortPlayer: Channel update event detected!");
    
    // Get updated user from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const updatedUser = JSON.parse(userStr);
        console.log("📝 Updated channel name from localStorage:", updatedUser.channelname);
        
        // Update channel name if this short belongs to the current user
        if (short.userId._id === updatedUser._id) {
          const newChannelName = updatedUser.channelname || updatedUser.name || 'Unknown';
          setChannelName(newChannelName);
          console.log("✅ Channel name updated in ShortPlayer to:", newChannelName);
        }
      } catch (error) {
        console.error("❌ Error parsing user data:", error);
      }
    }
  };

  // Listen for both custom events and storage events
  window.addEventListener("channelUpdated", handleChannelUpdate);
  window.addEventListener("avatarUpdated", handleChannelUpdate);
  window.addEventListener("storage", handleChannelUpdate);

  return () => {
    window.removeEventListener("channelUpdated", handleChannelUpdate);
    window.removeEventListener("avatarUpdated", handleChannelUpdate);
    window.removeEventListener("storage", handleChannelUpdate);
  };
}, [short.userId._id]);


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

        console.log("✅ Short added to history:", short._id);
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
  console.log("\n🔵 ===== SHORT PROP CHANGED (useEffect) =====");
  console.log("📥 New short prop:", {
    shortId: short._id,
    hasLiked: short.hasLiked,
    likesCount: short.likesCount,
    hasDisliked: short.hasDisliked,
    dislikesCount: short.dislikesCount
  });
  
  console.log("🔄 Syncing local state with prop...");
  
  setHasLiked(Boolean(short.hasLiked));
  setHasDisliked(Boolean(short.hasDisliked));
  setLikesCount(short.likesCount || 0);
  setDislikesCount(short.dislikesCount || 0);
  
  console.log("✅ Local state synced to:", {
    hasLiked: Boolean(short.hasLiked),
    likesCount: short.likesCount || 0
  });
  console.log("===== SYNC COMPLETE =====\n");
}, [short._id, short.hasLiked, short.hasDisliked, short.likesCount, short.dislikesCount]);


useEffect(() => {
  console.log("🔄 Short changed, syncing channel name...");
  const newChannelName = getShortChannelName(short);
  setChannelName(newChannelName);
  console.log("✅ Channel name synced to:", newChannelName);
}, [short._id, short.userId?.channelname, short.channelName]);



useEffect(() => {
  const fetchLikeStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !short._id) {
        setHasLiked(false);
        setHasDisliked(false);
        return;
      }

      const payload = JSON.parse(atob(token.split(".")[1]));
      const userId = payload.userId || payload.id;
      if (!userId) {
        setHasLiked(false);
        setHasDisliked(false);
        return;
      }

      const apiUrl = getApiUrl();

      console.log("🔍 Fetching like status for:", short._id);

      const response = await axios.get(`${apiUrl}/api/shorts/${short._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",  // ✅ ADDED
          "Expires": "0"         // ✅ ADDED
        },
      });

      if (response.data.success && response.data.data) {
        const shortData = response.data.data;
        
        console.log("✅ Fetched like status:", {
          hasLiked: shortData.hasLiked,
          likesCount: shortData.likesCount
        });
        
        // ✅ CRITICAL FIX: Force boolean conversion and update state
        const isLiked = Boolean(shortData.hasLiked);
        const isDisliked = Boolean(shortData.hasDisliked);
        
        setHasLiked(isLiked);
        setHasDisliked(isDisliked);
        setLikesCount(shortData.likesCount || 0);
        setDislikesCount(shortData.dislikesCount || 0);
        
        // ✅ CRITICAL: Force re-render by logging
        console.log("🔄 State updated:", { isLiked, likesCount: shortData.likesCount });
      }
    } catch (error) {
      console.error("❌ Error fetching like status:", error);
      // ✅ On error, keep current state instead of resetting
    }
  };

  // ✅ CRITICAL: Fetch when short changes OR becomes active
  if (short._id && isActive) {
    // ✅ Add small delay to ensure video is loaded
    const timer = setTimeout(() => {
      fetchLikeStatus();
    }, 100);
    
    return () => clearTimeout(timer);
  }
}, [short._id, isActive]);



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

  console.log("🎬 Video playback check:", {
    isActive,
    modalOpen: isModalOpenRef.current,
    videoSrc: video.src,
    readyState: video.readyState,
  });

  if (isActive && !isModalOpenRef.current) {
    // ✅ Ensure video is visible
    video.style.display = "block";
    video.style.visibility = "visible";
    video.style.opacity = "1";
    
    // Set attributes
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.preload = "auto";
    
    // Mute for autoplay
    video.muted = isMuted;
    
    // ✅ SIMPLIFIED play logic
    const attemptPlay = async () => {
      if (video.readyState >= 2) {
        try {
          await video.play();
          console.log("✅ Video playing");
          setIsPlaying(true);
          
          // Unmute after playback starts
          if (!isMuted) {
            setTimeout(() => {
              video.muted = false;
            }, 200);
          }
        } catch (err) {
          console.error("❌ Play failed:", err);
          
          // Try once with mute
          try {
            video.muted = true;
            await video.play();
            console.log("✅ Playing muted");
            setIsPlaying(true);
          } catch (e) {
            console.error("❌ Final play failed:", e);
          }
        }
      } else {
        console.log("⏳ Waiting for video to load...");
        video.addEventListener('canplay', attemptPlay, { once: true });
      }
    };

    // Force load if needed
    if (video.readyState < 2) {
      video.load();
    }
    
    requestAnimationFrame(attemptPlay);
    
  } else {
    video.pause();
    setIsPlaying(false);
  }
}, [isActive, isMuted, short._id]);



  // ✅ ADD: Passive event listener fix
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventDefaultTouch = (e: TouchEvent) => {
      if (isModalOpenRef.current) return;

      const target = e.target as HTMLElement;
      // Don't prevent on buttons, inputs, or scrollable content
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.closest(".volume-control") ||
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
    container.addEventListener("touchmove", preventDefaultTouch, {
      passive: false,
    });

    return () => {
      container.removeEventListener("touchmove", preventDefaultTouch);
    };
  }, []);

  

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
    if (distance > 15) {
      // Increased threshold
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
    if (timeSinceLastNav < 400) {
      // 400ms cooldown
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
  
  console.log("\n🔵 ===== LIKE BUTTON CLICKED =====");
  console.log("📍 Current State BEFORE API call:");
  console.log("   Short ID:", short._id);
  console.log("   hasLiked:", hasLiked);
  console.log("   likesCount:", likesCount);
  console.log("   hasDisliked:", hasDisliked);
  console.log("   dislikesCount:", dislikesCount);
  
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("❌ No token found, redirecting to login");
      router.push("/login?redirect=/shorts");
      return;
    }

    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.userId || payload.id;

    if (!userId) {
      console.log("❌ No userId in token, redirecting to login");
      router.push("/login?redirect=/shorts");
      return;
    }

    console.log("✅ User authenticated:", userId);

    // ✅ Store previous state for rollback
    const previousLiked = hasLiked;
    const previousCount = likesCount;
    const previousDisliked = hasDisliked;
    const previousDislikeCount = dislikesCount;

    console.log("\n🔄 OPTIMISTIC UPDATE:");
    // ✅ Optimistic update
    if (previousLiked) {
      console.log("   Action: UNLIKE (remove like)");
      setHasLiked(false);
      setLikesCount((prev) => Math.max(0, prev - 1));
    } else {
      console.log("   Action: LIKE (add like)");
      setHasLiked(true);
      setLikesCount((prev) => prev + 1);
      if (previousDisliked) {
        console.log("   Also removing dislike");
        setHasDisliked(false);
        setDislikesCount((prev) => Math.max(0, prev - 1));
      }
    }

    console.log("\n📡 MAKING API CALL...");
    console.log("   URL:", `${getApiUrl()}/like/short/${short._id}`);
    
    // ✅ Make API call
    const response = await axios.post(
      `${getApiUrl()}/like/short/${short._id}`,
      { userId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Expires": "0"
        },
      }
    );

    console.log("\n✅ API RESPONSE RECEIVED:");
    console.log("   Full response:", JSON.stringify(response.data, null, 2));
    console.log("   response.data.success:", response.data.success);
    console.log("   response.data.liked:", response.data.liked);
    console.log("   response.data.likesCount:", response.data.likesCount);
    console.log("   response.data.action:", response.data.action);
    console.log("   response.data.data:", response.data.data);

    // ✅ CRITICAL FIX: Read from TOP-LEVEL fields
    if (response.data.success) {
      const serverLiked = response.data.liked;
      const serverCount = response.data.likesCount;
      const serverDislikeCount = response.data.dislikesCount;

      console.log("\n🔄 SYNCING WITH SERVER STATE:");
      console.log("   serverLiked:", serverLiked);
      console.log("   serverCount:", serverCount);
      console.log("   serverDislikeCount:", serverDislikeCount);

      // ✅ Update local state to match server
      setHasLiked(serverLiked);
      setHasDisliked(false);
      setLikesCount(serverCount);
      setDislikesCount(serverDislikeCount);

      console.log("\n📤 CALLING onLikeUpdate callback:");
      console.log("   onLikeUpdate exists?", !!onLikeUpdate);
      
      // ✅ CRITICAL: Update parent component's shorts array
      if (onLikeUpdate) {
        console.log("   Calling with:", {
          shortId: short._id,
          liked: serverLiked,
          likesCount: serverCount,
          disliked: false,
          dislikesCount: serverDislikeCount
        });
        onLikeUpdate(short._id, serverLiked, serverCount, false, serverDislikeCount);
      } else {
        console.warn("⚠️ onLikeUpdate callback is NOT defined!");
      }

      console.log("\n✅ LIKE STATE SYNCED SUCCESSFULLY");
      console.log("📍 Final State AFTER sync:");
      console.log("   hasLiked:", serverLiked);
      console.log("   likesCount:", serverCount);
    } else {
      console.error("❌ API returned success: false");
    }
  } catch (error: any) {
    console.error("\n❌ ERROR IN handleLike:");
    console.error("   Error:", error);
    console.error("   Response data:", error.response?.data);
    console.error("   Status:", error.response?.status);

    // ✅ Rollback optimistic update on error
    console.log("\n🔄 ROLLING BACK OPTIMISTIC UPDATE...");
    
    try {
      const token = localStorage.getItem("token");
      const freshResponse = await axios.get(
        `${getApiUrl()}/api/shorts/${short._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Expires": "0"
          },
        }
      );
      
      console.log("📡 Fresh data fetched:", freshResponse.data);
      
      if (freshResponse.data.success) {
        const freshData = freshResponse.data.data;
        console.log("🔄 Rolling back to:", {
          hasLiked: freshData.hasLiked,
          likesCount: freshData.likesCount
        });
        
        setHasLiked(Boolean(freshData.hasLiked));
        setHasDisliked(Boolean(freshData.hasDisliked));
        setLikesCount(freshData.likesCount);
        setDislikesCount(freshData.dislikesCount);
        
        console.log("✅ State rolled back to server state");
      }
    } catch (revertError) {
      console.error("❌ Failed to revert state:", revertError);
    }

    if (error.response?.status === 401) {
      console.log("❌ 401 Unauthorized, redirecting to login");
      router.push("/login?redirect=/shorts");
    }

  }
  
  console.log("===== LIKE HANDLER COMPLETE =====\n");
};

  const handleDislike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login?redirect=/shorts");
        return;
      }

      // ✅ Optimistic update
      const wasLiked = hasLiked;
      const wasDisliked = hasDisliked;

      if (wasDisliked) {
        setHasDisliked(false);
        setDislikesCount((prev) => Math.max(0, prev - 1));
      } else {
        setHasDisliked(true);
        setDislikesCount((prev) => prev + 1);
        if (wasLiked) {
          setHasLiked(false);
          setLikesCount((prev) => Math.max(0, prev - 1));
        }
      }

      const response = await axios.post(
        `${getApiUrl()}/api/shorts/${short._id}/dislike`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ Sync with server response
      if (response.data.success) {
        setHasLiked(response.data.data.hasLiked);
        setHasDisliked(response.data.data.hasDisliked);
        setLikesCount(response.data.data.likesCount);
        setDislikesCount(response.data.data.dislikesCount);

        console.log("✅ Dislike synced:", response.data.data);
      }
    } catch (error: any) {
      console.error("Error disliking short:", error);

      // ✅ Revert on error
      const freshShort = await axios.get(
        `${getApiUrl()}/api/shorts/${short._id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      if (freshShort.data.success) {
        setHasLiked(freshShort.data.data.hasLiked);
        setHasDisliked(freshShort.data.data.hasDisliked);
        setLikesCount(freshShort.data.data.likesCount);
        setDislikesCount(freshShort.data.data.dislikesCount);
      }

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
        // Close modal
        setShowDeleteConfirm(false);
        setShowMenu(false);
        isModalOpenRef.current = false;

        // Success notification
        const div = document.createElement("div");
        div.innerHTML = "✅ Short deleted successfully!";
        div.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #22c55e;
        color: white;
        padding: 20px 40px;
        border-radius: 12px;
        font-size: 18px;
        font-weight: bold;
        z-index: 999999;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      `;
        document.body.appendChild(div);

        setTimeout(() => {
          if (document.body.contains(div)) {
            document.body.removeChild(div);
          }
        }, 2000);

        // Call onDelete callback
        if (onDelete) {
          onDelete(short._id);
        }

        // Move to next short
        setTimeout(() => {
          onNext();
        }, 800);
      } else {
        throw new Error("Delete failed");
      }
    } catch (error: any) {
      console.error("DELETE ERROR:", error);
      setIsDeleting(false);

      let msg = "Failed to delete short";

      if (error.code === "ECONNABORTED") {
        msg = "Request timeout - please try again";
      } else if (error.code === "ERR_NETWORK") {
        msg = "Network error - check your connection";
      } else if (error.response) {
        switch (error.response.status) {
          case 401:
            msg = "Session expired - please login again";
            setTimeout(() => router.push("/login?redirect=/shorts"), 2000);
            break;
          case 403:
            msg = "Not authorized to delete this short";
            break;
          case 404:
            msg = "Short not found or already deleted";
            break;
          default:
            msg = error.response.data?.message || msg;
        }
      }

      alert(`❌ ${msg}`);

      // Reset states
      setShowDeleteConfirm(false);
      setShowMenu(false);
      isModalOpenRef.current = false;
    } finally {
      setTimeout(() => setIsDeleting(false), 500);
    }
  };

  const openDeleteConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMenu(false);

    // Small delay to ensure menu closes first
    setTimeout(() => {
      setShowDeleteConfirm(true);
      isModalOpenRef.current = true;
    }, 50);
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
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        touchAction: "pan-y",
        WebkitTapHighlightColor: "transparent",
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
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
  preload="auto"
  crossOrigin="anonymous"
  onClick={togglePlayPause}
  style={{
    WebkitTapHighlightColor: "transparent",
    touchAction: "pan-y",
    userSelect: "none",
    WebkitUserSelect: "none",
    display: "block",           // ✅ ADD THIS
    visibility: "visible",       // ✅ ADD THIS
    opacity: 1,                  // ✅ ADD THIS
    position: "relative",        // ✅ ADD THIS
    zIndex: 1,                   // ✅ ADD THIS
  }}
  onError={(e) => {
    const video = e.currentTarget;
    console.error("❌ VIDEO ERROR:", {
      code: video.error?.code,
      message: video.error?.message,
      url: short.videoUrl,
    });
    
    // ✅ SIMPLIFIED: Single retry only
    if (!video.hasAttribute('data-retry')) {
      video.setAttribute('data-retry', 'true');
      console.log("🔄 Retrying video load...");
      setTimeout(() => {
        video.load();
      }, 500);
    }
  }}
  onLoadedMetadata={() => console.log("✅ Metadata loaded")}
  onCanPlay={() => console.log("✅ Can play")}
  onPlaying={() => console.log("▶️ Playing")}
/>

      {/* Gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
      </div>
      {/* Header with Theme-Compatible Menu */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-[50] pointer-events-auto">
        {/* Shorts button - HIDDEN on desktop (md and above) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push("/shorts");
          }}
          className="md:hidden text-white text-2xl font-bold hover:text-gray-300 transition"
        >
          Shorts
        </button>

        {/* Empty div for spacing on desktop */}
        <div className="hidden md:block"></div>

        <div className="relative menu-button ml-auto">
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

              {/* UNIFIED MENU - Works for both mobile and desktop */}
              <div
                className="absolute top-full right-0 mt-2 rounded-xl shadow-2xl overflow-hidden z-[99] border"
                style={{
                  backgroundColor: "var(--bg-secondary, #272727)",
                  borderColor: "var(--border-color, #3f3f3f)",
                  minWidth: "220px",
                  maxWidth: "280px",
                }}
              >
                {/* Delete Short Option */}
                {isOwnShort ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteConfirm(e);
                    }}
                    className="w-full px-4 py-3.5 text-left flex items-center gap-3 transition-colors"
                    style={{
                      color: "var(--text-primary, #fff)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "var(--bg-hover, #3f3f3f)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <Trash2 size={20} className="text-red-500 flex-shrink-0" />
                    <span className="font-medium text-sm">Delete Short</span>
                  </button>
                ) : (
                  <div
                    className="w-full px-4 py-3.5 flex items-center gap-3 opacity-50 cursor-not-allowed"
                    style={{
                      color: "var(--text-disabled, #717171)",
                    }}
                  >
                    <Trash2 size={20} className="flex-shrink-0" />
                    <span className="font-medium text-sm">
                      Only Owner Can Delete
                    </span>
                  </div>
                )}

                {/* Divider */}
                <div
                  className="h-px mx-3"
                  style={{ backgroundColor: "var(--border-color, #3f3f3f)" }}
                />

                {/* Report Option */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openReportModal(e);
                  }}
                  className="w-full px-4 py-3.5 text-left flex items-center gap-3 transition-colors"
                  style={{
                    color: "var(--text-primary, #fff)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "var(--bg-hover, #3f3f3f)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <Flag
                    size={20}
                    className="flex-shrink-0"
                    style={{ color: "var(--text-primary, #fff)" }}
                  />
                  <span className="font-medium text-sm">Report</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/80 z-[999] pointer-events-auto flex items-center justify-center p-4"
          onClick={closeDeleteConfirm}
        >
          {/* MOBILE MODAL */}
          <div
            className="md:hidden rounded-3xl w-full max-w-sm shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--bg-secondary, #ffffff)", // Changed from #2d2d2d
            }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-500/20 p-2.5 rounded-full flex-shrink-0">
                  <AlertTriangle size={22} className="text-red-500" />
                </div>
                <h3
                  className="text-lg font-bold"
                  style={{ color: "var(--text-primary, #000)" }}
                >
                  Delete Short?
                </h3>
              </div>

              {/* Content */}
              <div className="mb-4">
                <p
                  className="text-sm leading-relaxed mb-3"
                  style={{ color: "var(--text-secondary, #666)" }}
                >
                  Are you sure you want to delete this short?
                </p>
                <p
                  className="font-semibold text-sm break-words p-3 rounded-lg"
                  style={{
                    color: "var(--text-primary, #000)",
                    backgroundColor: "var(--bg-tertiary, #f3f4f6)",
                  }}
                >
                  "{short.title}"
                </p>
              </div>

              {/* Warning */}
              <div className="flex items-center gap-2 mb-6 bg-red-500/10 p-3 rounded-lg">
                <AlertTriangle
                  size={16}
                  className="text-red-400 flex-shrink-0"
                />
                <p className="text-red-400 font-semibold text-xs">
                  This action cannot be undone
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeDeleteConfirm}
                  disabled={isDeleting}
                  className="flex-1 px-5 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition active:scale-95"
                  style={{
                    backgroundColor: "var(--bg-tertiary, #f3f4f6)",
                    color: "var(--text-primary, #000)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteShort}
                  disabled={isDeleting}
                  className="flex-1 px-5 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} />
                      <span>Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* DESKTOP MODAL */}
          <div
            className="hidden md:block rounded-2xl p-6 max-w-md w-full shadow-2xl border"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--bg-secondary, #1f2937)",
              borderColor: "var(--border-color, #374151)",
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-red-500/20 p-3 rounded-full">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <h3
                className="text-xl font-bold"
                style={{ color: "var(--text-primary, #fff)" }}
              >
                Delete Short?
              </h3>
            </div>

            <p
              className="mb-3 text-base leading-relaxed"
              style={{ color: "var(--text-secondary, #d1d5db)" }}
            >
              Are you sure you want to delete this short?
            </p>

            <p
              className="mb-2 text-base font-bold break-words"
              style={{
                color: "var(--text-primary, #fff)",
                backgroundColor: "var(--bg-tertiary, #374151)",
                padding: "12px",
                borderRadius: "8px",
              }}
            >
              "{short.title}"
            </p>

            <p className="text-red-400 font-semibold mb-8 text-sm">
              ⚠️ This action cannot be undone
            </p>

            <div className="flex gap-4">
              <button
                onClick={closeDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 rounded-xl font-semibold disabled:opacity-50 transition active:scale-95 border-2"
                style={{
                  backgroundColor: "var(--bg-tertiary, #374151)",
                  color: "var(--text-primary, #fff)",
                  borderColor: "var(--border-color, #4b5563)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--bg-hover, #4b5563)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--bg-tertiary, #374151)";
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteShort}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
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

      {/* Report Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 bg-black/80 z-[999] pointer-events-auto flex items-center justify-center p-4"
          onClick={closeReportModal}
        >
          {/* MOBILE MODAL */}
          <div
            className="md:hidden rounded-3xl w-full max-w-sm shadow-2xl animate-slideUp max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--bg-secondary, #ffffff)", // Changed from #2d2d2d
            }}
          >
            <div className="overflow-y-auto max-h-[85vh]">
              <div className="p-5 pb-6">
                {/* Header - Line ~1285 - FIXED FOR LIGHT THEME */}
                <div
                  className="flex items-center justify-between mb-4 sticky top-0 pb-3 z-10"
                  style={{
                    backgroundColor: "var(--bg-secondary, #ffffff)", // Changed from bg-[#2d2d2d]
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="bg-blue-500/20 p-2 rounded-full">
                      <Flag size={18} className="text-blue-400" />
                    </div>
                    <h3
                      className="text-base font-bold"
                      style={{ color: "var(--text-primary, #000)" }} // Changed from text-white
                    >
                      Report Short
                    </h3>
                  </div>
                  <button
                    onClick={closeReportModal}
                    className="transition"
                    style={{ color: "var(--text-secondary, #666)" }} // Changed from text-gray-400
                  >
                    <X size={20} />
                  </button>
                </div>

                <p
                  className="mb-4 text-xs"
                  style={{ color: "var(--text-secondary, #666)" }} // Changed from text-gray-400
                >
                  Help us understand what's wrong with this short
                </p>

                {/* Report Reasons */}
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

                {/* Additional Details */}
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Additional details (optional)"
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none mb-4 text-sm"
                />

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={closeReportModal}
                    disabled={isReporting}
                    className="flex-1 px-5 py-3 bg-gray-800 text-white border-2 border-gray-700 rounded-xl font-semibold text-sm disabled:opacity-50 transition hover:bg-gray-700 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReport}
                    disabled={isReporting || !reportReason}
                    className="flex-1 px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                  >
                    {isReporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      "Submit Report"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* DESKTOP MODAL */}
          <div
            className="hidden md:block rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--bg-secondary, #1f2937)",
              borderColor: "var(--border-color, #374151)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/20 p-2 rounded-full">
                  <Flag size={22} className="text-blue-400" />
                </div>
                <h3
                  className="text-xl font-bold"
                  style={{ color: "var(--text-primary, #fff)" }}
                >
                  Report Short
                </h3>
              </div>
              <button
                onClick={closeReportModal}
                className="transition"
                style={{ color: "var(--text-secondary, #666)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--text-primary, #fff)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color =
                    "var(--text-secondary, #9ca3af)";
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p
              className="mb-4 text-xs"
              style={{ color: "var(--text-secondary, #666)" }}
            >
              Help us understand what's wrong with this short
            </p>

            <div className="space-y-2 mb-4">
              {reportReasons.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition text-sm font-medium ${
                    reportReason === reason ? "bg-blue-600 text-white" : ""
                  }`}
                  style={
                    reportReason !== reason
                      ? {
                          backgroundColor: "var(--bg-tertiary, #f3f4f6)",
                          color: "var(--text-primary, #000)",
                        }
                      : undefined
                  }
                  onMouseEnter={(e) => {
                    if (reportReason !== reason) {
                      e.currentTarget.style.backgroundColor =
                        "var(--bg-hover, #4b5563)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (reportReason !== reason) {
                      e.currentTarget.style.backgroundColor =
                        "var(--bg-tertiary, #374151)";
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
              className="w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none mb-4 border"
              style={{
                backgroundColor: "var(--bg-tertiary, #f3f4f6)",
                borderColor: "var(--border-color, #e5e7eb)",
                color: "var(--text-primary, #000)",
              }}
            />

            <div className="flex gap-3">
              <button
                onClick={closeReportModal}
                disabled={isReporting}
                className="flex-1 px-5 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition active:scale-95 border-2"
                style={{
                  backgroundColor: "var(--bg-tertiary, #f3f4f6)",
                  color: "var(--text-primary, #000)",
                  borderColor: "var(--border-color, #e5e7eb)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--bg-hover, #4b5563)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--bg-tertiary, #374151)";
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
        <div className="p-3 pb-24 md:p-5 md:pb-20 lg:p-6 lg:pb-24">
          <div className="flex items-end justify-between gap-3 md:gap-4 lg:gap-6">
            {/* Left Content */}
            <div className="flex-1 pr-2 text-white min-w-0 max-w-[calc(100%-88px)] md:max-w-[calc(100%-140px)] lg:max-w-[calc(100%-160px)]">
              {/* Channel info */}
              <div className="flex items-center mb-2.5 md:mb-3 lg:mb-4 pointer-events-auto">
                <img
                  key={`avatar-${short._id}-${channelAvatar}-${avatarRefreshKey}`}
                  src={getImageUrl(
                    short.userId?.image || short.channelAvatar,
                    true
                  )}
                  alt={channelName}
                  className="w-9 h-9 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full mr-2.5 md:mr-3 lg:mr-4 cursor-pointer object-cover border-2 border-white/20 flex-shrink-0 bg-gray-800"
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
                <div className="flex-1 min-w-0 mr-2 md:mr-3">
                  <p
                    className="font-semibold text-sm md:text-lg lg:text-xl cursor-pointer hover:underline truncate leading-tight mb-0.5 md:mb-1"
                    onClick={handleChannelClick}
                  >
                    @{channelName}
                  </p>
                  <p className="text-xs md:text-sm lg:text-base text-gray-300 leading-tight truncate">
                    {formatCount(subscribersCount)} subscribers
                  </p>
                </div>

                {!isOwnShort && (
                  <button
                    onClick={handleSubscribe}
                    className={`ml-1 px-4 md:px-8 lg:px-10 py-1.5 md:py-2.5 lg:py-3 rounded-full font-semibold text-sm md:text-base lg:text-lg transition-all transform hover:scale-105 flex-shrink-0 ${
                      isSubscribed
                        ? "bg-youtube-hover text-youtube-primary"
                        : "bg-white text-black hover:bg-gray-100"
                    }`}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    {isSubscribed ? "Subscribed" : "Subscribe"}
                  </button>
                )}
              </div>

              {/* Title & Description */}
              <div className="mb-2 md:mb-3 lg:mb-4">
                <h3 className="font-bold text-base md:text-xl lg:text-2xl mb-1 md:mb-2 line-clamp-2 leading-snug">
                  {translatedTitle}
                </h3>
                {translatedDescription && (
                  <p className="text-sm md:text-base lg:text-lg text-gray-300 line-clamp-2 leading-snug">
                    {translatedDescription}
                  </p>
                )}
              </div>

              {/* Views Count - ALWAYS VISIBLE */}
              <p className="text-xs md:text-base lg:text-lg text-gray-400 font-medium md:font-bold">
                {formatCount(viewsCount)} views
              </p>
            </div>

            {/* Right Action Buttons - FULLY RESPONSIVE */}
            <div className="flex flex-col items-center justify-end gap-3 pb-2 pointer-events-auto md:gap-5 md:pb-0 lg:gap-6">
              {/* Like Button */}
              <button
                onClick={handleLike}
                className="flex flex-col items-center gap-1 transition-all transform active:scale-95 hover:scale-105 group touch-manipulation w-full"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <div
                  className={`rounded-full transition-all shadow-lg border flex items-center justify-center ${
                    hasLiked
                      ? "bg-blue-600 border-blue-500 shadow-blue-500/50"
                      : "bg-youtube-tertiary/90 border-youtube/50 shadow-black/50 hover:bg-youtube-tertiary hover:border-youtube/70"
                  } p-2.5 w-[48px] h-[48px] md:p-3.5 md:w-[62px] md:h-[62px] lg:p-4 lg:w-[68px] lg:h-[68px]`}
                >
                  <ThumbsUp
                    className={`${
                      hasLiked ? "text-white" : "text-white"
                    } w-5 h-5 md:w-7 md:h-7 lg:w-8 lg:h-8`}
                    fill={hasLiked ? "white" : "none"}
                    strokeWidth={2.5}
                  />
                </div>
                <span
                  className="text-[11px] md:text-sm lg:text-base font-bold transition-colors leading-none"
                  style={{ color: hasLiked ? "#60a5fa" : "white" }}
                >
                  {formatCount(likesCount)}
                </span>
              </button>

              {/* Dislike Button */}
              <button
                onClick={handleDislike}
                className="flex flex-col items-center gap-1 transition-all transform active:scale-95 hover:scale-105 group touch-manipulation w-full"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <div
                  className={`rounded-full transition-all shadow-lg border flex items-center justify-center ${
                    hasDisliked
                      ? "bg-red-600 border-red-500 shadow-red-500/50"
                      : "bg-youtube-tertiary/90 border-youtube/50 shadow-black/50 hover:bg-youtube-tertiary hover:border-youtube/70"
                  } p-2.5 w-[48px] h-[48px] md:p-3.5 md:w-[62px] md:h-[62px] lg:p-4 lg:w-[68px] lg:h-[68px]`}
                >
                  <ThumbsDown
                    className={`${
                      hasDisliked ? "text-white" : "text-white"
                    } w-5 h-5 md:w-7 md:h-7 lg:w-8 lg:h-8`}
                    fill={hasDisliked ? "white" : "none"}
                    strokeWidth={2.5}
                  />
                </div>
                <span
                  className="text-[11px] md:text-sm lg:text-base font-bold transition-colors leading-none"
                  style={{ color: hasDisliked ? "#f87171" : "white" }}
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
                className="flex flex-col items-center gap-1 transition-all transform active:scale-95 hover:scale-105 group touch-manipulation w-full"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <div className="bg-youtube-tertiary/90 border border-youtube/50 rounded-full transition-all shadow-lg hover:bg-youtube-tertiary hover:border-youtube/70 flex items-center justify-center p-2.5 w-[48px] h-[48px] md:p-3.5 md:w-[62px] md:h-[62px] lg:p-4 lg:w-[68px] lg:h-[68px]">
                  <MessageCircle
                    className="text-white w-5 h-5 md:w-7 md:h-7 lg:w-8 lg:h-8"
                    strokeWidth={2.5}
                  />
                </div>
                <span className="text-white text-[11px] md:text-sm lg:text-base font-bold transition-colors leading-none">
                  {formatCount(commentsCount)}
                </span>
              </button>

              {/* Share Button */}
              <button
                onClick={handleShareClick}
                className="flex flex-col items-center gap-1 transition-all transform active:scale-95 hover:scale-105 group touch-manipulation w-full"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <div className="bg-youtube-tertiary/90 border border-youtube/50 rounded-full transition-all shadow-lg hover:bg-youtube-tertiary hover:border-youtube/70 flex items-center justify-center p-2.5 w-[48px] h-[48px] md:p-3.5 md:w-[62px] md:h-[62px] lg:p-4 lg:w-[68px] lg:h-[68px]">
                  <Share2
                    className="text-white w-5 h-5 md:w-7 md:h-7 lg:w-8 lg:h-8"
                    strokeWidth={2.5}
                  />
                </div>
                <span className="text-white text-[11px] md:text-sm lg:text-base font-bold transition-colors leading-none">
                  Share
                </span>
              </button>

              {/* Volume Control - FIXED FOR DESKTOP */}
              <div className="relative flex flex-col items-center w-full volume-control">
                <button
                  onClick={toggleVolumeSlider}
                  className="flex flex-col items-center gap-1 transition-all transform hover:scale-105 active:scale-95 group touch-manipulation w-full"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <div className="bg-youtube-tertiary/90 border border-youtube/50 rounded-full transition-all shadow-lg hover:bg-youtube-tertiary hover:border-youtube/70 flex items-center justify-center p-2.5 w-[48px] h-[48px] md:p-3.5 md:w-[62px] md:h-[62px] lg:p-4 lg:w-[68px] lg:h-[68px]">
                    {isMuted || volume === 0 ? (
                      <VolumeX
                        className="text-white group-hover:text-yellow-400 transition-colors w-5 h-5 md:w-7 md:h-7 lg:w-8 lg:h-8"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Volume2
                        className="text-white group-hover:text-yellow-400 transition-colors w-5 h-5 md:w-7 md:h-7 lg:w-8 lg:h-8"
                        strokeWidth={2.5}
                      />
                    )}
                  </div>
                  {/* VOLUME PERCENTAGE - NOW ALWAYS VISIBLE */}
                  <span className="text-white text-[11px] md:text-sm lg:text-base font-bold leading-none whitespace-nowrap">
                    {Math.round(volume * 100)}%
                  </span>
                </button>

                {/* Volume Slider Popup */}
                {showVolumeSlider && (
                  <div
                    className="absolute bottom-full mb-3 rounded-xl shadow-2xl border right-0 p-3 md:p-4 lg:p-5"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      backdropFilter: "blur(16px)",
                      borderColor: "var(--border-color)",
                      minWidth: "95px",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col items-center gap-3 md:gap-4">
                      <span
                        className="text-base md:text-lg lg:text-xl font-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {Math.round(volume * 100)}%
                      </span>

                      <div
                        className="relative h-32 md:h-36 lg:h-40 w-2.5 md:w-3 rounded-full overflow-hidden"
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

                      <div className="flex flex-col gap-1.5 w-full">
                        <button
                          onClick={() => handleVolumeChange(1)}
                          className="text-sm md:text-base transition px-3 py-2 rounded text-center font-medium"
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
                          className="text-sm md:text-base transition px-3 py-2 rounded text-center font-medium"
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
                          className="text-sm md:text-base transition px-3 py-2 rounded text-center font-medium"
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
