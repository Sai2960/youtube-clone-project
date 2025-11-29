/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
} from "lucide-react";
import { useRouter } from "next/router";
import { Button } from "./ui/button";

interface GestureVideoPlayerProps {
  video: {
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [showGestureGuide, setShowGestureGuide] = useState(false);

  // ✅ Track loaded video ID to prevent duplicate loads
  const loadedVideoIdRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [buffered, setBuffered] = useState(0);
  const [quality, setQuality] = useState<"auto" | "1080p" | "720p" | "480p">(
    "auto"
  );
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Gesture state
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

  // Mobile gesture state
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [seeking, setSeeking] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [showGestureHint, setShowGestureHint] = useState(true);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Hide gesture hint after 3 seconds
  useEffect(() => {
    if (isMobile && showGestureHint) {
      const timer = setTimeout(() => {
        setShowGestureHint(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isMobile, showGestureHint]);

  // Get video filename
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

  // 🔥 CRITICAL FIX: Optimized video loading with duplicate prevention
  useEffect(() => {
    const videoElement = videoRef.current;
    const currentVideoId = video._id;

    // ✅ Prevent duplicate loads
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
      const filename = getVideoFilename();

      if (!filename) {
        setVideoError("Video file not found");
        isLoadingRef.current = false;
        return;
      }

      // Generate URL with cache buster
      const timestamp = Date.now();
      const baseUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/videos/${filename}`;
      const videoUrl = `${baseUrl}?t=${timestamp}`;

      console.log("📺 Loading video:", videoUrl);

      // Set source
      videoElement.src = videoUrl;
      loadedVideoIdRef.current = currentVideoId; // ✅ Mark as loaded

      const handleLoadedMetadata = () => {
        console.log("✅ Video metadata loaded");
        setVideoError(null);
        setDuration(videoElement.duration);
        isLoadingRef.current = false;
      };

      const handleError = (e: Event) => {
        console.error("❌ Video load error:", e);
        setVideoError("Failed to load video");
        isLoadingRef.current = false;
        loadedVideoIdRef.current = null; // Reset on error
      };

      videoElement.addEventListener("loadedmetadata", handleLoadedMetadata, {
        once: true,
      });
      videoElement.addEventListener("error", handleError, { once: true });
      videoElement.load();
    }, 100);

    return () => {
      console.log("🧹 Cleaning up video player");
      clearTimeout(loadTimer);
      isLoadingRef.current = false;
    };
  }, [video._id]); // ✅ ONLY video._id dependency

  // Auto-hide controls
  // ✅ REPLACE THIS SECTION (around line 145-165)
  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);

    // ✅ FIX: Auto-hide on BOTH mobile and desktop when playing
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000); // Hide after 3 seconds
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

  // Video time update
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBuffered((bufferedEnd / video.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setVideoError(null);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tapTimer) clearTimeout(tapTimer);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      loadedVideoIdRef.current = null;
      isLoadingRef.current = false;
    };
  }, [tapTimer]);

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

  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

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

  const togglePiP = async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error("PiP error:", error);
    }
  };

  const handleShareClick = () => {
    if (onShare && videoRef.current) {
      onShare(videoRef.current.currentTime);
    }
  };

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

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return VolumeX;
    if (volume < 0.5) return Volume1;
    return Volume2;
  };

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
      e.preventDefault();
      const volumeChange = deltaY / 200;
      const newVolume = Math.max(0, Math.min(1, volume + volumeChange));
      handleVolumeChange(newVolume);
      setShowVolumeIndicator(true);
    }

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 20) {
      e.preventDefault();
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

  // Generate video URL
  const getVideoUrl = () => {
    const filename = getVideoFilename();
    if (!filename) return null;

    const timestamp = Date.now();
    const baseUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/uploads/videos/${filename}`;
    return `${baseUrl}?t=${timestamp}`;
  };

  const videoUrl = getVideoUrl();

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
              className={`video-controls absolute bottom-0 left-0 right-0 transition-opacity duration-300 z-20 ${
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
                    className="text-white hover:bg-white/20 h-8 w-8 md:h-9 md:w-9"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 md:w-5 md:h-5" />
                    ) : (
                      <Play className="w-4 h-4 md:w-5 md:h-5" />
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
                        className="text-white hover:bg-white/20 h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowVolumeSlider(!showVolumeSlider);
                        }}
                      >
                        <VolumeIcon className="w-4 h-4" />
                      </Button>
                      {showVolumeSlider && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 backdrop-blur-sm rounded-lg p-3 min-w-[40px]">
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
                      className="text-white hover:bg-white/20 h-8 w-8 md:h-9 md:w-9"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareClick();
                      }}
                      title="Share video"
                    >
                      <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                    </Button>
                  )}

                  {!isMobile && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 h-9 w-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCaptionsEnabled(!captionsEnabled);
                        }}
                      >
                        <Subtitles
                          className={`w-5 h-5 ${
                            captionsEnabled ? "text-red-500" : ""
                          }`}
                        />
                      </Button>

                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20 h-9 w-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowQualityMenu(!showQualityMenu);
                          }}
                        >
                          <Settings className="w-5 h-5" />
                        </Button>
                        {showQualityMenu && (
                          <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg p-2 min-w-32">
                            {(["auto", "1080p", "720p", "480p"] as const).map(
                              (q) => (
                                <button
                                  key={q}
                                  className={`w-full text-left px-3 py-2 text-sm text-white hover:bg-white/20 rounded ${
                                    quality === q ? "bg-white/10" : ""
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuality(q);
                                    setShowQualityMenu(false);
                                  }}
                                >
                                  {q === "auto" ? "Auto" : q}
                                  {quality === q && " ✓"}
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 h-9 w-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePiP();
                        }}
                      >
                        <PictureInPicture className="w-5 h-5" />
                      </Button>
                    </>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-8 w-8 md:h-9 md:w-9"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFullscreen();
                    }}
                  >
                    {isFullscreen ? (
                      <Minimize className="w-4 h-4 md:w-5 md:h-5" />
                    ) : (
                      <Maximize className="w-4 h-4 md:w-5 md:h-5" />
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
        <div className="font-bold text-white text-xs mb-1.5">Left</div>
        <div className="text-white/80 font-medium">2× tap: -10s</div>
        <div className="text-white/80 font-medium">3× tap: Comments</div>
      </div>
      <div className="text-center space-y-1">
        <div className="font-bold text-white text-xs mb-1.5">Center</div>
        <div className="text-white/80 font-medium">1× tap: Play/Pause</div>
        <div className="text-white/80 font-medium">3× tap: Next Video</div>
      </div>
      <div className="text-right space-y-1">
        <div className="font-bold text-white text-xs mb-1.5">Right</div>
        <div className="text-white/80 font-medium">2× tap: +10s</div>
        <div className="text-white/80 font-medium">3× tap: Go Home</div>
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
