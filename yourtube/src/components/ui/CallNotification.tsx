/* eslint-disable react-hooks/exhaustive-deps */
// components/ui/CallNotification.tsx - PREMIUM ENHANCED VERSION
import React, { useEffect, useState, useRef } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useRouter } from "next/router";
import { getSocket, isSocketConnected, initializeSocket } from "@/lib/socket";
import { useUser } from "@/lib/AuthContext";
import {
  onIncomingCall,
  getIncomingCall,
  clearIncomingCall,
  IncomingCallData,
} from "@/lib/crossTabCall";
import axiosInstance from "@/lib/axiosinstance";
import { normalizeAvatarUrl, DEFAULT_AVATAR_SVG } from "@/lib/imageUtils";

const CallNotification: React.FC = () => {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(
    null,
  );
  const [isRinging, setIsRinging] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR_SVG);
  const router = useRouter();
  const { user } = useUser();
  const socketListenersSetupRef = useRef(false);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Process avatar URL when incoming call changes
  useEffect(() => {
    if (incomingCall?.image) {
      const processedUrl = normalizeAvatarUrl(incomingCall.image);
      setAvatarUrl(processedUrl);
      console.log("📸 Avatar URL processed:", processedUrl);
    } else {
      setAvatarUrl(DEFAULT_AVATAR_SVG);
    }
  }, [incomingCall?.image]);

  useEffect(() => {
    if (!user?._id) {
      console.log("⚠️ No user, skipping call notification setup");
      return;
    }

    console.log("📞 Setting up call notifications for user:", user._id);

    // ✅ CRITICAL FIX: Initialize socket FIRST, then setup listeners
    const initializeAndSetup = async () => {
      try {
        // Step 1: Initialize socket
        console.log("🔌 Initializing socket...");
        const socket = initializeSocket(user._id);

        // Step 2: Wait for it to actually connect
        let connected = false;
        let attempts = 0;
        const maxAttempts = 40; // 20 seconds total (500ms * 40)

        while (!connected && attempts < maxAttempts) {
          if (socket.connected) {
            connected = true;
            console.log("✅ Socket connected successfully");
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
          if (attempts % 4 === 0) {
            console.log(`⏳ Waiting for socket... ${attempts * 0.5}s`);
          }
        }

        if (!connected) {
          console.error("❌ Socket failed to connect after 20 seconds");
          return;
        }

        // Step 3: NOW setup the event listeners
        console.log("📝 Setting up event listeners...");

        const handleIncomingCall = (data: IncomingCallData) => {
          console.log("\n📞 ===== INCOMING CALL =====");
          console.log("   From:", data.name);
          console.log("   User ID:", data.from);
          console.log("   Room:", data.roomId);
          console.log("   Call ID:", data.callId);
          console.log("===========================\n");

          setIncomingCall(data);
          setIsRinging(true);
          playRingtone();
        };

        const handleCallRejected = () => {
          console.log("❌ Call rejected by remote peer");
          setIncomingCall(null);
          setIsRinging(false);
          stopRingtone();
        };

        const handleCallEnded = () => {
          console.log("📴 Call ended by remote peer");
          setIncomingCall(null);
          setIsRinging(false);
          stopRingtone();
        };

        socket.on("incoming-call", handleIncomingCall);
        socket.on("call-rejected", handleCallRejected);
        socket.on("call-ended", handleCallEnded);

        socketListenersSetupRef.current = true;
        console.log("✅ Call notification listeners registered successfully");

        // Cleanup function
        return () => {
          console.log("🧹 Cleaning up socket listeners");
          socket.off("incoming-call", handleIncomingCall);
          socket.off("call-rejected", handleCallRejected);
          socket.off("call-ended", handleCallEnded);
          socketListenersSetupRef.current = false;
        };
      } catch (error) {
        console.error("❌ Error in socket initialization:", error);
      }
    };

    // Setup cross-tab listener
    const unsubscribeCrossTab = onIncomingCall((callData) => {
      console.log("📞 Incoming call from another tab:", callData.name);
      setIncomingCall(callData);
      setIsRinging(true);
      playRingtone();
    });

    // Check for existing call
    const existingCall = getIncomingCall();
    if (existingCall) {
      console.log("📞 Found existing call in storage:", existingCall.name);
      setIncomingCall(existingCall);
      setIsRinging(true);
      playRingtone();
    }

    // Start the initialization
    const cleanupPromise = initializeAndSetup();

    return () => {
      console.log("🧹 Cleaning up call notification component");
      unsubscribeCrossTab();
      stopRingtone();
      socketListenersSetupRef.current = false;
      cleanupPromise?.then((cleanup) => cleanup && cleanup());
    };
  }, [user?._id]);

  useEffect(() => {
    if (!isRinging) {
      stopRingtone();
    }
  }, [isRinging]);

  const playRingtone = () => {
    if (typeof window === "undefined") return;

    stopRingtone();

    try {
      console.log("🔔 Incoming call - notification shown");
      // Don't play audio until user interacts with Accept button
      // This prevents browser autoplay blocking
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  };

  const stopRingtone = () => {
    console.log("🔕 Stopping notification sound");

    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }

    // ✅ No AudioContext to close anymore
    setIsRinging(false);
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    try {
      console.log("\n✅ ===== ACCEPTING CALL =====");

      // ✅ NOW it's safe to play audio (user clicked Accept button)
      try {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjKM0fPTgjMGHm7A7+OZSA0PVqnn7K1aGAg+ltryxnMpBSh+zPLaizsIGGS56+mjUBELTqPh8bllHAU2jdXzzn0vBSZ8yvLekD0JGGm+7OagUBELTKLi8bllHAU2jtXzzn0vBSaAy/Lakj8KFmq/7OSiTxEMUqXm7a5aGAhBmN7xwXEoBjGP0/PMezEGIXS/8NygSQ0QV6vn66hVFApGnt/yvmwhBjKM0fPTgjMGHm/A7+OZSA0PVqjn7K1aGAg+ltryxnMpBSh+zPLaizsIGGS56+mjUBELTqLh8bllHAU2jdXzzn0vBSZ8yvLekD0JGGm+7OagUBELTKLi8bllHAU2jtXzzn0vBSaAy/Lakj8KFmrA7OSiTxEMUqXm7a5aGAhBmN7xwXEoBjGP0/PMezEGIXS+8NygSQ0QV6vn66hVFApGnt/yvmwhBjKM0fPTgjMGHm/A7+OZSA0PVqjn7K1aGAg+ltryxnMpBSh+zPLaizsIGGS56+mjUBELTqLh8bllHAU2jdXzzn0vBSZ8yvLekD0JGGm+7OagUBELTKLi8bllHAU2jtXzzn0vBSaAy/Lakj8KFmrA7OSiTxEMUqXm7a5aGAhBmN7xwXEoBjGP0/PMezEGIXS+8NygSQ0QV6vn66hVFApGnt/yvmwhBjKM0fPTgjMGHm/A7+OZSA0PVqjn7K1aGAg+ltryxnMpBSh+zPLaizsIGGS56+mjUBELTqLh8bllHAU2jdXzzn0vBSZ8yvLekD0JGGm+7OagUBELTKLi8bllHAU2jtXzzn0vBSaAy/Lakj8KFmrA7OSiTxEMUqXm7a5aGAhBmN7xwXEoBjGP0/PMezEGIXS+8NygSQ0Q",
        );
        audio.volume = 0.3;
        audio.play(); // This will work because user just clicked
      } catch (e) {
        // Silent fail is OK
      }

      stopRingtone();

      if (isSocketConnected()) {
        try {
          const socket = getSocket();
          socket.emit("accept-call", incomingCall.roomId);
          console.log("✅ Accept notification sent via socket");
        } catch (error) {
          console.log("⚠️ Socket not available, but proceeding with call");
        }
      }

      try {
        await axiosInstance.put(`/call/${incomingCall.callId}/status`, {
          status: "ongoing",
          startTime: new Date(),
        });
        console.log("✅ Call status updated to ongoing");
      } catch (err) {
        console.error("❌ Failed to update call status:", err);
      }

      clearIncomingCall();
      setIncomingCall(null);

      console.log("📞 Navigating to call page...");
      console.log("===== CALL ACCEPTED =====\n");

      router.push({
        pathname: `/call/${incomingCall.roomId}`,
        query: {
          callId: incomingCall.callId,
          remoteName: incomingCall.name,
          initiator: "false",
        },
      });
    } catch (error) {
      console.error("❌ Error accepting call:", error);
      alert("Failed to accept call. Please try again.");
      setIncomingCall(null);
      stopRingtone();
    }
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;

    try {
      console.log("\n❌ ===== REJECTING CALL =====");
      console.log("   Call ID:", incomingCall.callId);
      console.log("   Room ID:", incomingCall.roomId);
      console.log("   From:", incomingCall.name);

      stopRingtone();

      if (isSocketConnected()) {
        try {
          const socket = getSocket();
          socket.emit("reject-call", incomingCall.roomId);
          console.log("✅ Reject notification sent via socket");
        } catch (error) {
          console.log("⚠️ Socket not available");
        }
      }

      try {
        await axiosInstance.put(`/call/${incomingCall.callId}/status`, {
          status: "rejected",
          endTime: new Date(),
        });
        console.log("✅ Call status updated to rejected");
      } catch (err) {
        console.error("❌ Failed to update call status:", err);
      }

      clearIncomingCall();
      setIncomingCall(null);

      console.log("===== CALL REJECTED =====\n");
    } catch (error) {
      console.error("❌ Error rejecting call:", error);
      setIncomingCall(null);
      stopRingtone();
    }
  };

  if (!incomingCall) return null;

  return (
    <>
      {/* Premium CSS Styles */}
      <style jsx global>{`
        @keyframes premium-fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes premium-slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes premium-ring-pulse {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.4;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }

        @keyframes premium-ring-pulse-outer {
          0% {
            transform: scale(1);
            opacity: 0.5;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes premium-avatar-glow {
          0%,
          100% {
            box-shadow:
              0 0 20px rgba(34, 197, 94, 0.3),
              0 0 40px rgba(34, 197, 94, 0.1);
          }
          50% {
            box-shadow:
              0 0 30px rgba(34, 197, 94, 0.5),
              0 0 60px rgba(34, 197, 94, 0.2);
          }
        }

        @keyframes premium-dot-bounce {
          0%,
          80%,
          100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-8px);
          }
        }

        @keyframes premium-button-pulse {
          0%,
          100% {
            box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4);
          }
          50% {
            box-shadow:
              0 4px 30px rgba(34, 197, 94, 0.6),
              0 0 50px rgba(34, 197, 94, 0.3);
          }
        }

        @keyframes premium-reject-pulse {
          0%,
          100% {
            box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3);
          }
          50% {
            box-shadow: 0 4px 25px rgba(239, 68, 68, 0.5);
          }
        }

        .premium-call-overlay {
          animation: premium-fadeIn 0.3s ease-out;
        }

        .premium-call-card {
          animation: premium-slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .premium-ring-1 {
          animation: premium-ring-pulse 2s ease-out infinite;
        }

        .premium-ring-2 {
          animation: premium-ring-pulse-outer 2s ease-out infinite 0.3s;
        }

        .premium-avatar-container {
          animation: premium-avatar-glow 2s ease-in-out infinite;
        }

        .premium-dot {
          animation: premium-dot-bounce 1.4s ease-in-out infinite;
        }

        .premium-dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .premium-dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        .premium-accept-btn {
          animation: premium-button-pulse 2s ease-in-out infinite;
        }

        .premium-reject-btn {
          animation: premium-reject-pulse 2s ease-in-out infinite;
        }
      `}</style>

      {/* Main Overlay */}
      <div className="premium-call-overlay fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 dark:bg-black/80 backdrop-blur-md">
        {/* Card Container */}
        <div className="premium-call-card relative w-full max-w-sm mx-auto">
          {/* Glass Card */}
          <div className="relative overflow-hidden rounded-3xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200/50 dark:border-neutral-700/50 shadow-2xl">
            {/* Subtle Top Gradient Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />

            {/* Content */}
            <div className="px-8 pt-10 pb-8">
              {/* Avatar Section */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {/* Animated Rings */}
                  <div className="absolute inset-0 -m-3 rounded-full border-2 border-emerald-500/30 dark:border-emerald-400/30 premium-ring-1" />
                  <div className="absolute inset-0 -m-6 rounded-full border border-emerald-500/20 dark:border-emerald-400/20 premium-ring-2" />

                  {/* Avatar */}
                  <div className="premium-avatar-container relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-[3px] border-emerald-500 dark:border-emerald-400">
                    <img
                      src={avatarUrl}
                      alt={incomingCall.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error(
                          "❌ Avatar failed to load, using fallback",
                        );
                        e.currentTarget.src = DEFAULT_AVATAR_SVG;
                      }}
                    />
                  </div>

                  {/* Video Badge */}
                  <div className="absolute -bottom-1 -right-1 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500 dark:bg-emerald-500 flex items-center justify-center shadow-lg border-2 border-white dark:border-neutral-900">
                    <Video className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>
              </div>

              {/* Caller Info */}
              <div className="text-center mb-8">
                <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-white mb-2 truncate px-2">
                  {incomingCall.name}
                </h2>

                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    Incoming video call
                  </span>
                </div>

                {/* Animated Dots */}
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <div className="premium-dot w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  <div className="premium-dot w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  <div className="premium-dot w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-6">
                {/* Reject Button */}
                <button
                  onClick={handleRejectCall}
                  className="premium-reject-btn group relative flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 active:scale-95"
                  title="Reject Call"
                  aria-label="Reject incoming call"
                >
                  <PhoneOff className="w-7 h-7 sm:w-8 sm:h-8 text-white transform rotate-[135deg]" />
                </button>

                {/* Accept Button */}
                <button
                  onClick={handleAcceptCall}
                  className="premium-accept-btn group relative flex items-center justify-center w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 active:scale-95"
                  title="Accept Call"
                  aria-label="Accept incoming call"
                >
                  <Phone className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
                </button>
              </div>

              {/* Subtle Hint */}
              <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 mt-6">
                Tap to answer
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CallNotification;
