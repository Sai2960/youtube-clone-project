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
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR_SVG);
  const router = useRouter();
  const { user } = useUser();
  const audioContextRef = useRef<any>(null);
  const socketListenersSetupRef = useRef(false);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Process avatar URL when incoming call changes
  useEffect(() => {
    if (incomingCall?.image) {
      const processedUrl = normalizeAvatarUrl(incomingCall.image);
      setAvatarUrl(processedUrl);
      console.log('📸 Avatar URL processed:', processedUrl);
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

    // Setup socket listeners
    const setupSocketListeners = () => {
      if (socketListenersSetupRef.current) {
        console.log("✅ Socket listeners already setup");
        return;
      }

      if (!isSocketConnected()) {
        console.log("⚠️ Socket not connected yet, initializing...");
        try {
          initializeSocket(user._id);
        } catch (error) {
          console.error("❌ Socket initialization error:", error);
          return;
        }
      }

      const checkSocketInterval = setInterval(() => {
        if (isSocketConnected()) {
          clearInterval(checkSocketInterval);

          try {
            const socket = getSocket();
            console.log("✅ Socket connected, setting up call listeners");

            const handleIncomingCall = (data: IncomingCallData) => {
              console.log("\n📞 ===== INCOMING CALL =====");
              console.log("   From:", data.name);
              console.log("   User ID:", data.from);
              console.log("   Room:", data.roomId);
              console.log("   Call ID:", data.callId);
              console.log("   Image:", data.image);
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

            return () => {
              console.log("🧹 Cleaning up socket listeners");
              socket.off("incoming-call", handleIncomingCall);
              socket.off("call-rejected", handleCallRejected);
              socket.off("call-ended", handleCallEnded);
              socketListenersSetupRef.current = false;
            };
          } catch (error) {
            console.error("❌ Error setting up socket listeners:", error);
          }
        }
      }, 500);

      setTimeout(() => {
        clearInterval(checkSocketInterval);
        if (!socketListenersSetupRef.current) {
          console.warn("⚠️ Socket connection timeout - call notifications may not work");
        }
      }, 10000);

      return () => clearInterval(checkSocketInterval);
    };

    const cleanupSocket = setupSocketListeners();

    return () => {
      console.log("🧹 Cleaning up call notification component");
      unsubscribeCrossTab();
      stopRingtone();
      socketListenersSetupRef.current = false;
      if (cleanupSocket) cleanupSocket();
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
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const ctx = audioContextRef.current;

      if (ctx.state === "suspended") {
        ctx.resume().catch((e: any) => console.warn("Failed to resume audio context:", e));
      }

      const playBeep = () => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.frequency.value = 440;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

          osc.start();
          osc.stop(ctx.currentTime + 0.8);
        } catch (error) {
          console.error("Error playing beep:", error);
        }
      };

      playBeep();

      ringtoneIntervalRef.current = setInterval(() => {
        if (isRinging) {
          playBeep();
        }
      }, 1500);

      console.log("🔔 Ringtone started");
    } catch (error) {
      console.error("Error initializing audio:", error);
    }
  };

  const stopRingtone = () => {
    console.log("🔕 Stopping ringtone");

    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        if (audioContextRef.current.state !== "closed") {
          audioContextRef.current.close().catch((e: any) => console.warn("Failed to close audio context:", e));
        }
        audioContextRef.current = null;
      } catch (error) {
        console.error("Error closing audio context:", error);
      }
    }

    setIsRinging(false);
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    try {
      console.log("\n✅ ===== ACCEPTING CALL =====");
      console.log("   Call ID:", incomingCall.callId);
      console.log("   Room ID:", incomingCall.roomId);
      console.log("   From:", incomingCall.name);

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
    <div className="call-notification-overlay fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="call-notification-card bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl animate-scaleIn">
        {/* Caller Info Section */}
        <div className="flex flex-col items-center mb-8">
          {/* Profile Picture with Animations */}
          <div className="relative mb-6">
            {/* Outer pulsing ring */}
            <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-pulse-ring"></div>

            {/* Profile picture */}
            <div className="relative">
              <img
                src={avatarUrl}
                alt={incomingCall.name}
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-green-500 object-cover profile-pulse shadow-2xl"
                onError={(e) => {
                  console.error('❌ Avatar failed to load, using fallback');
                  e.currentTarget.src = DEFAULT_AVATAR_SVG;
                }}
              />

              {/* Video call badge */}
              <div className="absolute -bottom-2 -right-2 bg-green-500 p-2 sm:p-3 rounded-full shadow-lg animate-bounce">
                <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>

          {/* Caller Name */}
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center break-words max-w-full px-4">
            {incomingCall.name}
          </h2>

          {/* Call Status Text */}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-gray-300 text-sm sm:text-base">Incoming video call</p>
          </div>

          {/* Room ID (subtle) */}
          <p className="text-gray-500 text-xs mt-2">
            Room: {incomingCall.roomId?.substring(0, 8)}...
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6 sm:gap-8 mb-6">
          {/* Reject Button */}
          <button
            onClick={handleRejectCall}
            className="call-reject-button bg-red-500 hover:bg-red-600 p-5 sm:p-6 rounded-full transition-all transform active:scale-95 shadow-2xl"
            title="Reject Call"
            aria-label="Reject incoming call"
          >
            <PhoneOff className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAcceptCall}
            className="call-accept-button bg-green-500 hover:bg-green-600 p-6 sm:p-7 rounded-full transition-all transform active:scale-95 shadow-2xl"
            title="Accept Call"
            aria-label="Accept incoming call"
          >
            <Phone className="w-9 h-9 sm:w-10 sm:h-10 text-white" />
          </button>
        </div>

        {/* Ringing Indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex gap-2">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full bounce-dot"></div>
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full bounce-dot" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full bounce-dot" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-xs sm:text-sm">
            Tap accept to start the video call
          </p>
        </div>
      </div>
    </div>
  );
};

export default CallNotification;
