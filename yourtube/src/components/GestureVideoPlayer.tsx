/* eslint-disable react-hooks/exhaustive-deps */

"use client";

import { useRef, useState, useEffect } from "react";
import {
  SkipForward,
  SkipBack,
  Pause,
  Play,
  MessageSquare,
  X,
  Volume2,
  VolumeX,
  Volume1,
  Settings,
  Maximize,
  Minimize,
  Subtitles,
  PictureInPicture,
  Share2,
  Check,
  ChevronLeft,
} from "lucide-react";
import { useRouter } from "next/router";
import { Button } from "./ui/button";
import { getVideoUrl } from "@/lib/urlHelper";
import { useSubscription } from "@/lib/SubscriptionContext";

// Quality type definition
// Quality type definition
type QualityType =
  | "auto"
  | "1080p"
  | "720p"
  | "480p"
  | "360p"
  | "240p"
  | "144p";

// Quality labels with descriptions
const qualityLabels: Record<
  QualityType,
  { full: string; short: string; desc: string }
> = {
  auto: { full: "Auto", short: "Auto", desc: "Recommended" },
  "1080p": { full: "1080p", short: "1080p", desc: "Full HD" },
  "720p": { full: "720p", short: "720p", desc: "HD" },
  "480p": { full: "480p", short: "480p", desc: "SD" },
  "360p": { full: "360p", short: "360p", desc: "Low" },
  "240p": { full: "240p", short: "240p", desc: "Data Saver" },
  "144p": { full: "144p", short: "144p", desc: "Minimum" },
};
// ================================
// MOBILE-OPTIMIZED QUALITY SELECTOR
// ================================

// ================================
// MOBILE-OPTIMIZED QUALITY SELECTOR - FIXED VERSION
// ================================

interface QualitySelectorProps {
  currentQuality: QualityType;
  onQualityChange: (quality: QualityType) => void;
  availableQualities?: QualityType[];
  isMobile: boolean;
}

const QualitySelector: React.FC<QualitySelectorProps> = ({
  currentQuality,
  onQualityChange,
  availableQualities = [
    "auto",
    "1080p",
    "720p",
    "480p",
    "360p",
    "240p",
    "144p",
  ],
  isMobile,
}) => {
  // ✅ REMOVED DUPLICATE: isMobileView (use isMobile prop instead)
  const [isOpen, setIsOpen] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // ✅ FIX: Close on outside click (works for both mobile and desktop)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const clickedMenu = menuRef.current?.contains(target);
      const clickedButton = buttonRef.current?.contains(target);

      if (!clickedMenu && !clickedButton) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("touchstart", handleClickOutside, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("touchstart", handleClickOutside, true);
    };
  }, [isOpen]);

  // ✅ FIX: Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // ✅ FIX: Prevent body scroll ONLY on mobile
  useEffect(() => {
    if (isMobile && isOpen) {
      const scrollY = window.scrollY;
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;

      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";

      return () => {
        document.body.style.position = originalPosition;
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMobile, isOpen]);

  const openMenu = () => {
    setIsOpen(true);
    setShowQualityMenu(false);
  };

  const closeMenu = () => {
    setIsOpen(false);
    setShowQualityMenu(false);
  };

  const toggleMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();

    // Prevent opening if already transitioning
    if (isChanging) return;

    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  const handleQualitySelect = async (quality: QualityType) => {
    if (quality === currentQuality || isChanging) return;

    setIsChanging(true);
    try {
      await onQualityChange(quality);
    } catch (error) {
      console.error("Quality change failed:", error);
    } finally {
      setIsChanging(false);
      closeMenu();
    }
  };

  return (
    <div
      className="relative"
      style={{
        zIndex: isOpen && isMobile ? 99999 : isOpen ? 9999 : 50,
        isolation: isMobile && isOpen ? "isolate" : "auto",
      }}
    >
      {/* Settings Button */}
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        onTouchStart={(e) => {
          e.stopPropagation();
        }}
        className="flex items-center justify-center text-white hover:bg-white/20 active:bg-white/30 rounded-full transition-all duration-150 touch-manipulation relative"
        style={{
          WebkitTapHighlightColor: "transparent",
          minHeight: isMobile ? "44px" : "40px",
          minWidth: isMobile ? "44px" : "40px",
          height: isMobile ? "44px" : "40px",
          width: isMobile ? "44px" : "40px",
          zIndex: 50,
        }}
        aria-label="Quality settings"
        aria-expanded={isOpen}
      >
        <Settings className={isMobile ? "w-6 h-6" : "w-5 h-5"} />
      </button>

      {/* ✅ MOBILE VIEW - Bottom Sheet */}
      {isMobile && isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            isolation: "isolate",
            pointerEvents: "none",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            height: "100dvh", // ✅ REPLACED
          }}
        >
          <div
            style={{
              pointerEvents: "auto",
              width: "100%",
              height: "100dvh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[99998] animate-in fade-in duration-200"
              style={{
                touchAction: "none",
                backgroundColor: "rgba(0, 0, 0, 0.75)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                closeMenu();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                closeMenu();
              }}
            />

            {/* Bottom Sheet Menu */}
            <div
              ref={menuRef}
              className="relative z-[99999] flex flex-col animate-in slide-in-from-bottom duration-300"
              style={{
                background: "rgba(28, 28, 28, 0.98)",
                backdropFilter: "blur(20px)",
                borderRadius: "16px 16px 0 0",
                maxHeight: "min(80dvh, calc(100dvh - 96px))", // ✅ REPLACED
                height: "auto",

                boxShadow: "0 -8px 40px rgba(0, 0, 0, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                touchAction: "none",
                willChange: "transform",
                transform: "translateZ(0)",
                marginBottom: "0",
                paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Video quality selector"
            >
              {/* Header */}
              <div
                className="sticky top-0 z-10"
                style={{
                  background: "rgba(28, 28, 28, 0.98)",
                  backdropFilter: "blur(20px)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <button
                  className="w-full px-5 py-3.5 text-left text-white hover:bg-white/10 active:bg-white/15 transition-colors flex items-center gap-3 touch-manipulation"
                  style={{
                    WebkitTapHighlightColor: "transparent",
                    minHeight: "56px",
                    background: "rgba(22, 22, 22, 1)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                  }}
                  aria-label="Close quality selector"
                >
                  <ChevronLeft
                    className="w-5 h-5"
                    style={{ color: "rgba(255, 255, 255, 0.9)" }}
                  />
                  <span className="text-sm font-semibold tracking-tight">
                    Quality
                  </span>
                </button>
              </div>

              {/* Quality Options */}
              <div
                className="overflow-y-auto overflow-x-hidden flex-1"
                style={{
                  WebkitOverflowScrolling: "touch",
                  background: "rgba(15, 15, 15, 0.98)",
                  paddingBottom: "8px",
                  paddingTop: "4px",
                  overscrollBehavior: "contain",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  maxHeight: "calc(80dvh - 112px)", // ✅ REPLACED
                }}
              >
                {availableQualities.map((quality) => {
                  const isActive = quality === currentQuality;
                  const label = qualityLabels[quality];

                  return (
                    <button
                      key={quality}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQualitySelect(quality);
                      }}
                      onTouchStart={(e) => {
                        if (!isChanging) {
                          e.currentTarget.style.background =
                            "rgba(255, 255, 255, 0.18)";
                        }
                      }}
                      onTouchEnd={(e) => {
                        e.currentTarget.style.background = isActive
                          ? "rgba(255, 255, 255, 0.12)"
                          : "transparent";
                      }}
                      disabled={isChanging}
                      className="w-full px-5 py-4 text-left hover:bg-white/10 active:bg-white/15 transition-colors flex items-center justify-between touch-manipulation"
                      style={{
                        background: isActive
                          ? "rgba(255, 255, 255, 0.12)"
                          : "transparent",
                        WebkitTapHighlightColor: "transparent",
                        opacity: isChanging ? 0.5 : 1,
                        cursor: isChanging ? "not-allowed" : "pointer",
                        minHeight: "56px",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                      role="menuitemradio"
                      aria-checked={isActive}
                    >
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-base font-normal text-white tracking-wide">
                          {label.full}
                        </span>
                        {quality === "auto" && (
                          <span
                            className="text-xs font-normal"
                            style={{ color: "rgba(255, 255, 255, 0.65)" }}
                          >
                            {label.desc}
                          </span>
                        )}
                      </div>
                      {isActive && !isChanging && (
                        <Check
                          className="w-[22px] h-[22px] flex-shrink-0"
                          style={{
                            color: "#ff0000",
                            strokeWidth: 3,
                            filter: "drop-shadow(0 0 2px rgba(255, 0, 0, 0.5))",
                          }}
                        />
                      )}
                      {isChanging && isActive && (
                        <div
                          className="w-4 h-4 rounded-full animate-spin flex-shrink-0"
                          style={{
                            border: "2px solid #ff0000",
                            borderTopColor: "transparent",
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ✅ DESKTOP VIEW - Dropdown Menu */}
      {!isMobile && isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 rounded-xl shadow-2xl"
          style={{
            bottom: "calc(100% + 8px)",
            background: "rgba(28, 28, 28, 0.98)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            minWidth: "260px",
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!showQualityMenu ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowQualityMenu(true);
              }}
              className="w-full px-4 py-4 text-left text-white hover:bg-white/10 active:bg-white/15 transition-colors flex items-center justify-between rounded-xl"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">Quality</span>
                <span
                  className="text-xs"
                  style={{ color: "rgba(255, 255, 255, 0.7)" }}
                >
                  {qualityLabels[currentQuality]?.short || currentQuality}
                </span>
              </div>
              <svg
                className="w-5 h-5"
                style={{ color: "rgba(255, 255, 255, 0.7)" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQualityMenu(false);
                }}
                className="w-full px-4 py-4 text-left text-white hover:bg-white/10 transition-colors flex items-center gap-3 sticky top-0 rounded-t-xl"
                style={{
                  background: "rgba(22, 22, 22, 0.98)",
                  backdropFilter: "blur(20px)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  zIndex: 10,
                }}
              >
                <svg
                  className="w-5 h-5 rotate-180"
                  style={{ color: "rgba(255, 255, 255, 0.9)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <span className="text-sm font-semibold">Quality</span>
              </button>

              <div
                className="overflow-y-auto overflow-x-hidden"
                style={{ maxHeight: "50vh" }}
              >
                {availableQualities.map((q) => (
                  <button
                    key={q}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQualitySelect(q);
                    }}
                    disabled={isChanging}
                    className="w-full px-5 py-4 text-left hover:bg-white/10 active:bg-white/15 transition-colors flex items-center justify-between"
                    style={{
                      background:
                        currentQuality === q
                          ? "rgba(255, 255, 255, 0.05)"
                          : "transparent",
                      opacity: isChanging ? 0.5 : 1,
                      cursor: isChanging ? "not-allowed" : "pointer",
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-white">
                        {qualityLabels[q]?.short || q}
                      </span>
                      {q === "auto" && (
                        <span
                          className="text-xs"
                          style={{ color: "rgba(255, 255, 255, 0.6)" }}
                        >
                          Recommended
                        </span>
                      )}
                    </div>
                    {currentQuality === q && !isChanging && (
                      <Check
                        className="w-5 h-5 flex-shrink-0"
                        style={{ color: "#ff0000" }}
                      />
                    )}
                    {isChanging && currentQuality === q && (
                      <div
                        className="w-5 h-5 rounded-full animate-spin"
                        style={{
                          border: "2px solid #ff0000",
                          borderTopColor: "transparent",
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

interface GestureVideoPlayerProps {
  video: {
    [x: string]: any;
    filepath: any;
    filename: any;
    _id: string;
    videotitle: string;
    videofilename: string;
  };
  allVideos?: any[];
  onShowComments?: () => void;
  onShare?: (currentTime?: number) => void;
}

export default function GestureVideoPlayer({
  video,
  allVideos = [],
  onShowComments,
  onShare,
}: GestureVideoPlayerProps) {
  // ================================
  // REFS
  // ================================
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadedVideoIdRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const watchTimeCheckInterval = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();

  // ================================
  // VIDEO STATE
  // ================================
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [buffered, setBuffered] = useState(0);
  const [quality, setQuality] = useState<QualityType>("auto");
  const [isChangingQuality, setIsChangingQuality] = useState(false);

  // ================================
  // UI STATE
  // ================================
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showGestureGuide, setShowGestureGuide] = useState(false);
  const [showGestureHint, setShowGestureHint] = useState(true);

  // ================================
  // GESTURE STATE
  // ================================
  const [lastTap, setLastTap] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [tapTimer, setTapTimer] = useState<NodeJS.Timeout | null>(null);
  const [gestureIndicator, setGestureIndicator] = useState<{
    show: boolean;
    type:
      | "forward"
      | "backward"
      | "pause"
      | "play"
      | "next"
      | "comments"
      | "close"
      | "share";
    position: "left" | "center" | "right";
  } | null>(null);

  // ================================
  // MOBILE GESTURE STATE
  // ================================
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [seeking, setSeeking] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);

  // ================================
  // SUBSCRIPTION STATE
  // ================================
  const [watchTimeExceeded, setWatchTimeExceeded] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [watchedMinutes, setWatchedMinutes] = useState(0);
  const { watchTimeLimit, currentPlan } = useSubscription();

  // Available qualities
  const availableQualities: QualityType[] = [
    "auto",
    "1080p",
    "720p",
    "480p",
    "360p",
    "240p",
    "144p",
  ];
  // ================================
  // MOBILE DETECTION
  // ================================
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ================================
  // HIDE GESTURE HINT AFTER 3 SECONDS
  // ================================
  useEffect(() => {
    if (isMobile && showGestureHint) {
      const timer = setTimeout(() => {
        setShowGestureHint(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isMobile, showGestureHint]);
  // ================================
  // GET VIDEO FILENAME
  // ================================
  const getVideoFilename = () => {
    let filename = null;
    if (video?.filepath) {
      filename = video.filepath.split(/[\\/]/).pop();
    } else if (video?.videofilename) {
      filename = video.videofilename;
    } else if (video?.filename) {
      filename = video.filename;
    }
    return filename;
  };
  // ================================
  // WATCH TIME LIMIT CHECK
  // ================================
  useEffect(() => {
    const videoElement = videoRef.current;

    // Skip check if unlimited (-1) or not playing
    if (!videoElement || !isPlaying || watchTimeLimit === -1) {
      console.log("⏭️ Skipping watch limit check:", {
        hasVideo: !!videoElement,
        watchTimeLimit,
        isPlaying,
        isUnlimited: watchTimeLimit === -1,
      });
      return;
    }

    // Skip if watchTimeLimit is invalid
    if (watchTimeLimit <= 0) {
      console.log("⏭️ Invalid watch limit, skipping:", watchTimeLimit);
      return;
    }

    const interval = setInterval(() => {
      const minutesWatched = Math.floor(videoElement.currentTime / 60);

      console.log("⏰ Watch time check:", {
        minutesWatched,
        watchTimeLimit,
        currentPlan,
        willBlock: minutesWatched >= watchTimeLimit,
      });

      // Only check if watchTimeLimit is a positive number
      if (watchTimeLimit > 0 && minutesWatched >= watchTimeLimit) {
        console.log("🛑 Watch limit reached:", {
          minutesWatched,
          watchTimeLimit,
          currentPlan,
        });

        videoElement.pause();
        setIsPlaying(false);
        setWatchTimeExceeded(true);
        setShowUpgradePrompt(true);
        clearInterval(interval);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [watchTimeLimit, isPlaying, currentPlan]);
  // ================================
  // ENHANCED QUALITY CHANGE HANDLER
  // ================================
  const handleQualityChange = async (newQuality: QualityType) => {
    if (!videoRef.current || !video) return;

    console.log("🎬 Changing quality to:", newQuality);
    setIsChangingQuality(true);

    // Save state BEFORE changing
    const savedTime = videoRef.current.currentTime;
    const wasPlaying = !videoRef.current.paused;
    const savedVolume = videoRef.current.volume;

    console.log("💾 Saved state:", {
      time: savedTime,
      playing: wasPlaying,
      volume: savedVolume,
    });

    // Generate new URL with quality parameter
    const newVideoUrl = getVideoUrl(video, newQuality);

    if (!newVideoUrl) {
      console.error(
        "❌ Could not generate video URL with quality:",
        newQuality
      );
      setIsChangingQuality(false);
      return;
    }

    console.log("✅ New quality URL:", newVideoUrl.substring(0, 100));

    // Pause video before changing source
    videoRef.current.pause();

    // Add cache buster to force reload
    const timestamp = Date.now();
    const separator = newVideoUrl.includes("?") ? "&" : "?";
    const finalUrl = `${newVideoUrl}${separator}t=${timestamp}`;

    // Create promise-based state restoration
    const restorePlayback = new Promise<void>((resolve, reject) => {
      if (!videoRef.current) {
        reject(new Error("Video ref lost"));
        return;
      }

      const video = videoRef.current;
      let timeoutId: NodeJS.Timeout;

      const handleLoadedData = () => {
        console.log("✅ Video loaded, restoring playback");

        // Restore time
        video.currentTime = savedTime;
        setCurrentTime(savedTime);

        // Restore volume
        video.volume = savedVolume;

        // Resume playback if it was playing
        if (wasPlaying) {
          video
            .play()
            .then(() => {
              console.log("✅ Playback resumed");
              setIsPlaying(true);
            })
            .catch((err) => {
              console.error("❌ Error resuming playback:", err);
              setIsPlaying(false);
            });
        }

        clearTimeout(timeoutId);
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("error", handleError);
        resolve();
      };

      const handleError = (e: Event) => {
        console.error("❌ Failed to load quality:", newQuality, e);
        clearTimeout(timeoutId);
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("error", handleError);

        // Fallback to 'auto' quality
        if (newQuality !== "auto") {
          console.log("🔄 Falling back to auto quality");
          handleQualityChange("auto");
        }

        reject(new Error("Failed to load video"));
      };

      // Set timeout for loading
      timeoutId = setTimeout(() => {
        console.warn("⚠️ Quality change timeout");
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("error", handleError);
        reject(new Error("Timeout"));
      }, 10000); // 10 second timeout

      video.addEventListener("loadeddata", handleLoadedData, { once: true });
      video.addEventListener("error", handleError, { once: true });
    });

    // Update video source
    videoRef.current.src = finalUrl;
    videoRef.current.load();

    // Update quality state
    setQuality(newQuality);

    try {
      await restorePlayback;
      console.log("✅ Quality changed successfully to:", newQuality);
    } catch (error) {
      console.error("❌ Quality change failed:", error);
    } finally {
      setIsChangingQuality(false);
    }
  };
  // ================================
  // OPTIMIZED VIDEO LOADING WITH DUPLICATE PREVENTION
  // ================================
  useEffect(() => {
    const videoElement = videoRef.current;
    const currentVideoId = video._id;

    // Prevent duplicate loads
    if (
      !videoElement ||
      !currentVideoId ||
      loadedVideoIdRef.current === currentVideoId ||
      isLoadingRef.current
    ) {
      console.log("⏭️ Skipping video load:", {
        hasElement: !!videoElement,
        hasId: !!currentVideoId,
        alreadyLoaded: loadedVideoIdRef.current === currentVideoId,
        isLoading: isLoadingRef.current,
      });
      return;
    }

    console.log("🎬 VIDEO CHANGE DETECTED:", currentVideoId);
    isLoadingRef.current = true;

    // Complete cleanup
    const cleanup = () => {
      if (!videoElement) return;
      videoElement.pause();
      videoElement.removeAttribute("src");
      videoElement.onloadedmetadata = null;
      videoElement.onerror = null;
      videoElement.ontimeupdate = null;
      videoElement.load();
    };

    cleanup();

    // Reset state
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setVideoError(null);
    setBuffered(0);

    // Load new video after brief delay
    const loadTimer = setTimeout(() => {
      // Use the getVideoUrl function with quality parameter
      const properVideoUrl = getVideoUrl(video, quality);

      if (!properVideoUrl) {
        console.error("❌ Could not construct video URL");
        setVideoError("Video file not found or invalid URL");
        isLoadingRef.current = false;
        return;
      }

      // Add cache buster
      const timestamp = Date.now();
      const separator = properVideoUrl.includes("?") ? "&" : "?";
      const videoUrl = `${properVideoUrl}${separator}t=${timestamp}`;

      console.log("📺 Loading video from:", videoUrl);

      // Set source
      videoElement.src = videoUrl;
      loadedVideoIdRef.current = currentVideoId;

      const handleLoadedMetadata = () => {
        console.log("✅ Video metadata loaded");
        setVideoError(null);
        setDuration(videoElement.duration);
        setCurrentTime(0);
        isLoadingRef.current = false;
      };

      const handleError = (e: Event) => {
        console.error("❌ Video load error:", e);
        setVideoError("Failed to load video");
        isLoadingRef.current = false;
        loadedVideoIdRef.current = null;
      };

      const handleTimeUpdate = () => {
        if (!videoElement) return;
        setCurrentTime(videoElement.currentTime);
      };

      videoElement.addEventListener("loadedmetadata", handleLoadedMetadata, {
        once: true,
      });
      videoElement.addEventListener("error", handleError, { once: true });
      videoElement.addEventListener("timeupdate", handleTimeUpdate);

      videoElement.load();
    }, 100);

    return () => {
      console.log("🧹 Cleaning up video player");
      clearTimeout(loadTimer);
      isLoadingRef.current = false;

      if (videoElement) {
        videoElement.removeEventListener("timeupdate", () => {});
      }
    };
  }, [video._id, quality]);
  // ================================
  // AUTO-HIDE CONTROLS (MOBILE & DESKTOP)
  // ================================
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);

    // Auto-hide on BOTH mobile and desktop when playing
    if (isPlaying) {
      const hideDelay = isMobile ? 4000 : 3000;
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, hideDelay);
    }
  };

  useEffect(() => {
    const handleMouseMove = () => {
      resetControlsTimeout();
    };

    const handleTouchStart = () => {
      if (isMobile) {
        resetControlsTimeout();
      }
    };

    const container = containerRef.current;
    if (container) {
      if (!isMobile) {
        container.addEventListener("mousemove", handleMouseMove);
      } else {
        container.addEventListener("touchstart", handleTouchStart);
      }
    }

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("touchstart", handleTouchStart);
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, isMobile]);
  // ================================
  // ENHANCED TIME UPDATE TRACKING
  // ================================
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const newTime = video.currentTime;
      setCurrentTime(newTime);

      // Update buffered progress
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBuffered((bufferedEnd / video.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setVideoError(null);
      setCurrentTime(0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      console.log("▶️ Video playing");
    };

    const handlePause = () => {
      setIsPlaying(false);
      console.log("⏸️ Video paused");
    };

    const handleSeeking = () => {
      console.log("⏩ Seeking to:", video.currentTime);
    };

    const handleSeeked = () => {
      setCurrentTime(video.currentTime);
      console.log("✅ Seeked to:", video.currentTime);
    };

    // Add all event listeners
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("seeked", handleSeeked);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, []);

  // ================================
  // CLEANUP ON UNMOUNT
  // ================================
  useEffect(() => {
    return () => {
      if (tapTimer) clearTimeout(tapTimer);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      loadedVideoIdRef.current = null;
      isLoadingRef.current = false;
    };
  }, [tapTimer]);
  // ================================
  // GESTURE INDICATOR
  // ================================
  const showGestureIndicator = (
    type:
      | "forward"
      | "backward"
      | "pause"
      | "play"
      | "next"
      | "comments"
      | "close"
      | "share",
    position: "left" | "center" | "right"
  ) => {
    setGestureIndicator({ show: true, type, position });
    setTimeout(() => {
      setGestureIndicator(null);
    }, 800);
  };

  // ================================
  // TOGGLE PLAY/PAUSE
  // ================================
  const togglePlayPause = () => {
    if (!videoRef.current) return;

    // Block play if watch time exceeded
    if (watchTimeExceeded) {
      setShowUpgradePrompt(true);
      return;
    }

    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      console.log(
        "▶️ Playing video - Plan:",
        currentPlan,
        "Limit:",
        watchTimeLimit,
        "mins"
      );
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // ================================
  // VOLUME CONTROL
  // ================================
  const handleVolumeChange = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    if (videoRef.current) {
      videoRef.current.volume = clampedVolume;
    }
    if (clampedVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;

    if (isMuted) {
      videoRef.current.muted = false;
      const newVolume = volume === 0 ? 0.5 : volume;
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  // ================================
  // SEEK CONTROL
  // ================================
  const handleSeek = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    handleSeek(newTime);
  };

  // ================================
  // FULLSCREEN CONTROL
  // ================================
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // ================================
  // PICTURE-IN-PICTURE
  // ================================
  const togglePiP = async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        console.log("✅ Exited Picture-in-Picture");
      } else {
        if (!document.pictureInPictureEnabled) {
          console.warn("⚠️ Picture-in-Picture not supported");
          alert("Picture-in-Picture is not supported on this browser");
          return;
        }

        await videoRef.current.requestPictureInPicture();
        console.log("✅ Entered Picture-in-Picture");
      }
    } catch (error: any) {
      console.error("❌ PiP error:", error);

      if (error.name === "NotAllowedError") {
        console.warn("PiP permission denied");
      } else if (error.name === "NotSupportedError") {
        alert("Picture-in-Picture is not supported on this device");
      }
    }
  };

  // ================================
  // SHARE HANDLER
  // ================================
  const handleShareClick = () => {
    if (onShare && videoRef.current) {
      onShare(videoRef.current.currentTime);
    }
  };

  // ================================
  // FORMAT TIME
  // ================================
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ================================
  // GET VOLUME ICON
  // ================================
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX;
    if (volume < 0.5) return Volume1;
    return Volume2;
  };
  // ================================
  // TOUCH GESTURE HANDLERS
  // ================================
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;

    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchStartX(touch.clientX);
    resetControlsTimeout();
    setShowGestureHint(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || touchStartY === null || touchStartX === null) return;

    const touch = e.touches[0];
    const deltaY = touchStartY - touch.clientY;
    const deltaX = touchStartX - touch.clientX;
    const screenWidth = window.innerWidth;
    const isRightSide = touchStartX > screenWidth / 2;

    if (
      isRightSide &&
      Math.abs(deltaY) > Math.abs(deltaX) &&
      Math.abs(deltaY) > 10
    ) {
      // Volume control gesture detected
      const volumeChange = deltaY / 200;
      const newVolume = Math.max(0, Math.min(1, volume + volumeChange));
      handleVolumeChange(newVolume);
      setShowVolumeIndicator(true);
    }

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
      // Seek gesture detected
      setSeeking(true);
      const seekAmount = (deltaX / screenWidth) * duration;
      const newTime = Math.max(0, Math.min(duration, currentTime - seekAmount));
      handleSeek(newTime);
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;

    setTouchStartY(null);
    setTouchStartX(null);
    setSeeking(false);
    setShowVolumeIndicator(false);
  };

  // ================================
  // TAP GESTURE HANDLERS
  // ================================
  const handleSingleTapCenter = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
      showGestureIndicator("play", "center");
    } else {
      videoRef.current.pause();
      showGestureIndicator("pause", "center");
    }
  };

  const handleDoubleTapLeft = () => {
    if (!videoRef.current) return;

    videoRef.current.currentTime = Math.max(
      0,
      videoRef.current.currentTime - 10
    );
    showGestureIndicator("backward", "left");
  };

  const handleDoubleTapRight = () => {
    if (!videoRef.current) return;

    videoRef.current.currentTime = Math.min(
      videoRef.current.duration,
      videoRef.current.currentTime + 10
    );
    showGestureIndicator("forward", "right");
  };

  const handleTripleTapCenter = () => {
    const currentIndex = allVideos.findIndex((v: any) => v._id === video._id);

    if (currentIndex !== -1 && currentIndex < allVideos.length - 1) {
      const nextVideo = allVideos[currentIndex + 1];
      showGestureIndicator("next", "center");
      setTimeout(() => {
        router.push(`/watch/${nextVideo._id}`);
      }, 500);
    }
  };

  const handleTripleTapLeft = () => {
    showGestureIndicator("comments", "left");

    if (onShowComments) {
      onShowComments();
    } else {
      const commentsSection = document.getElementById("comments-section");
      if (commentsSection) {
        commentsSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleTripleTapRight = () => {
    showGestureIndicator("close", "right");
    setTimeout(() => {
      router.push("/");
    }, 500);
  };

  // ================================
  // VIDEO CLICK HANDLER (TAP DETECTION)
  // ================================
  const handleVideoClick = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    if ((e.target as HTMLElement).closest(".video-controls")) {
      return;
    }

    if (isMobile && "touches" in e) {
      return;
    }

    if (!containerRef.current || !videoRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x =
      "touches" in e
        ? e.touches[0].clientX - rect.left
        : (e as React.MouseEvent).clientX - rect.left;
    const width = rect.width;

    let position: "left" | "center" | "right";
    if (x < width / 3) {
      position = "left";
    } else if (x > (width * 2) / 3) {
      position = "right";
    } else {
      position = "center";
    }

    const now = Date.now();
    const timeSinceLastTap = now - lastTap;

    if (timeSinceLastTap > 500) {
      setTapCount(1);
      setLastTap(now);

      if (tapTimer) clearTimeout(tapTimer);

      const timer = setTimeout(() => {
        if (position === "center") {
          handleSingleTapCenter();
        }
        setTapCount(0);
      }, 300);

      setTapTimer(timer);
      return;
    }

    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);
    setLastTap(now);

    if (tapTimer) clearTimeout(tapTimer);

    if (newTapCount === 2) {
      const timer = setTimeout(() => {
        if (position === "left") {
          handleDoubleTapLeft();
        } else if (position === "right") {
          handleDoubleTapRight();
        }
        setTapCount(0);
      }, 300);
      setTapTimer(timer);
    } else if (newTapCount === 3) {
      if (tapTimer) clearTimeout(tapTimer);

      if (position === "center") {
        handleTripleTapCenter();
      } else if (position === "left") {
        handleTripleTapLeft();
      } else if (position === "right") {
        handleTripleTapRight();
      }
      setTapCount(0);
    }
  };

  // ================================
  // VIDEO ERROR HANDLER
  // ================================
  const handleVideoError = (e: any) => {
    console.error("❌ Video playback error:", e);
    const videoElement = videoRef.current;
    if (videoElement?.error) {
      const errorMessages: Record<number, string> = {
        1: "Video loading aborted",
        2: "Network error while loading video",
        3: "Video decoding failed - file may be corrupted",
        4: "Video format not supported",
      };
      const errorMsg =
        errorMessages[videoElement.error.code] || "Unknown video error";
      setVideoError(errorMsg);
      loadedVideoIdRef.current = null;
      isLoadingRef.current = false;
    }
  };

  const VolumeIcon = getVolumeIcon();
  const videoUrl = getVideoUrl(video, quality);
  return (
    <div className="w-full space-y-0">
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black md:rounded-xl overflow-hidden cursor-pointer select-none md:shadow-lg group"
        onClick={handleVideoClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => !isMobile && setShowGestureGuide(true)}
        onMouseLeave={() => !isMobile && setShowGestureGuide(false)}
      >
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              preload="metadata"
              onError={handleVideoError}
              crossOrigin="anonymous"
              playsInline
              key={video._id}
            />

            {/* Mobile Volume Indicator */}
            {isMobile &&
              showVolumeIndicator &&
              touchStartX &&
              touchStartX > window.innerWidth / 2 && (
                <div className="absolute top-1/2 right-8 transform -translate-y-1/2 bg-black/80 p-4 rounded-lg z-40 pointer-events-none">
                  <VolumeIcon className="w-6 h-6 text-white mb-2 mx-auto" />
                  <div className="h-32 w-1 bg-white/30 rounded-full overflow-hidden mx-auto">
                    <div
                      className="w-full bg-white transition-all duration-100"
                      style={{
                        height: `${volume * 100}%`,
                        transform: "translateY(100%)",
                        marginTop: `-${volume * 100}%`,
                      }}
                    />
                  </div>
                  <div className="text-white text-sm mt-2 text-center">
                    {Math.round(volume * 100)}%
                  </div>
                </div>
              )}

            {/* Mobile Seek Indicator */}
            {isMobile && seeking && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 p-4 rounded-lg z-40 pointer-events-none">
                <div className="text-white text-lg font-bold">
                  {formatTime(currentTime)}
                </div>
              </div>
            )}

            {/* Gesture Indicator Overlay */}
            {gestureIndicator?.show && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black bg-opacity-40 z-30">
                <div className="flex flex-col items-center justify-center gap-2 animate-scaleIn">
                  {gestureIndicator.type === "forward" && (
                    <>
                      <div className="bg-white bg-opacity-20 rounded-full p-4 backdrop-blur-sm">
                        <SkipForward className="w-12 h-12 text-white drop-shadow-lg" />
                      </div>
                      <span className="text-white font-bold text-lg drop-shadow-lg">
                        +10s
                      </span>
                    </>
                  )}
                  {gestureIndicator.type === "backward" && (
                    <>
                      <div className="bg-white bg-opacity-20 rounded-full p-4 backdrop-blur-sm">
                        <SkipBack className="w-12 h-12 text-white drop-shadow-lg" />
                      </div>
                      <span className="text-white font-bold text-lg drop-shadow-lg">
                        -10s
                      </span>
                    </>
                  )}
                  {gestureIndicator.type === "pause" && (
                    <div className="bg-white bg-opacity-20 rounded-full p-4 backdrop-blur-sm">
                      <Pause className="w-12 h-12 text-white drop-shadow-lg" />
                    </div>
                  )}
                  {gestureIndicator.type === "play" && (
                    <div className="bg-white bg-opacity-20 rounded-full p-4 backdrop-blur-sm">
                      <Play className="w-12 h-12 text-white drop-shadow-lg" />
                    </div>
                  )}
                  {gestureIndicator.type === "next" && (
                    <>
                      <div className="bg-white bg-opacity-20 rounded-full p-4 backdrop-blur-sm">
                        <SkipForward className="w-12 h-12 text-white drop-shadow-lg" />
                      </div>
                      <span className="text-white font-bold text-lg drop-shadow-lg">
                        Next Video
                      </span>
                    </>
                  )}
                  {gestureIndicator.type === "comments" && (
                    <>
                      <div className="bg-white bg-opacity-20 rounded-full p-4 backdrop-blur-sm">
                        <MessageSquare className="w-12 h-12 text-white drop-shadow-lg" />
                      </div>
                      <span className="text-white font-bold text-lg drop-shadow-lg">
                        Comments
                      </span>
                    </>
                  )}
                  {gestureIndicator.type === "close" && (
                    <>
                      <div className="bg-white bg-opacity-20 rounded-full p-4 backdrop-blur-sm">
                        <X className="w-12 h-12 text-white drop-shadow-lg" />
                      </div>
                      <span className="text-white font-bold text-lg drop-shadow-lg">
                        Going Home
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
            {/* Video Title Overlay */}
            <div
              className={`video-controls absolute top-0 left-0 right-0 px-4 pt-4 transition-opacity duration-300 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent ${
                showControls ? "opacity-100" : "opacity-0"
              }`}
            >
              <h2 className="text-white text-base md:text-lg font-medium drop-shadow-lg line-clamp-2">
                {video.videotitle}
              </h2>
            </div>

            {/* Video Controls */}
            <div
              className={`video-controls absolute bottom-0 left-0 right-0 transition-opacity duration-300 z-20 ${
                showControls || isMobile ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* Progress Bar */}
              <div className="px-2 md:px-4 pb-2">
                <div
                  ref={progressBarRef}
                  className="relative h-1 bg-white/30 rounded-full cursor-pointer group/progress hover:h-1.5 transition-all"
                  onClick={handleProgressClick}
                >
                  <div
                    className="absolute h-full bg-white/50 rounded-full"
                    style={{ width: `${buffered}%` }}
                  />
                  <div
                    className="absolute h-full bg-red-600 rounded-full"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between px-2 md:px-4 pb-3 md:pb-4 bg-gradient-to-t from-black via-black/90 to-transparent pt-3 md:pt-4">
                {/* Left Controls */}
                <div className="flex items-center gap-1 md:gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-10 w-10 touch-manipulation"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                    title="Play/Pause"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </Button>

                  {!isMobile && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 h-9 w-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDoubleTapRight();
                        }}
                      >
                        <SkipForward className="w-5 h-5" />
                      </Button>
                    </>
                  )}

                  {/* Volume Control - Desktop */}
                  {!isMobile && (
                    <div className="flex items-center gap-1 md:gap-2 group/volume">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 h-9 w-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMute();
                        }}
                      >
                        <VolumeIcon className="w-5 h-5" />
                      </Button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleVolumeChange(parseFloat(e.target.value));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-0 group-hover/volume:w-20 transition-all duration-200 accent-red-600 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Volume Control - Mobile */}
                  {isMobile && (
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 h-10 w-10 touch-manipulation"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowVolumeSlider(!showVolumeSlider);
                        }}
                      >
                        <VolumeIcon className="w-5 h-5" />
                      </Button>
                      {showVolumeSlider && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 backdrop-blur-sm rounded-lg p-3 min-w-[40px] z-50 shadow-xl border border-white/10">
                          <div className="flex flex-col items-center gap-2">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={isMuted ? 0 : volume}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleVolumeChange(parseFloat(e.target.value));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-24 accent-red-600 cursor-pointer"
                              style={{
                                writingMode: "vertical-lr" as any,
                                WebkitAppearance: "slider-vertical" as any,
                                width: "8px",
                                transform: "rotate(180deg)",
                              }}
                            />
                            <span className="text-white text-xs">
                              {Math.round(volume * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <span className="text-white text-xs md:text-sm font-medium hidden sm:inline">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                {/* Right Controls */}
                <div className="flex items-center gap-1 md:gap-2">
                  {onShare && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 h-10 w-10 touch-manipulation"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareClick();
                      }}
                      title="Share video"
                    >
                      <Share2 className="w-5 h-5" />
                    </Button>
                  )}
                  <QualitySelector
                    currentQuality={quality}
                    onQualityChange={handleQualityChange}
                    availableQualities={availableQualities}
                    isMobile={isMobile}
                  />

                  {/* Picture-in-Picture - Now visible on mobile */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-10 w-10 touch-manipulation"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePiP();
                    }}
                    title="Picture in Picture"
                  >
                    <PictureInPicture className="w-5 h-5" />
                  </Button>

                  {/* Subtitles - Desktop only */}
                  {!isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 h-9 w-9"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCaptionsEnabled(!captionsEnabled);
                      }}
                      title="Subtitles"
                    >
                      <Subtitles
                        className={`w-5 h-5 ${
                          captionsEnabled ? "text-red-500" : ""
                        }`}
                      />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-10 w-10 touch-manipulation"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFullscreen();
                    }}
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? (
                      <Minimize className="w-5 h-5" />
                    ) : (
                      <Maximize className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            {/* Gesture Guide Overlay - Desktop Only - Show on Hover */}
            {!isMobile && showGestureGuide && showControls && (
              <div className="absolute bottom-20 left-0 right-0 px-6 py-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-none z-[15]">
                <div className="grid grid-cols-3 gap-6 text-white text-[11px] leading-relaxed">
                  <div className="text-left space-y-1">
                    <div className="font-bold text-white text-xs mb-1.5">
                      Left
                    </div>
                    <div className="text-white/80 font-medium">
                      2× tap: -10s
                    </div>
                    <div className="text-white/80 font-medium">
                      3× tap: Comments
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="font-bold text-white text-xs mb-1.5">
                      Center
                    </div>
                    <div className="text-white/80 font-medium">
                      1× tap: Play/Pause
                    </div>
                    <div className="text-white/80 font-medium">
                      3× tap: Next Video
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-bold text-white text-xs mb-1.5">
                      Right
                    </div>
                    <div className="text-white/80 font-medium">
                      2× tap: +10s
                    </div>
                    <div className="text-white/80 font-medium">
                      3× tap: Go Home
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Gesture Hint - Auto-hides after 3s */}
            {isMobile && showGestureHint && showControls && (
              <div className="absolute bottom-20 left-0 right-0 px-4 pointer-events-none z-10 animate-fadeIn">
                <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white text-xs">
                  <div className="flex justify-between items-center gap-4">
                    <span className="flex items-center gap-1">
                      <span className="text-lg">👆</span> Tap to pause
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-lg">↔️</span> Swipe to seek
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-lg">↕️</span> Swipe (right) volume
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* Video Error Overlay */}
            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
                <div className="text-center text-white p-6 max-w-md">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold mb-2">Video Error</p>
                  <p className="text-sm text-gray-300">{videoError}</p>
                  <p className="text-xs mt-3 text-gray-400">
                    Try refreshing the page
                  </p>
                </div>
              </div>
            )}

            {/* Watch Time Limit Modal */}
            {showUpgradePrompt && (
              <div className="absolute inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Watch Time Limit Reached
                    </h3>

                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Your {currentPlan} plan allows{" "}
                      {watchTimeLimit === -1
                        ? "unlimited"
                        : `${watchTimeLimit} minutes`}{" "}
                      per video. Upgrade to continue watching!
                    </p>

                    <div className="space-y-3">
                      <button
                        onClick={() => (window.location.href = "/subscription")}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                      >
                        View Plans
                      </button>

                      <button
                        onClick={() => {
                          setShowUpgradePrompt(false);
                          setWatchTimeExceeded(false);
                          window.location.href = "/";
                        }}
                        className="w-full bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-900 dark:text-white font-medium py-3 px-6 rounded-lg transition-colors"
                      >
                        Go Home
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-sm">Video file not found</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
