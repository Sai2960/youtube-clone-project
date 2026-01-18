// components/ui/CallButton.tsx - PREMIUM ENHANCED VERSION
import React, { useState } from "react";
import { Video, Loader2 } from "lucide-react";
import { useRouter } from "next/router";
import axiosInstance from "@/lib/axiosinstance";
import { getSocket, isSocketConnected, initializeSocket } from "@/lib/socket";
import { useUser } from "@/lib/AuthContext";

interface CallButtonProps {
  recipientId: string;
  recipientName: string;
  recipientImage?: string;
  variant?: "icon" | "button";
  size?: "sm" | "md" | "lg";
}

const CallButton: React.FC<CallButtonProps> = ({
  recipientId,
  recipientName,
  recipientImage,
  variant = "icon",
  size = "md",
}) => {
  const router = useRouter();
  const { user } = useUser();
  const [isInitiating, setIsInitiating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizeConfig = {
    sm: {
      button: "px-4 py-2 text-sm",
      icon: "w-9 h-9 sm:w-10 sm:h-10",
      iconSize: "w-4 h-4",
    },
    md: {
      button: "px-5 py-2.5 text-sm",
      icon: "w-10 h-10 sm:w-11 sm:h-11",
      iconSize: "w-[18px] h-[18px]",
    },
    lg: {
      button: "px-6 py-3 text-base",
      icon: "w-12 h-12 sm:w-13 sm:h-13",
      iconSize: "w-5 h-5",
    },
  };

  const handleCall = async () => {
    if (!user) {
      alert("Please log in to make calls");
      return;
    }

    if (recipientId === user._id) {
      alert("You cannot call yourself");
      return;
    }

    try {
      setIsInitiating(true);
      setError(null);

      console.log("\n📞 ===== INITIATING CALL =====");
      console.log("   From:", user.name || user.channelname);
      console.log("   To:", recipientName);
      console.log("   Recipient ID:", recipientId);

      // 1. Ensure socket is connected
      if (!isSocketConnected()) {
        console.log("🔌 Socket not connected, initializing...");
        initializeSocket(user._id);

        // Wait for socket to connect
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("Socket connection timeout")),
            5000
          );
          const checkInterval = setInterval(() => {
            if (isSocketConnected()) {
              clearInterval(checkInterval);
              clearTimeout(timeout);
              resolve(true);
            }
          }, 100);
        });
      }

      const socket = getSocket();
      console.log("✅ Socket ready:", socket.id);

      // 2. Create call in database
      console.log("📝 Creating call record...");
      const response = await axiosInstance.post("/call/initiate", {
        receiverId: recipientId,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to initiate call");
      }

      const { roomId, _id: callId } = response.data.call;
      console.log("✅ Call record created");
      console.log("   Room ID:", roomId);
      console.log("   Call ID:", callId);

      // 3. Send call notification via socket
      console.log("📤 Sending call notification...");
      socket.emit("call-user", {
        userToCall: recipientId,
        from: user._id,
        name: user.channelname || user.name || "Unknown User",
        image: user.image || "",
        roomId: roomId,
        callId: callId,
      });

      // 4. Wait for acknowledgment or timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Call initiation timeout"));
        }, 3000);

        socket.once("call-initiated", (data) => {
          clearTimeout(timeout);
          if (data.success) {
            console.log("✅ Call initiated successfully");
            resolve(data);
          } else {
            reject(new Error("Call initiation failed"));
          }
        });

        socket.once("call-error", (data) => {
          clearTimeout(timeout);
          reject(new Error(data.message || "Recipient is offline"));
        });
      });

      // 5. Navigate to call page
      console.log("🚀 Navigating to call page...");
      console.log("===== CALL INITIATED =====\n");

      router.push({
        pathname: `/call/${roomId}`,
        query: {
          callId: callId,
          remoteName: recipientName,
          initiator: "true",
        },
      });
    } catch (error: any) {
      console.error("❌ Failed to initiate call:", error);

      let errorMessage = "Failed to start call";
      if (error.message.includes("offline")) {
        errorMessage = `${recipientName} is not available`;
      } else if (error.message.includes("timeout")) {
        errorMessage = "Connection timeout - please try again";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsInitiating(false);
    }
  };

  // Button Variant - Premium Text Button
  if (variant === "button") {
    return (
      <>
        <style jsx>{`
          @keyframes premium-shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
          .premium-call-button {
            position: relative;
            overflow: hidden;
          }
          .premium-call-button::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.1),
              transparent
            );
            background-size: 200% 100%;
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .premium-call-button:hover::before {
            opacity: 1;
            animation: premium-shimmer 1.5s infinite;
          }
        `}</style>
        <button
          onClick={handleCall}
          disabled={isInitiating}
          className={`
            premium-call-button
            inline-flex items-center justify-center gap-2.5
            ${sizeConfig[size].button}
            rounded-xl
            font-medium
            bg-gradient-to-r from-emerald-500 to-emerald-600
            hover:from-emerald-600 hover:to-emerald-700
            dark:from-emerald-500 dark:to-emerald-600
            dark:hover:from-emerald-400 dark:hover:to-emerald-500
            text-white
            shadow-md shadow-emerald-500/20 dark:shadow-emerald-500/10
            hover:shadow-lg hover:shadow-emerald-500/30 dark:hover:shadow-emerald-500/20
            disabled:from-neutral-300 disabled:to-neutral-400
            dark:disabled:from-neutral-600 dark:disabled:to-neutral-700
            disabled:text-neutral-500 dark:disabled:text-neutral-400
            disabled:cursor-not-allowed disabled:shadow-none
            transition-all duration-300
            transform hover:scale-[1.02] active:scale-[0.98]
            border border-emerald-400/20 dark:border-emerald-400/10
          `}
          title={`Video call ${recipientName}`}
        >
          {isInitiating ? (
            <>
              <Loader2 className={`${sizeConfig[size].iconSize} animate-spin`} />
              <span>Calling...</span>
            </>
          ) : (
            <>
              <Video className={sizeConfig[size].iconSize} />
              <span>Video Call</span>
            </>
          )}
        </button>
      </>
    );
  }

  // Icon Variant - Premium Minimal Icon Button
  return (
    <>
      <style jsx>{`
        @keyframes premium-icon-ring {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
        .premium-icon-button {
          position: relative;
        }
        .premium-icon-button::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: inherit;
          opacity: 0;
          z-index: -1;
        }
        .premium-icon-button:hover::before {
          animation: premium-icon-ring 0.6s ease-out;
        }
      `}</style>
      <button
        onClick={handleCall}
        disabled={isInitiating}
        className={`
          premium-icon-button
          ${sizeConfig[size].icon}
          inline-flex items-center justify-center
          rounded-full
          bg-gradient-to-br from-emerald-500 to-emerald-600
          hover:from-emerald-400 hover:to-emerald-500
          dark:from-emerald-500 dark:to-emerald-600
          dark:hover:from-emerald-400 dark:hover:to-emerald-500
          text-white
          shadow-md shadow-emerald-500/25 dark:shadow-emerald-500/15
          hover:shadow-lg hover:shadow-emerald-500/35 dark:hover:shadow-emerald-500/25
          disabled:from-neutral-300 disabled:to-neutral-400
          dark:disabled:from-neutral-600 dark:disabled:to-neutral-700
          disabled:shadow-none disabled:cursor-not-allowed
          transition-all duration-300
          transform hover:scale-110 active:scale-95
          border border-emerald-400/20 dark:border-emerald-400/10
        `}
        title={`Video call ${recipientName}`}
        aria-label={`Video call ${recipientName}`}
      >
        {isInitiating ? (
          <Loader2 className={`${sizeConfig[size].iconSize} animate-spin`} />
        ) : (
          <Video className={sizeConfig[size].iconSize} />
        )}
      </button>
    </>
  );
};

export default CallButton;
