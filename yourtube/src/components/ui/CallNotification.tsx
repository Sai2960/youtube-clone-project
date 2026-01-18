/* eslint-disable react-hooks/exhaustive-deps */
// components/ui/CallNotification.tsx - COMPLETE FIXED VERSION
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
      {/* Premium Background with Animated Gradient */}
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 animate-gradient-shift">
        {/* Animated Background Orbs */}
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-float-reverse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      {/* Glass Card Container */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 backdrop-blur-xl">
        <div className="relative max-w-md w-full animate-scale-fade-in">
          {/* Glow Effect Behind Card */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/50 via-blue-600/50 to-indigo-600/50 rounded-[32px] blur-2xl opacity-60 animate-pulse-glow"></div>

          {/* Main Premium Card */}
          <div className="relative bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-slate-700/50 overflow-hidden">
            {/* Top Accent Bar */}
            <div className="h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 animate-shimmer"></div>

            {/* Content Container */}
            <div className="p-8 sm:p-10">
              {/* Caller Profile Section */}
              <div className="flex flex-col items-center mb-8">
                {/* Profile Picture with Luxury Ring Animation */}
                <div className="relative mb-6">
                  {/* Outer Rotating Ring */}
                  <div className="absolute inset-0 rounded-full">
                    <div className="w-full h-full rounded-full border-2 border-transparent bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 animate-spin-slow opacity-60"></div>
                  </div>

                  {/* Middle Pulsing Ring */}
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-purple-500/30 via-blue-500/30 to-indigo-500/30 animate-pulse-ring blur-sm"></div>

                  {/* Profile Picture Container */}
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                    {/* Inner Glow */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600/40 to-blue-600/40 blur-xl"></div>

                    {/* Actual Image */}
                    <img
                      src={avatarUrl}
                      alt={incomingCall.name}
                      className="relative w-full h-full rounded-full border-4 border-slate-800 object-cover shadow-2xl ring-2 ring-purple-500/50"
                      onError={(e) => {
                        console.error(
                          "❌ Avatar failed to load, using fallback",
                        );
                        e.currentTarget.src = DEFAULT_AVATAR_SVG;
                      }}
                    />

                    {/* Video Call Badge with Glow */}
                    <div className="absolute -bottom-2 -right-2">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-lg animate-pulse"></div>
                      <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 p-3 sm:p-4 rounded-full shadow-xl border-2 border-green-400/50">
                        <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-lg" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Caller Name with Premium Typography */}
                <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent mb-3 text-center break-words max-w-full px-4 tracking-tight">
                  {incomingCall.name}
                </h2>

                {/* Status Badge */}
                <div className="flex items-center gap-2 bg-gradient-to-r from-purple-900/50 to-blue-900/50 px-4 py-2 rounded-full border border-purple-500/30 backdrop-blur-sm mb-2">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 shadow-lg shadow-green-500/50"></span>
                  </div>
                  <p className="text-purple-200 text-sm sm:text-base font-medium">
                    Incoming Video Call
                  </p>
                </div>

                {/* Room ID - Minimalist */}
                <p className="text-slate-500 text-xs mt-2 font-mono">
                  ID: {incomingCall.roomId?.substring(0, 8).toUpperCase()}
                </p>
              </div>

              {/* Premium Action Buttons */}
              <div className="flex items-center justify-center gap-8 sm:gap-12 mb-8">
                {/* Reject Button - Luxury Red */}
                <button
                  onClick={handleRejectCall}
                  className="group relative"
                  title="Decline Call"
                  aria-label="Decline incoming call"
                >
                  {/* Button Glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-rose-600 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>

                  {/* Button */}
                  <div className="relative bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 p-6 sm:p-7 rounded-full transition-all transform active:scale-95 shadow-2xl border-2 border-red-400/30 group-hover:shadow-red-500/50 group-hover:scale-110">
                    <PhoneOff className="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow-lg" />
                  </div>

                  {/* Button Label */}
                  <p className="text-xs text-red-300 mt-3 font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                    Decline
                  </p>
                </button>

                {/* Accept Button - Luxury Green */}
                <button
                  onClick={handleAcceptCall}
                  className="group relative"
                  title="Accept Call"
                  aria-label="Accept incoming call"
                >
                  {/* Button Glow - More Prominent */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-2xl opacity-60 group-hover:opacity-90 transition-opacity animate-pulse-glow"></div>

                  {/* Button - Larger for Primary Action */}
                  <div className="relative bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 p-7 sm:p-8 rounded-full transition-all transform active:scale-95 shadow-2xl border-2 border-green-400/50 group-hover:shadow-green-500/50 group-hover:scale-110 animate-pulse-subtle">
                    <Phone className="w-9 h-9 sm:w-10 sm:h-10 text-white drop-shadow-lg" />
                  </div>

                  {/* Button Label */}
                  <p className="text-xs text-green-300 mt-3 font-medium opacity-0 group-hover:opacity-100 transition-opacity absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                    Accept
                  </p>
                </button>
              </div>

              {/* Animated Indicator Dots */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="flex gap-2">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-bounce-smooth shadow-lg shadow-purple-500/50"
                      style={{ animationDelay: `${delay}s` }}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Bottom Instructions */}
              <div className="text-center pt-4 border-t border-slate-700/50">
                <p className="text-slate-400 text-xs sm:text-sm font-medium">
                  Tap{" "}
                  <span className="text-green-400 font-semibold">Accept</span>{" "}
                  to start the video call
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Premium Animations to Global Styles */}
      <style jsx global>{`
        @keyframes gradient-shift {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes float-slow {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -30px) scale(1.1);
          }
        }

        @keyframes float-reverse {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-30px, 30px) scale(1.1);
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.05);
          }
        }

        @keyframes scale-fade-in {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes pulse-glow {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.8;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse-ring {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }

        @keyframes pulse-subtle {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.02);
          }
        }

        @keyframes bounce-smooth {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
        }

        .animate-float-slow {
          animation: float-slow 20s ease-in-out infinite;
        }

        .animate-float-reverse {
          animation: float-reverse 18s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }

        .animate-scale-fade-in {
          animation: scale-fade-in 0.5s ease-out;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .animate-pulse-ring {
          animation: pulse-ring 2s ease-in-out infinite;
        }

        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }

        .animate-bounce-smooth {
          animation: bounce-smooth 1.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};
export default CallNotification;
