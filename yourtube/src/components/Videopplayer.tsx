/* eslint-disable react-hooks/exhaustive-deps */
// CompleteVideoPlayer.jsx - Complete Fixed Version
import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  SkipBack,
  SkipForward,
  Loader2,
  ChevronDown,
  Check,
  Cast,
  PictureInPicture,
  Crown,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { getVideoUrl } from "@/lib/urlHelper";

interface CompleteVideoPlayerProps {
  videoId?: string;
  videoUrl?: string;
  video?: any;
}

// ✅ CSS for mobile touch events
const mobileStyles = `
  .controls-area button {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
  
  .mobile-fullscreen-btn {
    pointer-events: auto !important;
    touch-action: manipulation !important;
    z-index: 9999 !important;
    position: relative !important;
  }
`;

// Mock subscription hook
const useSubscription = () => {
  const [data] = useState({
    watchTimeLimit: 5,
    currentPlan: "FREE",
    loading: false,
  });

  return {
    ...data,
    refreshSubscription: async () => {
      console.log("Refreshing subscription...");
    },
  };
};

export default function CompleteVideoPlayer({
  videoId,
  videoUrl,
  video,
}: CompleteVideoPlayerProps) {
  // ✅ CORRECT: All state inside component
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);

  // ✅ CORRECT: getProperVideoUrl function inside component
  const getProperVideoUrl = (): string => {
    console.log("🎬 getProperVideoUrl called");

    const CLOUDINARY_CLOUD_NAME =
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dxuxxk0ss";
    const baseUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload`;

    console.log("☁️ Using Cloudinary cloud name:", CLOUDINARY_CLOUD_NAME);

    if (video) {
      const url = getVideoUrl(video);
      if (url) {
        console.log("✅ Got URL from helper:", url.substring(0, 100));
        return url;
      }
    }

    if (videoUrl) {
      if (
        videoUrl.includes("cloudinary.com") &&
        videoUrl.includes("/video/upload/")
      ) {
        console.log("✅ Using provided videoUrl:", videoUrl.substring(0, 100));
        return videoUrl;
      }

      const match = videoUrl.match(
        /youtube-clone\/videos\/file_\d+_[a-z0-9]+/i
      );
      if (match) {
        const publicId = match[0];
        const reconstructed = `${baseUrl}/f_mp4,vc_h264,ac_aac,af_44100,br_1000k,q_auto:good/${publicId}.mp4`;
        console.log(
          "🔧 Reconstructed from videoUrl:",
          reconstructed.substring(0, 100)
        );
        return reconstructed;
      }
    }

    console.warn("⚠️ Using fallback demo video");
    return "https://www.w3schools.com/html/mov_bbb.mp4";
  };

  const finalVideoUrl = getProperVideoUrl();

  console.log("🎥 FINAL VIDEO URL:", {
    url: finalVideoUrl.substring(0, 100),
    isCloudinary: finalVideoUrl.includes("cloudinary.com"),
    hasPublicId: finalVideoUrl.includes("youtube-clone/videos/"),
  });

  const { watchTimeLimit, currentPlan, refreshSubscription } =
    useSubscription();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [quality, setQuality] = useState("720p");
  const [controlsVisible, setControlsVisible] = useState(true);

  // Mobile/Orientation state
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [canRotate, setCanRotate] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [showRotateHint, setShowRotateHint] = useState(false);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Watch limit state
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(watchTimeLimit);

  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const rotateHintTimeout = useRef<NodeJS.Timeout | null>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  const isUnlimited = watchTimeLimit === -1;
  const watchLimitInSeconds = watchTimeLimit * 60;

  const qualities = ["2160p", "1440p", "1080p", "720p", "480p", "360p", "240p"];
  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  // ✅ Auto-hide controls function
  const resetHideTimer = () => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }

    setControlsVisible(true);

    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  };

  const showControlsTemporarily = () => {
    resetHideTimer();
  };

  // ✅ Effect to manage auto-hide when play state changes
  useEffect(() => {
    if (isPlaying) {
      resetHideTimer();
    } else {
      setControlsVisible(true);
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    }
  }, [isPlaying]);

  // ✅ Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
      if (rotateHintTimeout.current) {
        clearTimeout(rotateHintTimeout.current);
      }
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, []);

  // ✅ Device detection
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent || (navigator as any).vendor;
      const isMobileUA =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent.toLowerCase()
        );
      const isTouchDevice =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;

      const isMobile = isMobileUA || (isTouchDevice && isSmallScreen);
      setIsMobileDevice(isMobile);

      console.log("📱 Device Detection:", {
        isMobileUA,
        isTouchDevice,
        isSmallScreen,
        result: isMobile,
      });
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // ✅ Enhanced device detection
  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent || "";
      const vendor = (navigator as any).vendor || "";

      const mobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent
        );

      const iOS =
        /iPhone|iPad|iPod/.test(userAgent) && !(window as any).MSStream;

      const android = /Android/i.test(userAgent);

      setIsMobile(mobile);
      setIsIOS(iOS);
      setCanRotate(mobile);

      console.log("📱 Device detected:", {
        mobile,
        iOS,
        android,
        userAgent: userAgent.substring(0, 50),
      });
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);
  // ✅ Orientation detection
  useEffect(() => {
    let orientationTimeout: NodeJS.Timeout;

    const handleOrientationChange = () => {
      if (orientationTimeout) {
        clearTimeout(orientationTimeout);
      }

      const matchMediaLandscape = window.matchMedia(
        "(orientation: landscape)"
      ).matches;
      const dimensionLandscape = window.innerWidth > window.innerHeight;
      const orientationAPI =
        (window as any).orientation === 90 ||
        (window as any).orientation === -90;

      const isCurrentlyLandscape =
        matchMediaLandscape || dimensionLandscape || orientationAPI;

      setIsLandscape(isCurrentlyLandscape);

      console.log("🔄 Orientation changed:", {
        isLandscape: isCurrentlyLandscape,
        width: window.innerWidth,
        height: window.innerHeight,
        orientation: (window as any).orientation,
      });

      if (isCurrentlyLandscape && isMobile && isPlaying && !isFullscreen) {
        orientationTimeout = setTimeout(() => {
          console.log("🎬 Auto-entering fullscreen due to landscape rotation");
          enterFullscreen();
        }, 300);
      }

      if (!isCurrentlyLandscape && !isIOS && isFullscreen && isMobile) {
        orientationTimeout = setTimeout(() => {
          console.log("📱 Auto-exiting fullscreen due to portrait rotation");
          exitFullscreen();
        }, 300);
      }
    };

    handleOrientationChange();

    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", handleOrientationChange);

    if ((screen as any).orientation) {
      (screen as any).orientation.addEventListener(
        "change",
        handleOrientationChange
      );
    }

    return () => {
      if (orientationTimeout) clearTimeout(orientationTimeout);
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", handleOrientationChange);
      if ((screen as any).orientation) {
        (screen as any).orientation.removeEventListener(
          "change",
          handleOrientationChange
        );
      }
    };
  }, [isMobile, isPlaying, isFullscreen, isIOS]);

  // ✅ Enhanced fullscreen for iPhone Chrome
  const enterFullscreen = async () => {
    try {
      const container = containerRef.current;
      const video = videoRef.current;

      if (!container || !video) return;

      console.log("⛶ Entering fullscreen...", {
        isIOS,
        isMobile,
        browser: navigator.userAgent.includes("CriOS")
          ? "Chrome iOS"
          : navigator.userAgent.includes("Safari")
          ? "Safari"
          : "Other",
      });

      if (isIOS) {
        if (typeof (video as any).webkitEnterFullscreen === "function") {
          try {
            (video as any).webkitEnterFullscreen();
            setIsFullscreen(true);
            console.log(
              "✅ iOS video fullscreen activated (webkitEnterFullscreen)"
            );
            return;
          } catch (iosError) {
            console.warn("⚠️ webkitEnterFullscreen failed:", iosError);
          }
        }

        if (typeof (video as any).webkitRequestFullscreen === "function") {
          try {
            await (video as any).webkitRequestFullscreen();
            setIsFullscreen(true);
            console.log(
              "✅ iOS webkit fullscreen activated (webkitRequestFullscreen)"
            );
            return;
          } catch (iosError2) {
            console.warn("⚠️ webkitRequestFullscreen failed:", iosError2);
          }
        }

        console.log(
          "⚠️ Native fullscreen not available on iOS, using CSS fallback"
        );
        container.style.position = "fixed";
        container.style.top = "0";
        container.style.left = "0";
        container.style.width = "100vw";
        container.style.height = "100vh";
        container.style.zIndex = "9999";
        document.body.style.overflow = "hidden";
        setIsFullscreen(true);
        console.log("✅ CSS fullscreen simulation activated for iOS");
        return;
      }

      const elem = container as any;

      try {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
          setIsFullscreen(true);
          console.log("✅ Standard fullscreen activated (requestFullscreen)");
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
          setIsFullscreen(true);
          console.log(
            "✅ Standard fullscreen activated (webkitRequestFullscreen)"
          );
        } else if (elem.mozRequestFullScreen) {
          await elem.mozRequestFullScreen();
          setIsFullscreen(true);
          console.log(
            "✅ Standard fullscreen activated (mozRequestFullScreen)"
          );
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
          setIsFullscreen(true);
          console.log("✅ Standard fullscreen activated (msRequestFullscreen)");
        } else {
          throw new Error("No fullscreen API available");
        }

        if (
          !isIOS &&
          isMobile &&
          (screen as any).orientation &&
          typeof (screen as any).orientation.lock === "function"
        ) {
          try {
            await (screen as any).orientation.lock("landscape");
            console.log("✅ Screen locked to landscape");
          } catch (lockError: any) {
            console.log(
              "ℹ️ Orientation lock not supported:",
              lockError.message
            );
          }
        }

        return;
      } catch (fullscreenError) {
        console.warn("⚠️ Native fullscreen failed:", fullscreenError);
      }

      console.log("⚠️ Using CSS fallback for fullscreen");
      container.style.position = "fixed";
      container.style.top = "0";
      container.style.left = "0";
      container.style.width = "100vw";
      container.style.height = "100vh";
      container.style.zIndex = "9999";
      document.body.style.overflow = "hidden";
      setIsFullscreen(true);
      console.log("✅ CSS fullscreen simulation activated");
    } catch (error) {
      console.error("❌ Fullscreen error:", error);

      if (containerRef.current) {
        const container = containerRef.current;
        container.style.position = "fixed";
        container.style.top = "0";
        container.style.left = "0";
        container.style.width = "100vw";
        container.style.height = "100vh";
        container.style.zIndex = "9999";
        document.body.style.overflow = "hidden";
        setIsFullscreen(true);
        console.log("✅ Emergency CSS fullscreen activated");
      } else {
        setShowRotateHint(true);
        if (rotateHintTimeout.current) clearTimeout(rotateHintTimeout.current);
        rotateHintTimeout.current = setTimeout(() => {
          setShowRotateHint(false);
        }, 5000);

        if (!isIOS) {
          alert(
            "Fullscreen not supported. Please rotate your device manually."
          );
        }
      }
    }
  };

  // ✅ Exit fullscreen with CSS cleanup
  const exitFullscreen = async () => {
    try {
      console.log("⛶ Exiting fullscreen...");

      if (containerRef.current) {
        const container = containerRef.current;
        container.style.position = "";
        container.style.top = "";
        container.style.left = "";
        container.style.width = "";
        container.style.height = "";
        container.style.zIndex = "";
        document.body.style.overflow = "";
      }

      const doc = document as any;

      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }

      setIsFullscreen(false);

      if (
        !isIOS &&
        (screen as any).orientation &&
        typeof (screen as any).orientation.unlock === "function"
      ) {
        try {
          (screen as any).orientation.unlock();
          console.log("✅ Screen orientation unlocked");
        } catch (unlockError) {
          console.log("ℹ️ Orientation already unlocked");
        }
      }

      console.log("✅ Fullscreen exited");
    } catch (error) {
      console.error("❌ Exit fullscreen error:", error);
      setIsFullscreen(false);
      if (containerRef.current) {
        containerRef.current.style.position = "";
        containerRef.current.style.top = "";
        containerRef.current.style.left = "";
        containerRef.current.style.width = "";
        containerRef.current.style.height = "";
        containerRef.current.style.zIndex = "";
      }
      document.body.style.overflow = "";
    }
  };

  // ✅ Rotate to landscape
  const rotateToLandscape = async () => {
    try {
      console.log("🔄 Rotate to landscape triggered");

      if (!isPlaying && videoRef.current) {
        try {
          await videoRef.current.play();
          setIsPlaying(true);
          console.log("▶️ Video started playing");
        } catch (playError) {
          console.warn("Play failed:", playError);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 150));

      await enterFullscreen();

      if (!isLandscape) {
        setShowRotateHint(true);
        if (rotateHintTimeout.current) clearTimeout(rotateHintTimeout.current);
        rotateHintTimeout.current = setTimeout(() => {
          setShowRotateHint(false);
        }, 5000);
      }
    } catch (error) {
      console.error("❌ Rotate to landscape error:", error);
      setShowRotateHint(true);
      if (rotateHintTimeout.current) clearTimeout(rotateHintTimeout.current);
      rotateHintTimeout.current = setTimeout(() => {
        setShowRotateHint(false);
      }, 5000);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      await enterFullscreen();
    } else {
      await exitFullscreen();
    }
  };
  // ✅ Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const video = videoRef.current as any;
      const container = containerRef.current;

      const isNativeFullscreen = !!(
        document.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.webkitCurrentFullScreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement ||
        (video && video.webkitDisplayingFullscreen)
      );

      const isCSSFullscreen =
        container &&
        container.style.position === "fixed" &&
        container.style.zIndex === "9999";

      const isCurrentlyFullscreen = isNativeFullscreen || isCSSFullscreen;

      setIsFullscreen(isCurrentlyFullscreen);
      console.log("🖥️ Fullscreen state changed:", {
        native: isNativeFullscreen,
        css: isCSSFullscreen,
        total: isCurrentlyFullscreen,
      });

      if (!isNativeFullscreen && !isCSSFullscreen && container) {
        container.style.position = "";
        container.style.top = "";
        container.style.left = "";
        container.style.width = "";
        container.style.height = "";
        container.style.zIndex = "";
        document.body.style.overflow = "";
      }

      if (!isCurrentlyFullscreen && !isIOS) {
        if (
          (screen as any).orientation &&
          typeof (screen as any).orientation.unlock === "function"
        ) {
          try {
            (screen as any).orientation.unlock();
          } catch (err) {
            console.log("Orientation already unlocked");
          }
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    const video = videoRef.current;
    if (video) {
      (video as any).addEventListener(
        "webkitbeginfullscreen",
        handleFullscreenChange
      );
      (video as any).addEventListener(
        "webkitendfullscreen",
        handleFullscreenChange
      );
      (video as any).addEventListener(
        "webkitpresentationmodechanged",
        handleFullscreenChange
      );
    }

    const handleVisibilityChange = () => {
      if (document.hidden && isFullscreen) {
        console.log("📱 App backgrounded, maintaining fullscreen state");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullscreenChange
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (video) {
        (video as any).removeEventListener(
          "webkitbeginfullscreen",
          handleFullscreenChange
        );
        (video as any).removeEventListener(
          "webkitendfullscreen",
          handleFullscreenChange
        );
        (video as any).removeEventListener(
          "webkitpresentationmodechanged",
          handleFullscreenChange
        );
      }
    };
  }, [isIOS, isFullscreen]);

  // Check if limit reached on mount
  useEffect(() => {
    if (!isUnlimited && watchTimeLimit <= 0) {
      setIsBlocked(true);
      setShowUpgradeModal(true);
    }
  }, [watchTimeLimit, isUnlimited]);

  // Track watch time every 10 seconds
  useEffect(() => {
    if (isBlocked || isUnlimited || !isPlaying) return;

    const interval = setInterval(async () => {
      const newWatchedSeconds = watchedSeconds + 10;
      setWatchedSeconds(newWatchedSeconds);

      const remainingSeconds = watchLimitInSeconds - newWatchedSeconds;
      const remainingMins = Math.ceil(remainingSeconds / 60);
      setRemainingMinutes(remainingMins);

      console.log("📊 Tracking 10 seconds of watch time");

      if (remainingSeconds <= 0) {
        videoRef.current?.pause();
        setIsPlaying(false);
        setIsBlocked(true);
        setShowUpgradeModal(true);
        await refreshSubscription();
      }

      if (remainingSeconds === 60 && remainingSeconds > 50) {
        console.log("⚠️ Only 1 minute of watch time remaining!");
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [
    watchedSeconds,
    isBlocked,
    isUnlimited,
    isPlaying,
    watchLimitInSeconds,
    refreshSubscription,
  ]);
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatMinutes = (minutes: number) => {
    if (minutes === -1) return "Unlimited";
    return `${minutes} min${minutes !== 1 ? "s" : ""}`;
  };

  const togglePlay = () => {
    if (isBlocked) {
      setShowUpgradeModal(true);
      return;
    }

    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isDragging) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // ✅ FIXED: Progress bar click with proper dragging support
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressBarRef.current || isBlocked) return;

    e.stopPropagation();

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;

    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // ✅ ADD: Mouse drag support
  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleProgressClick(e);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!videoRef.current || !progressBarRef.current) return;

      const rect = progressBarRef.current.getBoundingClientRect();
      const clickX = moveEvent.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      const newTime = percentage * duration;

      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const skip = (seconds: number) => {
    if (videoRef.current && !isBlocked) {
      videoRef.current.currentTime += seconds;
    }
  };

  const changeSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackRate(speed);
      setShowSpeed(false);
    }
  };

  const changeQuality = (q: string) => {
    setQuality(q);
    setShowQuality(false);
  };

  // ✅ Handle video click
  const handleVideoClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isMobile && !isFullscreen) {
      console.log("📱 Mobile video clicked, triggering fullscreen");
      await enterFullscreen();

      if (!isPlaying && videoRef.current) {
        try {
          await videoRef.current.play();
          setIsPlaying(true);
        } catch (playError) {
          console.warn("Auto-play failed:", playError);
        }
      }
    } else {
      togglePlay();
      showControlsTemporarily();
    }
  };

  // ✅ Container click handler
  const handleContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    if (
      target.closest("button") ||
      target.closest(".controls-area") ||
      target === videoRef.current
    ) {
      return;
    }

    togglePlay();
  };
  // ✅ Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobileDevice) return;

    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobileDevice) return;

    const touch = e.changedTouches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        skip(10);
        console.log("👉 Swipe right: +10s");
      } else {
        skip(-10);
        console.log("👈 Swipe left: -10s");
      }
    }
  };

  const handleDoubleTap = (e: React.TouchEvent) => {
    if (!isMobileDevice || !videoRef.current) return;

    const rect = videoRef.current.getBoundingClientRect();
    const tapX = e.changedTouches[0].clientX - rect.left;
    const videoWidth = rect.width;

    if (tapX < videoWidth / 3) {
      skip(-10);
      console.log("⏪ Double tap left: -10s");
    } else if (tapX > (videoWidth * 2) / 3) {
      skip(10);
      console.log("⏩ Double tap right: +10s");
    } else {
      togglePlay();
      console.log("⏯️ Double tap center: play/pause");
    }
  };

  let lastTap = 0;
  const handleTap = (e: React.TouchEvent) => {
    if (!isMobileDevice) return;

    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;

    if (tapLength < 300 && tapLength > 0) {
      handleDoubleTap(e);
    }

    lastTap = currentTime;
  };

  // ✅ Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (videoRef.current) {
            const newVolume = Math.min(1, volume + 0.1);
            setVolume(newVolume);
            videoRef.current.volume = newVolume;
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (videoRef.current) {
            const newVolume = Math.max(0, volume - 0.1);
            setVolume(newVolume);
            videoRef.current.volume = newVolume;
          }
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isPlaying, volume]);
  return (
    <div className="w-full max-w-6xl mx-auto bg-black">
      <style>{mobileStyles}</style>
      <div
        ref={containerRef}
        className={`relative bg-black group ${
          isMobile && isLandscape && isFullscreen
            ? "fixed inset-0 z-50"
            : "aspect-video"
        }`}
        onMouseMove={() => {
          if (!isMobileDevice) showControlsTemporarily();
        }}
        onMouseLeave={() => {
          if (!isMobileDevice && isPlaying) setControlsVisible(false);
        }}
        onTouchStart={(e) => {
          if (isMobileDevice) {
            handleTouchStart(e);
            const target = e.target as HTMLElement;
            if (
              !target.closest("button") &&
              !target.closest(".controls-area")
            ) {
              showControlsTemporarily();
            }
          }
        }}
        onTouchEnd={(e) => {
          if (isMobileDevice) {
            handleTouchEnd(e);
            handleTap(e);
            if (isPlaying) {
              showControlsTemporarily();
            }
          }
        }}
        onClick={handleContainerClick}
      >
        <video
          ref={videoRef}
          onClickCapture={(e) => {
            e.stopPropagation();
            handleVideoClick(e);
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={(e) => {
            handleTouchEnd(e);
            handleTap(e);
          }}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
          onEnded={() => setIsPlaying(false)}
          playsInline
          webkit-playsinline="true"
          x5-playsinline="true"
          x5-video-player-type="h5-page"
          x5-video-player-fullscreen="true"
          x5-video-orientation="landscape|portrait"
          preload="metadata"
          poster="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1920&h=1080&fit=crop"
        >
          <source src={finalVideoUrl} type="video/mp4" />
        </video>
        {/* ✅ Rotation Hint Overlay */}
        {showRotateHint && isMobile && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30 animate-in fade-in">
            <div className="text-center px-6">
              <RotateCcw
                className="w-16 h-16 text-white mx-auto mb-4 animate-spin"
                style={{ animationDuration: "2s" }}
              />
              <p className="text-white text-xl font-bold mb-2">
                {isIOS ? "Rotate Your Device" : "Please Rotate Your Device"}
              </p>
              <p className="text-white/80 text-sm">
                {isIOS
                  ? "Turn your device to landscape for the best viewing experience"
                  : "Rotate to landscape mode to watch fullscreen"}
              </p>
            </div>
          </div>
        )}
        {/* Watch Time Remaining Indicator */}
        {!isUnlimited && !isBlocked && controlsVisible && (
          <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 z-30">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <span className="font-medium">
              {formatMinutes(remainingMinutes)} left
            </span>
          </div>
        )}
        {/* Buffering Indicator */}
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <Loader2 className="w-16 h-16 text-white animate-spin" />
          </div>
        )}
        {/* Center Play Button */}
        {!isPlaying && !isBuffering && !showUpgradeModal && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              disabled={isBlocked}
              className="w-20 h-20 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-full transition transform hover:scale-110 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-10 h-10 text-white ml-1" fill="white" />
            </button>
          </div>
        )}
        {/* Top Gradient */}
        <div
          className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
            controlsVisible ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* ✅ Bottom Controls with controlsVisible state */}
        <div
          className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
            controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{ zIndex: 40 }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {/* ✅ FIXED Progress Bar with Drag Support */}
          <div
            ref={progressBarRef}
            className="relative h-2 bg-white/30 cursor-pointer group/progress hover:h-3 transition-all"
            onClick={handleProgressClick}
            onMouseDown={handleProgressMouseDown}
            onTouchStart={(e) => {
              setIsDragging(true);
              const touch = e.touches[0];
              if (!progressBarRef.current || !videoRef.current) return;
              const rect = progressBarRef.current.getBoundingClientRect();
              const clickX = touch.clientX - rect.left;
              const percentage = Math.max(0, Math.min(1, clickX / rect.width));
              const newTime = percentage * duration;
              videoRef.current.currentTime = newTime;
            }}
            onTouchMove={(e) => {
              if (!isDragging || !progressBarRef.current || !videoRef.current)
                return;
              const touch = e.touches[0];
              const rect = progressBarRef.current.getBoundingClientRect();
              const clickX = touch.clientX - rect.left;
              const percentage = Math.max(0, Math.min(1, clickX / rect.width));
              const newTime = percentage * duration;
              videoRef.current.currentTime = newTime;
            }}
            onTouchEnd={() => setIsDragging(false)}
          >
            {/* Buffer indicator */}
            <div
              className="absolute top-0 left-0 h-full bg-white/50 transition-all"
              style={{
                width: `${
                  videoRef.current?.buffered.length > 0
                    ? (videoRef.current.buffered.end(0) / duration) * 100
                    : 0
                }%`,
              }}
            />

            {/* Progress indicator */}
            <div
              className="absolute top-0 left-0 h-full bg-red-600 transition-all"
              style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
            >
              {/* Scrubber dot */}
              <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-4 h-4 bg-red-600 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-lg" />
            </div>
          </div>

          {/* Controls Area */}
          <div
            className="controls-area bg-gradient-to-t from-black via-black/95 to-transparent px-4 py-3"
            style={{ pointerEvents: "auto" }}
          >
            <div className="flex items-center justify-between gap-4">
              {/* Left Controls */}
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={togglePlay}
                  disabled={isBlocked}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Play/Pause (k)"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" fill="white" />
                  ) : (
                    <Play className="w-6 h-6" fill="white" />
                  )}
                </button>

                <button
                  onClick={() => skip(-10)}
                  disabled={isBlocked}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition hidden md:block disabled:opacity-50"
                  title="Rewind 10s (←)"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  onClick={() => skip(10)}
                  disabled={isBlocked}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition hidden md:block disabled:opacity-50"
                  title="Forward 10s (→)"
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                {/* Volume Control */}
                <div
                  className="relative flex items-center gap-2 group/volume"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button
                    onClick={toggleMute}
                    className="text-white hover:bg-white/20 p-2 rounded-full transition"
                    title="Mute (m)"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>

                  <div
                    className={`hidden md:flex items-center transition-all duration-300 ${
                      showVolumeSlider ? "w-28 opacity-100" : "w-0 opacity-0"
                    }`}
                  >
                    <div className="relative w-full h-1 bg-white/20 rounded-full overflow-hidden">
                      {/* Volume fill indicator */}
                      <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-white to-white/90 rounded-full transition-all duration-150"
                        style={{ width: `${volume * 100}%` }}
                      />

                      {/* Actual range input */}
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer z-10
                        [&::-webkit-slider-thumb]:appearance-none 
                        [&::-webkit-slider-thumb]:w-3.5 
                        [&::-webkit-slider-thumb]:h-3.5 
                        [&::-webkit-slider-thumb]:rounded-full 
                        [&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:cursor-pointer 
                        [&::-webkit-slider-thumb]:shadow-lg
                        [&::-webkit-slider-thumb]:transition-transform
                        [&::-webkit-slider-thumb]:duration-150
                        [&::-webkit-slider-thumb]:hover:scale-125
                        [&::-webkit-slider-thumb]:active:scale-110
                        [&::-moz-range-thumb]:w-3.5 
                        [&::-moz-range-thumb]:h-3.5 
                        [&::-moz-range-thumb]:rounded-full 
                        [&::-moz-range-thumb]:bg-white
                        [&::-moz-range-thumb]:border-0
                        [&::-moz-range-thumb]:cursor-pointer 
                        [&::-moz-range-thumb]:shadow-lg
                        [&::-moz-range-thumb]:transition-transform
                        [&::-moz-range-thumb]:duration-150
                        [&::-moz-range-thumb]:hover:scale-125
                        [&::-moz-range-thumb]:active:scale-110"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-white text-sm font-medium tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
              {/* Right Controls */}
              <div
                className="flex items-center gap-2 md:gap-3"
                style={{ zIndex: 50, position: "relative" }}
              >
                {/* Mobile Fullscreen Button */}
                {isMobile && !isFullscreen && (
                  <button
                    onTouchStart={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("🔴 Fullscreen button TOUCHED");
                      setUserInteracted(true);
                      await rotateToLandscape();
                    }}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("🔴 Fullscreen button CLICKED");
                      await rotateToLandscape();
                    }}
                    className="mobile-fullscreen-btn text-white hover:bg-red-700 p-2.5 rounded-full transition bg-red-600 shadow-lg animate-pulse relative"
                    style={{
                      zIndex: 9999,
                      pointerEvents: "auto",
                      touchAction: "manipulation",
                    }}
                    title={
                      isIOS
                        ? "Watch fullscreen (rotate device)"
                        : "Watch fullscreen"
                    }
                  >
                    <Maximize className="w-5 h-5" />
                    {isIOS && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
                    )}
                  </button>
                )}

                {/* Cast Button */}
                <button
                  className="text-white hover:bg-white/20 p-2 rounded-full transition hidden md:block"
                  title="Cast"
                >
                  <Cast className="w-5 h-5" />
                </button>

                {/* Picture in Picture */}
                <button
                  onClick={() => videoRef.current?.requestPictureInPicture()}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition hidden md:block"
                  title="Picture in Picture"
                >
                  <PictureInPicture className="w-5 h-5" />
                </button>

                {/* Settings Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="text-white hover:bg-white/20 p-2 rounded-full transition"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  {showSettings && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowSettings(false)}
                      />
                      <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-xl rounded-lg shadow-2xl overflow-hidden min-w-[240px] z-50 border border-white/10">
                        {!showQuality && !showSpeed ? (
                          <>
                            <button
                              onClick={() => setShowQuality(true)}
                              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition flex items-center justify-between text-sm"
                            >
                              <span>Quality</span>
                              <div className="flex items-center gap-2 text-gray-400">
                                <span>{quality}</span>
                                <ChevronDown className="w-4 h-4 -rotate-90" />
                              </div>
                            </button>
                            <button
                              onClick={() => setShowSpeed(true)}
                              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition flex items-center justify-between text-sm"
                            >
                              <span>Playback speed</span>
                              <div className="flex items-center gap-2 text-gray-400">
                                <span>
                                  {playbackRate === 1
                                    ? "Normal"
                                    : playbackRate + "x"}
                                </span>
                                <ChevronDown className="w-4 h-4 -rotate-90" />
                              </div>
                            </button>
                          </>
                        ) : showQuality ? (
                          <>
                            <button
                              onClick={() => setShowQuality(false)}
                              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition flex items-center gap-2 text-sm border-b border-white/10"
                            >
                              <ChevronDown className="w-4 h-4 rotate-90" />
                              <span>Quality</span>
                            </button>
                            {qualities.map((q) => (
                              <button
                                key={q}
                                onClick={() => changeQuality(q)}
                                className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition flex items-center justify-between text-sm"
                              >
                                <span>{q}</span>
                                {quality === q && (
                                  <Check className="w-4 h-4 text-blue-500" />
                                )}
                              </button>
                            ))}
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setShowSpeed(false)}
                              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition flex items-center gap-2 text-sm border-b border-white/10"
                            >
                              <ChevronDown className="w-4 h-4 rotate-90" />
                              <span>Playback speed</span>
                            </button>
                            {speeds.map((speed) => (
                              <button
                                key={speed}
                                onClick={() => changeSpeed(speed)}
                                className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition flex items-center justify-between text-sm"
                              >
                                <span>
                                  {speed === 1 ? "Normal" : speed + "x"}
                                </span>
                                {playbackRate === speed && (
                                  <Check className="w-4 h-4 text-blue-500" />
                                )}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Fullscreen Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullscreen();
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition"
                  title={isMobile ? "Fullscreen/Rotate" : "Fullscreen (f)"}
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5" />
                  ) : (
                    <Maximize className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        ``` ## Part 10: Keyboard Shortcuts, Upgrade Modal, and Video Info
        ```typescript
        {/* Keyboard Shortcuts Hint */}
        {!isPlaying && !showUpgradeModal && !isMobile && (
          <div className="absolute bottom-20 left-4 text-white text-xs bg-black/80 backdrop-blur-md rounded-lg p-3 hidden md:block">
            <div className="font-semibold mb-2">Shortcuts:</div>
            <div className="space-y-1 text-gray-300">
              <div>Space/K - Play/Pause</div>
              <div>← → - Skip 10s</div>
              <div>↑ ↓ - Volume</div>
              <div>F - Fullscreen</div>
              <div>M - Mute</div>
            </div>
          </div>
        )}
        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-800 rounded-xl p-8 max-w-md w-full border border-zinc-700">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500/20 rounded-full mb-4">
                  <Crown className="w-8 h-8 text-yellow-500" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">
                  Watch Time Limit Reached
                </h3>

                <p className="text-zinc-400 mb-6">
                  Your {currentPlan} plan allows {formatMinutes(watchTimeLimit)}{" "}
                  of watch time. Upgrade to continue watching unlimited content!
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => (window.location.href = "/subscription")}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Upgrade Now
                  </button>

                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t border-zinc-700">
                  <h4 className="font-semibold text-white mb-3">
                    Available Plans:
                  </h4>
                  <div className="text-sm text-zinc-400 space-y-2">
                    <div className="flex items-center justify-between bg-zinc-700/50 p-2 rounded">
                      <span>🥉 Bronze</span>
                      <span className="font-semibold">₹10 - 7 mins</span>
                    </div>
                    <div className="flex items-center justify-between bg-zinc-700/50 p-2 rounded">
                      <span>🥈 Silver</span>
                      <span className="font-semibold">₹50 - 10 mins</span>
                    </div>
                    <div className="flex items-center justify-between bg-zinc-700/50 p-2 rounded">
                      <span>🥇 Gold</span>
                      <span className="font-semibold">₹100 - Unlimited</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Mobile Gesture Hints - Only show when paused and controls visible */}
        {isMobileDevice && controlsVisible && !isPlaying && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Left Gesture Hint */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/3 h-full flex items-center justify-center">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 flex flex-col items-center gap-1">
                <SkipBack className="w-6 h-6 text-white" />
                <span className="text-white text-xs font-medium">
                  Double tap -10s
                </span>
              </div>
            </div>

            {/* Center Gesture Hint */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-full flex items-center justify-center">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 flex flex-col items-center gap-1">
                <Play className="w-6 h-6 text-white" />
                <span className="text-white text-xs font-medium">
                  Tap to Play
                </span>
              </div>
            </div>

            {/* Right Gesture Hint */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-full flex items-center justify-center">
              <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 flex flex-col items-center gap-1">
                <SkipForward className="w-6 h-6 text-white" />
                <span className="text-white text-xs font-medium">
                  Double tap +10s
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      ){/* Video Info Section */}
      <div className="bg-[#0f0f0f] text-white p-4">
        <h1 className="text-lg md:text-xl font-semibold mb-2">
          Demo Video - Enhanced Mobile Rotation {isIOS ? "(iOS)" : "(Android)"}
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
          <span>@YourChannel</span>
          <span>•</span>
          <span>12K views</span>
          <span>•</span>
          <span>2 days ago</span>
          {!isUnlimited && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>
                  {currentPlan} Plan - {formatMinutes(remainingMinutes)} left
                </span>
              </div>
            </>
          )}

          {isUnlimited && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1 text-green-400">
                <Crown className="w-3 h-3" />
                <span>Premium - Unlimited</span>
              </div>
            </>
          )}
        </div>

        {/* Quality Change Loading Indicator */}
        {changeQuality && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-40 pointer-events-none">
            <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span className="text-white text-sm font-medium">
                Changing Quality...
              </span>
            </div>
          </div>
        )}

        {isMobile && (
          <div className="mt-3 p-3 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/40 rounded-lg">
            <div className="flex items-start gap-2">
              <RotateCcw className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-300 font-medium mb-1">
                  {isIOS ? "📱 iPhone Detected" : "📱 Android Device Detected"}
                </p>
                <p className="text-xs text-red-200">
                  {isIOS
                    ? "Tap the red fullscreen button or tap the video directly. On iPhone Chrome, the video will enter native fullscreen mode automatically."
                    : "Tap the red fullscreen button to auto-rotate to landscape mode, or rotate your device manually."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
