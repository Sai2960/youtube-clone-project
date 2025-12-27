// yourtube/src/components/AdaptiveVideoPlayer.tsx
import React, { useState, useRef, useEffect } from "react";
import { Settings, Wifi, WifiOff } from "lucide-react";

interface AdaptiveVideoPlayerProps {
  video: any;
}

// ✅ FIX: Declare Navigator interfaces
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

const AdaptiveVideoPlayer = ({ video }: AdaptiveVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Quality state
  const [currentQuality, setCurrentQuality] = useState<string>("auto");
  const [availableQualities, setAvailableQualities] = useState<any>({});
  const [connectionSpeed, setConnectionSpeed] = useState<string>("unknown");
  const [isBuffering, setIsBuffering] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Device detection
  const [isMobile, setIsMobile] = useState(false);
  const [networkType, setNetworkType] = useState<string>("unknown");

  // ✅ DETECT DEVICE & CONNECTION
  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent || "";
      const mobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent
        );
      setIsMobile(mobile);

      console.log("📱 Device detected:", mobile ? "Mobile" : "Desktop");
    };

    const checkConnection = () => {
      // ✅ FIX: Properly type the connection
      const nav = navigator as NavigatorWithConnection;
      const connection =
        nav.connection || nav.mozConnection || nav.webkitConnection;

      if (connection) {
        const effectiveType = connection.effectiveType; // '4g', '3g', '2g', 'slow-2g'
        const downlink = connection.downlink; // Mbps

        setNetworkType(effectiveType);
        setConnectionSpeed(`${downlink.toFixed(1)} Mbps`);

        console.log("📡 Network:", {
          type: effectiveType,
          speed: downlink,
          saveData: connection.saveData,
        });

        // ✅ AUTO-SELECT QUALITY based on connection
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
        } else {
          setCurrentQuality("auto");
        }
      } else {
        // ✅ Fallback if Network API not available
        console.log("⚠️ Network Information API not available");
        if (isMobile) {
          setCurrentQuality("mobile");
        } else {
          setCurrentQuality("hd");
        }
      }
    };

    checkDevice();
    checkConnection();

    // Listen for connection changes
    const nav = navigator as NavigatorWithConnection;
    const connection =
      nav.connection || nav.mozConnection || nav.webkitConnection;

    if (connection) {
      connection.addEventListener("change", checkConnection);
      return () => connection.removeEventListener("change", checkConnection);
    }
  }, [isMobile]);

  // ✅ EXTRACT QUALITIES from video object
  useEffect(() => {
    if (!video) return;

    const qualities: any = {
      auto: {
        label: "Auto",
        url: video.filepath || video.videofile || video.videoLink,
        description: "Adaptive quality",
      },
    };

    // Add quality levels if they exist
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
          description: "Mobile (Medium)",
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

  // ✅ GET CURRENT VIDEO URL based on quality
  const getCurrentVideoUrl = () => {
    if (currentQuality === "auto") {
      // Auto quality based on connection
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

    // Wait for video to load, then restore position
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = currentTime;
        if (wasPlaying) {
          videoRef.current.play();
        }
      }
    }, 100);

    setShowQualityMenu(false);
    console.log("🎬 Quality changed to:", quality);
  };

  // ✅ HANDLE BUFFERING
  const handleWaiting = () => {
    setIsBuffering(true);
    console.log("⏳ Buffering...");
  };

  const handleCanPlay = () => {
    setIsBuffering(false);
    console.log("▶️ Can play");
  };

  const videoUrl = getCurrentVideoUrl();

  return (
    <div className="relative w-full aspect-video bg-black">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full"
        controls
        playsInline
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-white"></div>
        </div>
      )}

      {/* Connection Speed Indicator */}
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

      {/* Quality Selector */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setShowQualityMenu(!showQualityMenu)}
          className="bg-black/70 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-black/90 transition"
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">
            {availableQualities[currentQuality]?.label || "Quality"}
          </span>
        </button>

        {/* Quality Menu */}
        {showQualityMenu && (
          <div className="absolute right-0 top-full mt-2 bg-black/95 rounded-lg overflow-hidden min-w-[200px] shadow-xl border border-white/10 z-50">
            {Object.entries(availableQualities).map(
              ([key, quality]: [string, any]) => (
                <button
                  key={key}
                  onClick={() => changeQuality(key)}
                  className={`w-full px-4 py-3 text-left hover:bg-white/10 transition flex items-center justify-between ${
                    currentQuality === key ? "bg-white/20" : ""
                  }`}
                >
                  <div>
                    <div className="text-white font-medium text-sm">
                      {quality.label}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {quality.description}
                    </div>
                  </div>
                  {currentQuality === key && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Current Quality Badge */}
      <div className="absolute bottom-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
        {availableQualities[currentQuality]?.label || "Auto"}
      </div>
    </div>
  );
};

export default AdaptiveVideoPlayer;
