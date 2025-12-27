/* eslint-disable react-hooks/exhaustive-deps */
// yourtube/src/components/EnhancedGestureVideoPlayer.tsx
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
  Wifi,
  WifiOff,
} from "lucide-react";
import { getVideoUrl } from "@/lib/urlHelper";

interface EnhancedGestureVideoPlayerProps {
  video: any;
  allVideos?: any[];
  onShowComments?: () => void;
  onShare?: (currentTime?: number) => void;
}

// ✅ Navigator types for Network API
interface NavigatorConnection {
  effectiveType: string;
  downlink: number;
  saveData: boolean;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NavigatorConnection;
  mozConnection?: NavigatorConnection;
  webkitConnection?: NavigatorConnection;
}

const EnhancedGestureVideoPlayer = ({
  video,
  allVideos = [],
  onShowComments,
  onShare,
}: EnhancedGestureVideoPlayerProps) => {
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
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // ✅ NEW: Quality & Network state
  const [currentQuality, setCurrentQuality] = useState<string>("auto");
  const [availableQualities, setAvailableQualities] = useState<any>({});
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [networkType, setNetworkType] = useState<string>("unknown");
  const [connectionSpeed, setConnectionSpeed] = useState<string>("unknown");
  const [isMobile, setIsMobile] = useState(false);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // ✅ DETECT DEVICE & CONNECTION
  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent || "";
      const mobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent
        );
      setIsMobile(mobile);
    };

    const checkConnection = () => {
      const nav = navigator as NavigatorWithConnection;
      const connection =
        nav.connection || nav.mozConnection || nav.webkitConnection;

      if (connection) {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink;

        setNetworkType(effectiveType);
        setConnectionSpeed(`${downlink.toFixed(1)} Mbps`);

        // Auto-select quality
        if (
          connection.saveData ||
          effectiveType === "slow-2g" ||
          effectiveType === "2g"
        ) {
          setCurrentQuality("mobile_low");
        } else if (effectiveType === "3g") {
          setCurrentQuality("mobile");
        } else if (effectiveType === "4g" && isMobile) {
          setCurrentQuality("sd");
        } else if (effectiveType === "4g" && !isMobile) {
          setCurrentQuality("hd");
        }
      } else {
        // Fallback
        if (isMobile) {
          setCurrentQuality("mobile");
        } else {
          setCurrentQuality("hd");
        }
      }
    };

    checkDevice();
    checkConnection();

    const nav = navigator as NavigatorWithConnection;
    const connection =
      nav.connection || nav.mozConnection || nav.webkitConnection;

    if (connection) {
      connection.addEventListener("change", checkConnection);
      return () => connection.removeEventListener("change", checkConnection);
    }
  }, [isMobile]);

  // ✅ EXTRACT QUALITIES from video
  useEffect(() => {
    if (!video) return;

    const qualities: any = {
      auto: {
        label: "Auto",
        url: getVideoUrl(video) || video.filepath,
        description: "Adaptive quality",
      },
    };

    if (video.qualities) {
      if (video.qualities.mobile_low) {
        qualities.mobile_low = {
          label: "360p",
          url: video.qualities.mobile_low,
          description: "Mobile (Low)",
        };
      }
      if (video.qualities.mobile) {
        qualities.mobile = {
          label: "480p",
          url: video.qualities.mobile,
          description: "Mobile",
        };
      }
      if (video.qualities.sd) {
        qualities.sd = {
          label: "720p",
          url: video.qualities.sd,
          description: "HD",
        };
      }
      if (video.qualities.hd) {
        qualities.hd = {
          label: "1080p",
          url: video.qualities.hd,
          description: "Full HD",
        };
      }
    }

    setAvailableQualities(qualities);
    console.log("🎬 Available qualities:", Object.keys(qualities));
  }, [video]);

  // ✅ GET CURRENT VIDEO URL
  const getCurrentVideoUrl = () => {
    if (currentQuality === "auto") {
      if (networkType === "slow-2g" || networkType === "2g") {
        return availableQualities.mobile_low?.url || video.filepath;
      } else if (networkType === "3g") {
        return availableQualities.mobile?.url || video.filepath;
      } else if (networkType === "4g" && isMobile) {
        return availableQualities.sd?.url || video.filepath;
      } else {
        return (
          availableQualities.hd?.url ||
          availableQualities.sd?.url ||
          video.filepath
        );
      }
    }

    return availableQualities[currentQuality]?.url || video.filepath;
  };

  // ✅ CHANGE QUALITY
  const changeQuality = (quality: string) => {
    if (!videoRef.current) return;

    const currentTime = videoRef.current.currentTime;
    const wasPlaying = !videoRef.current.paused;

    setCurrentQuality(quality);

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = currentTime;
        if (wasPlaying) {
          videoRef.current.play();
        }
      }
    }, 100);

    setShowQualityMenu(false);
    setShowSettings(false);
    console.log("🎬 Quality changed to:", quality);
  };

  // Auto-hide controls
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

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, []);

  // Basic controls
  const togglePlay = () => {
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

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;

    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

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

  const videoUrl = getCurrentVideoUrl();

  return (
    <div
      ref={containerRef}
      className="relative bg-black group aspect-video"
      onMouseMove={resetHideTimer}
      onMouseLeave={() => {
        if (isPlaying) setControlsVisible(false);
      }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest("button") && !target.closest(".controls-area")) {
          togglePlay();
        }
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onEnded={() => setIsPlaying(false)}
        playsInline
        preload="metadata"
      />

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <Loader2 className="w-16 h-16 text-white animate-spin" />
        </div>
      )}

      {/* Center Play Button */}
      {!isPlaying && !isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="w-20 h-20 flex items-center justify-center bg-red-600 hover:bg-red-700 rounded-full transition shadow-2xl"
          >
            <Play className="w-10 h-10 text-white ml-1" fill="white" />
          </button>
        </div>
      )}

      {/* Top Gradient with Network Info */}
      <div
        className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Network Speed Indicator */}
        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
          {networkType === "4g" ? (
            <Wifi className="w-3 h-3 text-green-400" />
          ) : (
            <WifiOff className="w-3 h-3 text-yellow-400" />
          )}
          <span>
            {networkType.toUpperCase()} • {connectionSpeed}
          </span>
        </div>

        {/* Current Quality Badge */}
        <div className="absolute top-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
          {availableQualities[currentQuality]?.label || "Auto"}
        </div>
      </div>

      {/* Bottom Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ zIndex: 40 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar */}
        <div
          ref={progressBarRef}
          className="relative h-2 bg-white/30 cursor-pointer group/progress hover:h-3 transition-all"
          onClick={handleProgressClick}
        >
          <div
            className="absolute top-0 left-0 h-full bg-red-600 transition-all"
            style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
          />
        </div>

        {/* Controls Area */}
        <div className="controls-area bg-gradient-to-t from-black via-black/95 to-transparent px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left Controls */}
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={togglePlay}
                className="text-white hover:bg-white/20 p-2 rounded-full transition"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" fill="white" />
                ) : (
                  <Play className="w-6 h-6" fill="white" />
                )}
              </button>

              <button
                onClick={() => skip(-10)}
                className="text-white hover:bg-white/20 p-2 rounded-full transition hidden md:block"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={() => skip(10)}
                className="text-white hover:bg-white/20 p-2 rounded-full transition hidden md:block"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              <button
                onClick={toggleMute}
                className="text-white hover:bg-white/20 p-2 rounded-full transition"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <div className="text-white text-sm font-medium tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Settings with Quality Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition"
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
                      {!showQualityMenu ? (
                        <>
                          <button
                            onClick={() => setShowQualityMenu(true)}
                            className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition flex items-center justify-between text-sm"
                          >
                            <span>Quality</span>
                            <div className="flex items-center gap-2 text-gray-400">
                              <span>
                                {availableQualities[currentQuality]?.label ||
                                  "Auto"}
                              </span>
                              <ChevronDown className="w-4 h-4 -rotate-90" />
                            </div>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowQualityMenu(false)}
                            className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition flex items-center gap-2 text-sm border-b border-white/10"
                          >
                            <ChevronDown className="w-4 h-4 rotate-90" />
                            <span>Quality</span>
                          </button>
                          {Object.entries(availableQualities).map(
                            ([key, quality]: [string, any]) => (
                              <button
                                key={key}
                                onClick={() => changeQuality(key)}
                                className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition flex items-center justify-between text-sm"
                              >
                                <div>
                                  <div className="font-medium">
                                    {quality.label}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {quality.description}
                                  </div>
                                </div>
                                {currentQuality === key && (
                                  <Check className="w-4 h-4 text-blue-500" />
                                )}
                              </button>
                            )
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20 p-2 rounded-full transition"
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
    </div>
  );
};

export default EnhancedGestureVideoPlayer;
