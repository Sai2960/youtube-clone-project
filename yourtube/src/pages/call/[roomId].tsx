// pages/call/[roomId].tsx - COMPLETE CALL PAGE
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import VideoCall from "@/components/ui/VideoCall";
import { useUser } from "@/lib/AuthContext";
import Head from "next/head";
import initializeSocket from "@/lib/socket";
import { GetServerSideProps } from "next";

const CallPage = () => {
  const router = useRouter();
  const { roomId, callId, remoteName, initiator } = router.query;
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [socketReady, setSocketReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ CRITICAL: Initialize socket when user is available
  useEffect(() => {
    if (user?._id) {
      console.log("🔌 Initializing socket for call page");
      try {
        const socket = initializeSocket.initializeSocket(user._id);

        // Wait for connection
        const checkConnection = setInterval(() => {
          if (socket.connected) {
            console.log("✅ Socket connected for call");
            setSocketReady(true);
            clearInterval(checkConnection);
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkConnection);
          if (!socket.connected) {
            console.error("❌ Socket connection timeout");
            setSocketReady(true); // Continue anyway
          }
        }, 10000);
      } catch (error) {
        console.error("❌ Socket init error:", error);
        setSocketReady(true); // Continue anyway
      }
    }
  }, [user?._id]);

  useEffect(() => {
    // Check if we have all required data
    if (mounted && roomId && typeof roomId === "string" && socketReady) {
      console.log("📞 Call page ready");
      console.log("   Room ID:", roomId);
      console.log("   Call ID:", callId);
      console.log("   Remote Name:", remoteName);
      console.log("   Is Initiator:", initiator === "true");
      console.log("   User:", user?._id);
      console.log("   Socket Ready:", socketReady);

      setIsReady(true);
    }
  }, [mounted, roomId, callId, remoteName, initiator, user, socketReady]);

  // 1. Remove Razorpay blocker
  useEffect(() => {
    if (!isReady) return;

    const removeBlockers = () => {
      document
        .querySelectorAll('[class*="razorpay"], iframe[src*="razorpay"]')
        .forEach((el) => {
          (el as HTMLElement).remove();
        });

      document.querySelectorAll('[style*="z-index"]').forEach((el) => {
        const htmlEl = el as HTMLElement;
        const zIndex = parseInt(getComputedStyle(htmlEl).zIndex || "0");
        if (
          zIndex > 2147483640 &&
          !htmlEl.classList.contains("video-call-remote")
        ) {
          htmlEl.style.display = "none";
        }
      });
    };

    removeBlockers();
    const interval = setInterval(removeBlockers, 500);
    return () => clearInterval(interval);
  }, [isReady]);

  // 2. Force video CSS
  useEffect(() => {
    if (!isReady) return;

    const style = document.createElement("style");
    style.id = "call-page-override";
    style.innerHTML = `
      html, body, #__next {
        background: black !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      
      video.video-call-remote {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 2147483647 !important;
        object-fit: cover !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, [isReady]);

  // 3. Clear backgrounds
  useEffect(() => {
    if (!isReady) return;

    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const nextDiv = document.getElementById("__next");

    htmlEl.style.background = "transparent";
    htmlEl.style.backgroundColor = "transparent";
    bodyEl.style.background = "transparent";
    bodyEl.style.backgroundColor = "transparent";

    if (nextDiv) {
      nextDiv.style.background = "transparent";
      nextDiv.style.backgroundColor = "transparent";
    }

    return () => {
      htmlEl.style.background = "";
      htmlEl.style.backgroundColor = "";
      bodyEl.style.background = "";
      bodyEl.style.backgroundColor = "";
      if (nextDiv) {
        nextDiv.style.background = "";
        nextDiv.style.backgroundColor = "";
      }
    };
  }, [isReady]);

  // Show loading screen until everything is ready
  if (!mounted || !isReady || !socketReady) {
    return (
      <>
        <Head>
          <title>Preparing Call...</title>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
          />
        </Head>
        <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
          <div className="text-center text-white">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl font-semibold">
              {!socketReady ? "Connecting to server..." : "Preparing call..."}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {!socketReady
                ? "Establishing connection"
                : "Setting up video and audio"}
            </p>
          </div>
        </div>
      </>
    );
  }

  const handleEndCall = () => {
    console.log("📞 Call ended, redirecting to home");

    // Clear any call-related storage
    try {
      sessionStorage.removeItem("youtube_incoming_call");
      localStorage.removeItem("youtube_incoming_call");
    } catch (error) {
      console.error("Error clearing storage:", error);
    }

    // Redirect to home
    router.push("/");
  };

  // Validate user is authenticated
  if (mounted && isReady && socketReady && !user?._id) {
    return (
      <>
        <Head>
          <title>Authentication Required</title>
        </Head>
        <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
          <div className="text-center text-white max-w-md">
            <p className="text-xl font-semibold mb-4">
              Authentication Required
            </p>
            <p className="text-gray-400 mb-6">Please sign in to make calls</p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              Go to Home
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Video Call - {remoteName || "Remote User"}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <style>{`
          body {
            overflow: hidden;
            margin: 0;
            padding: 0;
          }
        `}</style>
      </Head>

      <div className="fixed inset-0 bg-black z-[9999] overflow-hidden">
        <VideoCall
          roomId={roomId as string}
          isInitiator={initiator === "true"}
          onEndCall={handleEndCall}
          remotePeerName={(remoteName as string) || "Remote User"}
          callId={(callId as string) || ""}
        />
      </div>
    </>
  );
};

// ✅ CRITICAL FIX: This disables static generation and forces server-side rendering
// This prevents the "Cannot find module 'critters'" error during build
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {}, // Empty props - we get everything from router query params
  };
};

export default CallPage;
