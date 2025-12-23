/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from "react";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  Circle,
  Maximize,
  Play,
} from "lucide-react";
import { WebRTCService } from "@/lib/webrtc";
import { RecordingService } from "@/lib/recordingService";
import initializeSocket, {
  getSocket,
  isSocketConnected,
  waitForSocket,
} from "@/lib/socket";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";

interface VideoCallProps {
  roomId: string;
  isInitiator: boolean;
  onEndCall: () => void;
  remotePeerName?: string;
  callId?: string;
}

// ✅ FIXED: Simplified media acquisition
const getMediaStream = async (): Promise<MediaStream> => {
  console.log("🎤 ===== GETTING MEDIA STREAM =====");
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000
      }
    });

    console.log("✅ Media stream obtained:");
    console.log("   Audio tracks:", stream.getAudioTracks().length);
    console.log("   Video tracks:", stream.getVideoTracks().length);
    
    // Force enable all tracks
    stream.getTracks().forEach(track => {
      track.enabled = true;
      console.log(`   ✅ ${track.kind}: ${track.label} - enabled`);
    });

    return stream;
  } catch (err: any) {
    console.error("❌ Media access failed:", err);
    throw new Error(
      err.name === "NotAllowedError" 
        ? "Camera/mic permission denied" 
        : "Cannot access camera/microphone"
    );
  }
};

const VideoCall: React.FC<VideoCallProps> = ({
  roomId,
  isInitiator,
  onEndCall,
  remotePeerName = "Remote User",
  callId = "",
}) => {
  const router = useRouter();
  const { user } = useUser();

  console.log("🎬 ===== VideoCall RENDER =====");
  console.log("   roomId:", roomId);
  console.log("   isInitiator:", isInitiator);
  console.log("   user:", user?._id);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcServiceRef = useRef<WebRTCService | null>(null);
  const recordingServiceRef = useRef<RecordingService | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callEndedRef = useRef(false);
  const isEndingCallRef = useRef(false);
  const initializingRef = useRef(false);
  const initializedRef = useRef(false);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // ✅ CRITICAL: Setup remote audio
  const setupRemoteAudio = async (stream: MediaStream) => {
    console.log("🔊 ===== SETTING UP REMOTE AUDIO =====");

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.error("❌ No audio tracks!");
      return;
    }

    // Enable all tracks
    stream.getTracks().forEach(track => {
      track.enabled = true;
      console.log(`   ✅ Enabled ${track.kind}: ${track.label}`);
    });

    // Attach to video element
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.volume = 1.0;

      try {
        await remoteVideoRef.current.play();
        console.log("✅ Video playing with audio");
        setConnectionStatus("connected");
        setShowPlayButton(false);
        setError(null);
      } catch (err: any) {
        console.error("❌ Video play failed:", err.name);
        if (err.name === "NotAllowedError") {
          setShowPlayButton(true);
          setError("Click play to start");
        }
      }
    }

    // Create backup audio element
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
    }

    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    audioEl.muted = false;
    audioEl.volume = 1.0;
    audioEl.style.cssText = "position:fixed;left:-9999px;";
    audioEl.srcObject = new MediaStream(audioTracks);

    remoteAudioRef.current = audioEl;
    document.body.appendChild(audioEl);

    try {
      await audioEl.play();
      console.log("✅ Backup audio playing");
    } catch (err) {
      console.warn("⚠️ Backup audio blocked");
    }
  };

  // ✅ CRITICAL: Initialize call
  const initializeCall = async () => {
    console.log("\n🎥 ===== INITIALIZE CALL (FIXED) =====");

    try {
      setError(null);

      // Validate user
      if (!user?._id) {
        throw new Error("User not authenticated");
      }

      // Socket setup
      if (!isSocketConnected()) {
        console.log("🔌 Initializing socket...");
        initializeSocket(user._id);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const socket = await waitForSocket(15000);
      console.log("✅ Socket connected:", socket.id);

      // ✅ CRITICAL: Create WebRTC service FIRST
      console.log("🔧 Creating WebRTC service...");
      webrtcServiceRef.current = new WebRTCService();
      recordingServiceRef.current = new RecordingService();
      
      // ✅ Expose to window IMMEDIATELY
      if (typeof window !== 'undefined') {
        (window as any).webrtcService = webrtcServiceRef.current;
        (window as any).peerConnection = webrtcServiceRef.current.getPeerConnection();
        console.log("✅ WebRTC exposed to window");
      }

      // Get media
      console.log("🎤 Getting media...");
      const stream = await getMediaStream();
      
      webrtcServiceRef.current.setLocalStream(stream);

      // Attach to local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        await localVideoRef.current.play().catch(console.error);
        console.log("✅ Local video attached");
      }

      // Setup event listeners
      console.log("🔧 Setting up listeners...");
      webrtcServiceRef.current.setupEventListeners(
        async (remoteStream: MediaStream) => {
          console.log("\n🎬 ===== REMOTE STREAM RECEIVED =====");
          await setupRemoteAudio(remoteStream);
        },
        (candidate: RTCIceCandidate) => {
          socket.emit("ice-candidate", roomId, candidate);
        }
      );

      // Add local stream
      console.log("📤 Adding local stream...");
      await webrtcServiceRef.current.addLocalStreamToPeer();

      // Join room
      console.log("🚪 Joining room:", roomId);
      socket.emit("join-room", roomId, user._id);

      // Handle signaling
      if (isInitiator) {
        console.log("👑 INITIATOR - creating offer");
        
        await new Promise<void>(resolve => {
          const timeout = setTimeout(resolve, 3000);
          socket.once("user-joined", () => {
            clearTimeout(timeout);
            resolve();
          });
        });

        const offer = await webrtcServiceRef.current.createOffer();
        socket.emit("offer", roomId, offer);
        console.log("✅ Offer sent");
      } else {
        console.log("🙋 RECEIVER - waiting for offer");
      }

      console.log("✅ Call initialization complete\n");
      
    } catch (error: any) {
      console.error("❌ Init failed:", error);
      setError(error.message || "Initialization failed");
      throw error; // ✅ Re-throw to trigger outer catch
    }
  };

  // ✅ CRITICAL: Initialization effect
  useEffect(() => {
    console.log("\n🔄 ===== INIT EFFECT =====");
    console.log("   roomId:", roomId);
    console.log("   userInteracted:", userInteracted);
    console.log("   initializing:", initializingRef.current);
    console.log("   initialized:", initializedRef.current);

    if (!roomId) {
      console.error("❌ No room ID");
      setError("Invalid room ID");
      return;
    }

    if (!userInteracted) {
      console.log("⏳ Waiting for user interaction");
      return;
    }

    if (initializingRef.current || initializedRef.current) {
      console.log("⚠️ Already initialized");
      return;
    }

    initializingRef.current = true;
    let mounted = true;

    const init = async () => {
      try {
        // Wait for refs
        console.log("⏳ Waiting for video refs...");
        let attempts = 0;
        while ((!localVideoRef.current || !remoteVideoRef.current) && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!localVideoRef.current || !remoteVideoRef.current) {
          throw new Error("Video elements not ready");
        }

        console.log("✅ Video refs ready");

        await initializeCall();

        if (mounted) {
          initializedRef.current = true;
          initializingRef.current = false;
          setIsInitialized(true);
          console.log("✅✅✅ INITIALIZATION SUCCESS ✅✅✅");
        }
      } catch (error: any) {
        console.error("❌❌❌ INITIALIZATION FAILED ❌❌❌");
        console.error("   Error:", error.message);
        
        if (mounted) {
          setError(error.message || "Failed to initialize");
          initializingRef.current = false;
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (initializedRef.current && webrtcServiceRef.current) {
        cleanup(false);
      }
    };
  }, [roomId, userInteracted]);

  // ✅ Socket handlers
  useEffect(() => {
    if (!webrtcServiceRef.current) return;

    let socket: any;

    const setup = async () => {
      socket = await waitForSocket(15000);

      const handleOffer = async (data: any) => {
        console.log("\n📥 RECEIVED OFFER");
        if (!webrtcServiceRef.current) return;

        try {
          await webrtcServiceRef.current.setRemoteDescription(data.offer);
          const answer = await webrtcServiceRef.current.createAnswer();
          socket.emit("answer", roomId, answer);
          console.log("✅ Answer sent");
        } catch (err) {
          console.error("❌ Offer error:", err);
        }
      };

      const handleAnswer = async (data: any) => {
        console.log("\n📥 RECEIVED ANSWER");
        if (!webrtcServiceRef.current) return;

        try {
          await webrtcServiceRef.current.setRemoteDescription(data.answer);
          console.log("✅ Answer processed");
        } catch (err) {
          console.error("❌ Answer error:", err);
        }
      };

      const handleIceCandidate = async (data: any) => {
        if (!webrtcServiceRef.current || !data.candidate?.candidate) return;
        
        try {
          await webrtcServiceRef.current.addIceCandidate(data.candidate);
        } catch (err) {
          console.error("❌ ICE error:", err);
        }
      };

      const handleCallEnded = () => {
        if (!callEndedRef.current) {
          callEndedRef.current = true;
          cleanup(false);
          onEndCall();
          router.push("/");
        }
      };

      socket.on("offer", handleOffer);
      socket.on("answer", handleAnswer);
      socket.on("ice-candidate", handleIceCandidate);
      socket.on("call-ended", handleCallEnded);

      return () => {
        socket.off("offer", handleOffer);
        socket.off("answer", handleAnswer);
        socket.off("ice-candidate", handleIceCandidate);
        socket.off("call-ended", handleCallEnded);
      };
    };

    setup();
  }, [roomId, onEndCall, router]);

  // Cleanup function
  const cleanup = (emitEvent: boolean = true) => {
    console.log("🧹 Cleanup");

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }

    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current?.srcObject) {
      const stream = remoteVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      remoteVideoRef.current.srcObject = null;
    }

    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.close();
      webrtcServiceRef.current = null;
    }

    if (emitEvent && !callEndedRef.current) {
      try {
        const socket = getSocket();
        socket.emit("end-call", roomId, { endedBy: user?._id });
      } catch (err) {
        console.error("Socket error:", err);
      }
    }

    initializedRef.current = false;
    initializingRef.current = false;
  };

  const toggleAudio = () => {
    if (webrtcServiceRef.current) {
      const newState = !isAudioEnabled;
      webrtcServiceRef.current.toggleAudio(newState);
      setIsAudioEnabled(newState);
    }
  };

  const toggleVideo = () => {
    if (webrtcServiceRef.current) {
      const newState = !isVideoEnabled;
      webrtcServiceRef.current.toggleVideo(newState);
      setIsVideoEnabled(newState);
    }
  };

  const handleEndCall = async () => {
    if (callEndedRef.current) return;
    
    callEndedRef.current = true;
    cleanup(true);
    onEndCall();
    router.push("/");
  };

  const handlePlayClick = async () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.volume = 1.0;
      await remoteVideoRef.current.play();
    }
    
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 1.0;
      await remoteAudioRef.current.play();
    }

    setShowPlayButton(false);
    setError(null);
  };

  // ✅ START CALL button
  if (!userInteracted) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Video className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-white text-3xl font-bold mb-2">Ready to join?</h1>
          <p className="text-gray-400 text-lg mb-8">Tap to start your call</p>
          <button
            onClick={() => {
              console.log("🎬 START CALL clicked");
              setUserInteracted(true);
            }}
            className="px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-lg"
          >
            🎥 START CALL
          </button>
        </div>
      </div>
    );
  }

  // ✅ INITIALIZING screen
  if (userInteracted && !isInitialized) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-white text-2xl font-bold mb-2">Initializing...</h1>
          <p className="text-gray-400">Setting up audio and video</p>
          {error && (
            <p className="text-red-500 mt-4 font-semibold">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // ✅ MAIN CALL UI
  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      {/* Remote video */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover"
      />

      {/* Local video */}
      <div className="absolute bottom-24 right-6 w-64 h-48 rounded-xl overflow-hidden border-4 border-white shadow-2xl bg-black">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      </div>

      {/* Play button overlay */}
      {showPlayButton && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <button
            onClick={handlePlayClick}
            className="p-12 rounded-full bg-green-600 hover:bg-green-700"
          >
            <Play className="w-16 h-16 text-white" fill="currentColor" />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-8">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleAudio}
            className={`p-5 rounded-full ${isAudioEnabled ? "bg-gray-700" : "bg-red-600"}`}
          >
            {isAudioEnabled ? <Mic className="w-7 h-7 text-white" /> : <MicOff className="w-7 h-7 text-white" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-5 rounded-full ${isVideoEnabled ? "bg-gray-700" : "bg-red-600"}`}
          >
            {isVideoEnabled ? <Video className="w-7 h-7 text-white" /> : <VideoOff className="w-7 h-7 text-white" />}
          </button>

          <button
            onClick={handleEndCall}
            className="p-6 rounded-full bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="w-8 h-8 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;