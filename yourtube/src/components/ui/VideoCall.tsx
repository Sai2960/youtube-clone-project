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
// ✅ Audio verification
const verifyAudioTrack = async (track: MediaStreamTrack): Promise<boolean> => {
  console.log("🎤 Verifying audio track:", {
    readyState: track.readyState,
    muted: track.muted,
    enabled: track.enabled,
    label: track.label,
  });

  // ✅ Simple verification without AudioContext
  if (track.readyState !== "live") {
    console.warn("⚠️ Audio track not live");
    return false;
  }

  if (track.muted) {
    console.warn("⚠️ Audio track muted");
  }

  if (!track.enabled) {
    console.warn("⚠️ Audio track disabled");
    track.enabled = true;
  }

  // ✅ Check track settings
  const settings = track.getSettings();
  console.log("🎤 Audio settings:", {
    sampleRate: settings.sampleRate,
    channelCount: settings.channelCount,
  });

  // ✅ Optimistic - assume track is working if it's live
  console.log("✅ Audio track verified (optimistic)");
  return true;
};

// ✅ Intelligent microphone selection with webcam priority
// ✅ Media acquisition
const ensureAudioNotMuted = async (): Promise<MediaStream> => {
  console.log("🔧 Starting media acquisition...");

  try {
    const permStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    permStream.getTracks().forEach((t) => t.stop());
    console.log("✅ Permissions granted");

    await new Promise((resolve) => setTimeout(resolve, 500));

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === "audioinput");
    const videoInputs = devices.filter((d) => d.kind === "videoinput");

    console.log(`📹 Found ${videoInputs.length} cameras`);
    console.log(`🎤 Found ${audioInputs.length} microphones`);

    const camera =
      videoInputs.find(
        (v) =>
          v.label.toLowerCase().includes("hd") ||
          v.label.toLowerCase().includes("camera")
      ) || videoInputs[0];

    let targetMic = audioInputs.find((mic) => {
      const micLabel = mic.label.toLowerCase();
      const cameraLabel = camera?.label.toLowerCase() || "";

      if (cameraLabel.includes("hd") && micLabel.includes("hd")) {
        return true;
      }

      if (micLabel.includes("video") || micLabel.includes("camera")) {
        return true;
      }

      return false;
    });

    if (!targetMic) {
      targetMic = audioInputs.find(
        (d) =>
          d.label.toLowerCase().includes("usb") &&
          !d.label.toLowerCase().includes("monitor")
      );
    }

    if (!targetMic) {
      targetMic =
        audioInputs.find(
          (m) =>
            m.deviceId !== "default" &&
            m.deviceId !== "communications" &&
            !m.label.toLowerCase().includes("monitor")
        ) || audioInputs[0];
    }

    console.log(`🎯 Target microphone: ${targetMic?.label}`);

    const constraints = {
      audio: targetMic
        ? {
            deviceId: { exact: targetMic.deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1,
          }
        : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1,
          },
      video: camera
        ? {
            deviceId: { exact: camera.deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          }
        : {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const audioTrack = stream.getAudioTracks()[0];
    const videoTrack = stream.getVideoTracks()[0];

    console.log("✅ Stream obtained:");
    console.log(`   🎤 Audio: ${audioTrack.label}`);
    console.log(`   📹 Video: ${videoTrack.label}`);

    audioTrack.enabled = true;
    videoTrack.enabled = true;

    const audioWorks = await verifyAudioTrack(audioTrack);

    if (!audioWorks) {
      console.warn("⚠️ Selected mic not working, trying fallback...");
      stream.getTracks().forEach((t) => t.stop());

      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
      fallbackStream.getTracks().forEach((t) => (t.enabled = true));

      console.log("✅ Using fallback microphone");
      return fallbackStream;
    }

    console.log("✅ Media acquisition complete");
    return stream;
  } catch (err: any) {
    console.error("❌ Media access failed:", err);

    if (
      err.name === "NotAllowedError" ||
      err.name === "PermissionDeniedError"
    ) {
      throw new Error("🚫 Camera/mic blocked! Click 🔒 in address bar → Allow");
    } else if (err.name === "NotReadableError") {
      throw new Error("⚠️ Microphone in use. Close other apps and refresh.");
    } else if (err.name === "NotFoundError") {
      throw new Error("⚠️ No camera or microphone found.");
    }

    throw err;
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

  // ✅ ADD THIS DEBUG CODE:
  useEffect(() => {
    console.log("🎬 VideoCall component MOUNTED");
    console.log("   roomId:", roomId);
    console.log("   isInitiator:", isInitiator);
    console.log("   userInteracted:", userInteracted);

    return () => {
      console.log("🛑 VideoCall component UNMOUNTED");
    };
  }, []);

  useEffect(() => {
    console.log("📹 Video refs status:");
    console.log("   localVideoRef.current:", !!localVideoRef.current);
    console.log("   remoteVideoRef.current:", !!remoteVideoRef.current);
  });

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
  const [isInitialized, setIsInitialized] = useState(false); // ✅ ADD THIS

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcServiceRef = useRef<WebRTCService | null>(null);
  const recordingServiceRef = useRef<RecordingService | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callEndedRef = useRef(false);
  const isEndingCallRef = useRef(false);
  const initializingRef = useRef(false);
  const initializedRef = useRef(false);
  const remoteStreamReceivedRef = useRef(false);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // ✅ CRITICAL FIX: Persistent audio element setup
  // ✅ PRODUCTION-READY: Remote audio setup
  const setupRemoteAudio = async (stream: MediaStream) => {
    console.log("🔊 Setting up remote audio/video");

    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();

    if (audioTracks.length === 0) {
      console.error("❌ No audio tracks!");
      return;
    }
    // ✅ Force enable ALL tracks
    stream.getTracks().forEach((track) => {
      track.enabled = true;
      console.log(
        `✅ ${track.kind}: enabled=${track.enabled}, muted=${track.muted}`
      );
    });

    // Clean old audio element
    if (remoteAudioRef.current) {
      try {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current.remove();
      } catch (e) {}
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    // ✅ Force enable audio tracks FIRST
    audioTracks.forEach((track) => {
      track.enabled = true;
      console.log(
        `🎤 Audio track: ${track.label}, enabled=${track.enabled}, muted=${track.muted}, state=${track.readyState}`
      );
    });

    // Clean old audio
    if (remoteAudioRef.current) {
      try {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current.remove();
      } catch (e) {
        console.warn("Cleanup error:", e);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    // ✅ Create NEW audio element
    const audioEl = document.createElement("audio");
    audioEl.id = "remote-audio-element";
    audioEl.autoplay = true;
    audioEl.setAttribute("playsinline", "true"); // ✅ FIXED
    audioEl.muted = false; // ✅ CRITICAL
    audioEl.volume = 1.0;

    audioEl.style.cssText =
      "position:fixed;left:-9999px;width:1px;height:1px;pointer-events:none;";

    const audioStream = new MediaStream(audioTracks);
    audioEl.srcObject = audioStream;

    remoteAudioRef.current = audioEl;
    document.body.appendChild(audioEl);

    // Event handlers
    audioEl.onloadedmetadata = () => console.log("✅ Audio metadata loaded");
    audioEl.oncanplay = () => console.log("✅ Audio can play");
    audioEl.onplay = () => console.log("✅ Audio PLAYING");

    audioEl.onpause = () => {
      console.warn("⚠️ Audio paused unexpectedly");
      if (!callEndedRef.current && audioEl.srcObject) {
        setTimeout(() => {
          audioEl.play().catch((err) => {
            console.error("❌ Failed to resume audio:", err);
          });
        }, 100);
      }
    };

    audioEl.onerror = (e) => {
      console.error("❌ Audio error:", audioEl.error);
    };

    await new Promise((resolve) => setTimeout(resolve, 200));

    // ✅ Play with retry
    let attempts = 0;
    const maxAttempts = 5;

    const attemptPlay = async (): Promise<boolean> => {
      try {
        audioEl.volume = 1.0;
        audioEl.muted = false;

        await audioEl.play();
        console.log("✅ Audio playing successfully");
        setShowPlayButton(false);
        setError(null);

        // ✅ CRITICAL: ONLY create AudioContext AFTER successful play AND user interaction
        if (userInteracted) {
          try {
            const AudioContextClass =
              (window as any).AudioContext ||
              (window as any).webkitAudioContext;

            if (AudioContextClass && !audioContextRef.current) {
              audioContextRef.current = new AudioContextClass({
                latencyHint: "interactive",
                sampleRate: 48000,
              });

              console.log(
                "✅ AudioContext created:",
                audioContextRef.current.state
              );

              const source =
                audioContextRef.current.createMediaStreamSource(audioStream);
              const gainNode = audioContextRef.current.createGain();

              gainNode.gain.value = 2.0;

              source.connect(gainNode);
              gainNode.connect(audioContextRef.current.destination);

              console.log("✅ Audio pipeline connected with 2x gain");
            }
          } catch (err) {
            console.error("❌ AudioContext setup failed (non-critical):", err);
          }
        }

        return true;
      } catch (err: any) {
        attempts++;
        console.error(`❌ Play attempt ${attempts}/${maxAttempts}:`, err.name);

        if (
          err.name === "NotAllowedError" ||
          err.name === "NotSupportedError"
        ) {
          setShowPlayButton(true);
          setError("🔊 Click play to enable audio");
          return false;
        }

        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempts * 300));
          return attemptPlay();
        }

        setShowPlayButton(true);
        setError("⚠️ Audio requires interaction");
        return false;
      }
    };

    await attemptPlay();
  };
  // User interaction detection
  useEffect(() => {
    const handleInteraction = () => {
      if (!userInteracted) {
        console.log("✅ User interaction detected");
        setUserInteracted(true);
      }
    };

    document.addEventListener("click", handleInteraction, { once: true });
    document.addEventListener("touchstart", handleInteraction, { once: true });

    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, [userInteracted]);

  // Fullscreen
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
          console.log("✅ Entered fullscreen");
        }
      } catch (error) {
        console.warn("⚠️ Fullscreen blocked:", error);
      }
    };

    if (userInteracted) {
      enterFullscreen();
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }
    };
  }, [userInteracted]);

  // AudioContext resume
  useEffect(() => {
    if (!userInteracted) return;

    // ✅ CRITICAL: Resume all audio contexts on user interaction
    const resumeAllAudio = async () => {
      try {
        const AudioContext =
          (window as any).AudioContext || (window as any).webkitAudioContext;

        if (AudioContext) {
          // Resume any existing context
          if (audioContextRef.current?.state === "suspended") {
            await audioContextRef.current.resume();
            console.log("✅ Resumed AudioContext on user interaction");
          }

          // Also try resuming the audio element
          if (remoteAudioRef.current?.paused) {
            try {
              await remoteAudioRef.current.play();
              console.log("✅ Resumed audio element on user interaction");
            } catch (err) {
              console.warn("⚠️ Could not resume audio element:", err);
            }
          }
        }
      } catch (err) {
        console.error("❌ Error resuming audio:", err);
      }
    };

    resumeAllAudio();
  }, [userInteracted]);

  // Socket event handlers
  useEffect(() => {
    if (!webrtcServiceRef.current) return;

    let socket: any;

    const setupHandlers = async () => {
      try {
        socket = await waitForSocket(15000);
        console.log("✅ Socket ready:", socket.id);
      } catch (err) {
        console.error("❌ Socket timeout");
        setError("Connection timeout");
        return;
      }

      const handleOffer = async (data: {
        offer: RTCSessionDescriptionInit;
        from: string;
      }) => {
        console.log("\n📥 Received OFFER from:", data.from);

        if (!webrtcServiceRef.current) return;

        try {
          await webrtcServiceRef.current.setRemoteDescription(data.offer);
          const answer = await webrtcServiceRef.current.createAnswer();
          socket.emit("answer", roomId, answer);
          console.log("📤 Answer sent");
        } catch (error) {
          console.error("❌ Offer handling error:", error);
        }
      };

      const handleAnswer = async (data: {
        answer: RTCSessionDescriptionInit;
        from: string;
      }) => {
        console.log("\n📥 Received ANSWER from:", data.from);

        if (!webrtcServiceRef.current) return;

        try {
          await webrtcServiceRef.current.setRemoteDescription(data.answer);
          console.log("✅ Answer processed");
        } catch (error) {
          console.error("❌ Answer handling error:", error);
        }
      };

      const handleIceCandidate = async (data: {
        candidate: RTCIceCandidateInit;
        from: string;
      }) => {
        console.log("❄️ ICE candidate from:", data.from);

        if (!webrtcServiceRef.current) return;

        if (data.candidate && data.candidate.candidate) {
          try {
            await webrtcServiceRef.current.addIceCandidate(data.candidate);
          } catch (error) {
            console.error("❌ ICE error:", error);
          }
        }
      };

      const handleCallEnded = (data: { endedBy?: string; reason?: string }) => {
        console.log("📴 Call ended by remote peer");
        if (!callEndedRef.current) {
          callEndedRef.current = true;

          if (isRecording && recordingServiceRef.current) {
            recordingServiceRef.current.stopRecording();
          }

          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
          }

          cleanup(false);
          onEndCall();
          setTimeout(() => router.push("/"), 300);
        }
      };

      socket.on("offer", handleOffer);
      socket.on("answer", handleAnswer);
      socket.on("ice-candidate", handleIceCandidate);
      socket.on("call-ended", handleCallEnded);

      console.log("✅ Socket handlers registered");

      return () => {
        socket.off("offer", handleOffer);
        socket.off("answer", handleAnswer);
        socket.off("ice-candidate", handleIceCandidate);
        socket.off("call-ended", handleCallEnded);
      };
    };

    const cleanupPromise = setupHandlers();

    return () => {
      cleanupPromise.then((fn) => fn && fn());
    };
  }, [roomId, isRecording, onEndCall, router]);

  // Main initialization - FORCED VERSION
  useEffect(() => {
    console.log(
      "🔄 Init effect triggered - roomId:",
      roomId,
      "userInteracted:",
      userInteracted,
      "initializing:",
      initializingRef.current,
      "initialized:",
      initializedRef.current
    );

    if (!roomId) {
      setError("Invalid room ID");
      return;
    }

    // Don't initialize until user has interacted
    if (!userInteracted) {
      console.log("⏳ Waiting for user interaction...");
      return;
    }

    // ✅ CRITICAL FIX: More robust double-init prevention
    if (initializingRef.current) {
      console.warn("⚠️ Already initializing - BLOCKED");
      return;
    }

    if (initializedRef.current) {
      console.warn("⚠️ Already initialized - BLOCKED");
      return;
    }

    if (webrtcServiceRef.current) {
      console.warn("⚠️ WebRTC service already exists - BLOCKED");
      return;
    }

    console.log("🚀 Starting initialization...");
    initializingRef.current = true;
    let mounted = true;

    const init = async () => {
      try {
        console.log("🎬 Calling initializeCall()...");
        await initializeCall();

        if (mounted) {
          initializedRef.current = true;
          initializingRef.current = false;
          setIsInitialized(true); // ✅ NEW: Trigger re-render
          console.log("✅ Initialization complete - refs:", {
            webrtc: !!webrtcServiceRef.current,
            localVideo: !!localVideoRef.current,
            remoteVideo: !!remoteVideoRef.current,
            peerConnection: !!webrtcServiceRef.current?.getPeerConnection(),
          });
        }
      } catch (error: any) {
        console.error("❌ Init error:", error);
        if (mounted) {
          setError(error.message || "Init failed");
          initializingRef.current = false; // ✅ Reset on error
        }
      }
    };

    // ✅ Immediate execution (no timeout needed)
    init();

    return () => {
      mounted = false;
      // Don't cleanup if already cleaned up
      if (
        initializedRef.current &&
        !callEndedRef.current &&
        webrtcServiceRef.current
      ) {
        console.log("🧹 Component unmounting - cleaning up");
        cleanup(false);
      }
    };
  }, [roomId, userInteracted]); // ✅ Only depend on these two

  // ✅ NEW: Diagnostic logging
  // ✅ FIXED: Diagnostic logging with stable dependency
  // ✅ FIXED: Diagnostic logging with stable dependency
  useEffect(() => {
    if (!webrtcServiceRef.current) return;

    const logInterval = setInterval(() => {
      const pc = webrtcServiceRef.current?.getPeerConnection();
      console.log("📊 WebRTC Status Check:", {
        service: !!webrtcServiceRef.current,
        peerConnection: !!pc,
        connectionState: pc?.connectionState,
        signalingState: pc?.signalingState,
        iceConnectionState: pc?.iceConnectionState,
        iceGatheringState: pc?.iceGatheringState,
        transceivers: pc?.getTransceivers().length,
        windowExposed: !!(window as any).peerConnection,
      });
    }, 3000);

    return () => clearInterval(logInterval);
  }, []); // ✅ Empty array - run once after mount

  // ✅ NEW: Ensure window.peerConnection persists
  // ✅ FIXED: Ensure window objects persist - use state instead of ref

  useEffect(() => {
    if (webrtcServiceRef.current && isInitialized) {
      const pc = webrtcServiceRef.current.getPeerConnection();
      if (pc) {
        (window as any).peerConnection = pc;
        (window as any).webrtcService = webrtcServiceRef.current;
        console.log("✅ Window exposure verified:", {
          peerConnection: !!(window as any).peerConnection,
          webrtcService: !!(window as any).webrtcService,
        });
      }
    }
  }, [isInitialized]); // ✅ State triggers re-render// Re-run when initialization completes
  // Audio monitoring
  // ✅ Monitor connection and track states
  useEffect(() => {
    if (connectionStatus !== "connected" || !webrtcServiceRef.current) return;

    const monitor = setInterval(async () => {
      // Check audio element
      const audioEl = remoteAudioRef.current;
      if (audioEl) {
        if (audioEl.paused) {
          console.log("⚠️ Audio paused, resuming...");
          try {
            await audioEl.play();
          } catch (err) {
            console.error("❌ Resume failed:", err);
          }
        }

        console.log("🔊 Audio state:", {
          paused: audioEl.paused,
          volume: audioEl.volume,
          muted: audioEl.muted,
          srcObject: !!audioEl.srcObject,
        });
      }

      // Check AudioContext
      if (audioContextRef.current) {
        if (audioContextRef.current.state === "suspended") {
          console.warn("⚠️ AudioContext suspended, resuming...");
          try {
            await audioContextRef.current.resume();
          } catch (err) {
            console.error("❌ AudioContext resume failed:", err);
          }
        }

        console.log("🎵 AudioContext state:", audioContextRef.current.state);
      }

      // Check video element
      if (remoteVideoRef.current) {
        const video = remoteVideoRef.current;
        console.log("📹 Video state:", {
          paused: video.paused,
          muted: video.muted,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          readyState: video.readyState,
          srcObject: !!video.srcObject,
        });

        if (video.paused && !callEndedRef.current) {
          console.warn("⚠️ Video paused unexpectedly, resuming...");
          video.play().catch(console.error);
        }
      }

      // Check connection stats
      if (webrtcServiceRef.current) {
        await webrtcServiceRef.current.logConnectionStats();
      }
    }, 5000);

    return () => clearInterval(monitor);
  }, [connectionStatus]);
  const initializeCall = async () => {
    try {
      setError(null);
      console.log("\n🎥 ===== INITIALIZING CALL =====");

      if (!user?._id) {
        throw new Error("User not authenticated");
      }

      // ✅ CRITICAL: Ensure socket is initialized FIRST
      if (!isSocketConnected()) {
        console.log("🔌 Socket not connected, initializing...");
        try {
          initializeSocket(user._id);
          // Wait a bit for connection
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (err) {
          console.error("❌ Failed to initialize socket:", err);
        }
      }

      if (typeof window !== "undefined") {
        window.onbeforeunload = () => "Call is connecting...";
      }

      // Wait for socket (rest of the function continues as before...)

      // Wait for socket
      let socket;
      try {
        console.log("🔌 Waiting for socket connection...");
        socket = await waitForSocket(15000);

        if (!socket.connected) {
          throw new Error("Socket failed to connect");
        }

        console.log("✅ Socket connected:", socket.id);
      } catch (err: any) {
        console.error("❌ Socket connection failed:", err.message);
        setError("Failed to connect to server. Please refresh.");
        return;
      }

      // Initialize services
      console.log("🔧 Creating WebRTC service...");
      webrtcServiceRef.current = new WebRTCService();
      console.log("✅ WebRTC service created:", !!webrtcServiceRef.current);

      recordingServiceRef.current = new RecordingService();
      console.log("✅ Recording service created");

      // ✅ Get peer connection (will expose later)
      const pc = webrtcServiceRef.current.getPeerConnection();
      console.log("🔍 Peer connection details:", {
        exists: !!pc,
        state: pc?.connectionState,
        signalingState: pc?.signalingState,
        transceivers: pc?.getTransceivers().length,
      });

      // Get media stream
      console.log("🎤 Acquiring media stream...");
      const stream = await ensureAudioNotMuted();

      if (!stream) {
        throw new Error("Failed to get media stream");
      }

      console.log("✅ Media stream acquired:", {
        id: stream.id,
        audio: stream.getAudioTracks().length,
        video: stream.getVideoTracks().length,
      });

      // Set local stream
      webrtcServiceRef.current.setLocalStream(stream);

      // Attach to local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(console.error);
        console.log("✅ Local video attached");
      }

      // Setup event listeners
      webrtcServiceRef.current.setupEventListeners(
        async (remoteStream: MediaStream) => {
          console.log("\n🎬 ===== REMOTE STREAM RECEIVED =====");

          if (remoteStreamReceivedRef.current) {
            console.log("⚠️ Already processed");
            return;
          }

          remoteStreamReceivedRef.current = true;

          if (!remoteStream || !remoteVideoRef.current) {
            console.error("❌ Missing stream or video element");
            return;
          }

          const audioTracks = remoteStream.getAudioTracks();
          const videoTracks = remoteStream.getVideoTracks();

          console.log(
            `📊 Tracks: audio=${audioTracks.length}, video=${videoTracks.length}`
          );

          if (audioTracks.length === 0 || videoTracks.length === 0) {
            console.error("❌ MISSING TRACKS!");
            setError("Remote stream missing tracks");
            return;
          }

          // Force enable tracks
          remoteStream.getTracks().forEach((track) => {
            track.enabled = true;
            console.log(`✅ Enabled ${track.kind}`);
          });

          await new Promise((resolve) => setTimeout(resolve, 300));

          // Setup video element
          const videoEl = remoteVideoRef.current;

          if (videoEl.srcObject) {
            const oldStream = videoEl.srcObject as MediaStream;
            oldStream.getTracks().forEach((t) => t.stop());
          }

          videoEl.srcObject = remoteStream;
          videoEl.autoplay = true;
          videoEl.playsInline = true;
          videoEl.muted = false;
          videoEl.volume = 1.0;

          console.log("✅ Remote stream attached");

          // Wait for metadata
          await new Promise<void>((resolve) => {
            if (videoEl.readyState >= 2) {
              resolve();
            } else {
              const handler = () => {
                videoEl.removeEventListener("loadedmetadata", handler);
                resolve();
              };
              videoEl.addEventListener("loadedmetadata", handler);
              setTimeout(() => {
                videoEl.removeEventListener("loadedmetadata", handler);
                resolve();
              }, 5000);
            }
          });

          // Play video
          try {
            await videoEl.play();
            console.log("✅ Video playing!");
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

          // Setup audio
          if (audioTracks.length > 0) {
            await setupRemoteAudio(remoteStream);
          }

          console.log("===== SETUP COMPLETE =====\n");
        },
        (candidate: RTCIceCandidate) => {
          const socket = getSocket();
          socket.emit("ice-candidate", roomId, candidate);
        }
      );

      // ✅ Add local stream (ONLY ONCE!)
      console.log("📤 Adding local stream...");
      await webrtcServiceRef.current.addLocalStreamToPeer();
      console.log("✅ Local stream added");

      // ✅ Join room (ONLY ONCE!)
      console.log("🚪 Joining room:", roomId);
      socket.emit("join-room", roomId, user._id);

      // Initiator creates offer
      if (isInitiator) {
        console.log("📝 Waiting for both users...");

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 10000);
          const handleBothReady = () => {
            clearTimeout(timeout);
            socket.off("both-users-ready", handleBothReady);
            resolve();
          };
          socket.on("both-users-ready", handleBothReady);
        });

        const offer = await webrtcServiceRef.current.createOffer();
        socket.emit("offer", roomId, offer);
        console.log("✅ Offer sent");
      }

      // ✅ CRITICAL: Expose EVERYTHING to window at the END
      if (typeof window !== "undefined") {
        const finalPc = webrtcServiceRef.current.getPeerConnection();
        (window as any).peerConnection = finalPc;
        (window as any).webrtcService = webrtcServiceRef.current;

        // ✅ Add debug helper
        (window as any).checkConnection = () => {
          const currentPc = webrtcServiceRef.current?.getPeerConnection();
          return {
            hasService: !!webrtcServiceRef.current,
            hasPeerConnection: !!currentPc,
            connectionState: currentPc?.connectionState,
            signalingState: currentPc?.signalingState,
            iceConnectionState: currentPc?.iceConnectionState,
            iceGatheringState: currentPc?.iceGatheringState,
            transceivers: currentPc?.getTransceivers().length,
            windowPeerConnection: !!(window as any).peerConnection,
            windowWebrtcService: !!(window as any).webrtcService,
          };
        };

        console.log("✅ All window objects exposed");
        console.log("   Run: window.checkConnection()");

        // Verify it was set
        setTimeout(() => {
          console.log("🔍 Verification - window objects:", {
            peerConnection: !!(window as any).peerConnection,
            webrtcService: !!(window as any).webrtcService,
            checkConnection: typeof (window as any).checkConnection,
            pcMatches: (window as any).peerConnection === finalPc,
            serviceMatches:
              (window as any).webrtcService === webrtcServiceRef.current,
          });
        }, 100);
      }
      console.log("===== INITIALIZATION COMPLETE =====\n");
    } catch (error: any) {
      console.error("❌ Initialization failed:", error);
      setError(error.message || "Init failed");
    }
  };
  const cleanup = (emitEvent: boolean = true) => {
    console.log("🧹 Cleanup starting...", {
      emitEvent,
      callEnded: callEndedRef.current,
      hasWebRTC: !!webrtcServiceRef.current,
    });

    // ✅ Prevent double cleanup
    if (!webrtcServiceRef.current) {
      console.log("⚠️ Already cleaned up");
      return;
    }

    // ✅ NEW: Remove navigation blocker
    if (typeof window !== "undefined") {
      window.onbeforeunload = null;
    }

    if (isRecording && recordingServiceRef.current) {
      recordingServiceRef.current.stopRecording();
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      if (remoteAudioRef.current.srcObject) {
        const stream = remoteAudioRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log(`🛑 Stopped ${track.kind} track`);
        });
      }
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.style.display = "none";

      if (callEndedRef.current) {
        remoteAudioRef.current.remove();
        remoteAudioRef.current = null;
      }
    }

    // Close AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Clean local video
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      localVideoRef.current.srcObject = null;
    }

    // Clean remote video
    if (remoteVideoRef.current?.srcObject) {
      const stream = remoteVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      remoteVideoRef.current.srcObject = null;
    }

    // Close WebRTC
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.close();
      webrtcServiceRef.current = null;
    }

    // ✅ Clean up window exposure
    if (typeof window !== "undefined") {
      delete (window as any).peerConnection;
    }

    // Emit end call
    if (emitEvent && !callEndedRef.current) {
      try {
        const socket = getSocket();
        socket.emit("end-call", roomId, { endedBy: user?._id });
      } catch (error) {
        console.error("Socket error:", error);
      }
    }

    // ✅ Reset initialization flags
    initializedRef.current = false;
    initializingRef.current = false;
    remoteStreamReceivedRef.current = false;
    setIsInitialized(false); // ✅ ADD THIS

    console.log("✅ Cleanup complete");
  };

  const toggleAudio = () => {
    if (webrtcServiceRef.current) {
      const newState = !isAudioEnabled;
      webrtcServiceRef.current.toggleAudio(newState);
      setIsAudioEnabled(newState);
      console.log(`🎤 Local audio ${newState ? "enabled" : "disabled"}`);
    }
  };

  const toggleVideo = () => {
    if (webrtcServiceRef.current) {
      const newState = !isVideoEnabled;
      webrtcServiceRef.current.toggleVideo(newState);
      setIsVideoEnabled(newState);
      console.log(`📹 Local video ${newState ? "enabled" : "disabled"}`);
    }
  };

  const toggleScreenShare = async () => {
    try {
      const socket = getSocket();
      if (!isScreenSharing) {
        await webrtcServiceRef.current?.startScreenShare(true);
        socket.emit("start-screen-share", roomId);
        setIsScreenSharing(true);
        console.log("✅ Screen sharing started");
      } else {
        await webrtcServiceRef.current?.stopScreenShare();
        socket.emit("stop-screen-share", roomId);
        setIsScreenSharing(false);
        console.log("✅ Screen sharing stopped");
      }
    } catch (error) {
      console.error("❌ Screen share error:", error);
      setError("Screen sharing failed");
    }
  };

  const startRecording = async () => {
    try {
      const localVideo = localVideoRef.current;
      const remoteVideo = remoteVideoRef.current;
      const localStream = webrtcServiceRef.current?.getLocalStream();
      const remoteStream = webrtcServiceRef.current?.getRemoteStream();

      if (!localVideo || !remoteVideo || !localStream || !remoteStream) {
        setError("Cannot start recording");
        return;
      }

      await recordingServiceRef.current?.startRecording(
        localVideo,
        remoteVideo,
        localStream,
        remoteStream
      );

      setIsRecording(true);
      setRecordingTime(0);

      const socket = getSocket();
      socket.emit("recording-started", roomId, user?._id);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      console.log("✅ Recording started");
    } catch (error: any) {
      console.error("❌ Recording error:", error);
      setError("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (recordingServiceRef.current) {
      recordingServiceRef.current.stopRecording();
    }
    setIsRecording(false);

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }

    try {
      const socket = getSocket();
      socket.emit("recording-stopped", roomId, user?._id);
      console.log("✅ Recording stopped");
    } catch (error) {
      console.error("Error emitting recording-stopped:", error);
    }
  };

  const handleEndCall = async () => {
    if (callEndedRef.current) {
      console.log("⚠️ Call already ended, skipping");
      return;
    }
    console.log("📴 Ending call initiated by local user");
    callEndedRef.current = true;
    isEndingCallRef.current = true;

    try {
      // Stop recording if active
      if (isRecording) {
        stopRecording();
      }

      // Emit end call event
      try {
        const socket = getSocket();
        socket.emit("end-call", roomId, { endedBy: user?._id });
        console.log("📤 Sent end-call signal");
      } catch (error) {
        console.error("Socket emit error:", error);
      }

      // Update call status in backend
      if (callId) {
        await axiosInstance
          .put(`/call/${callId}/status`, {
            status: "ended",
            duration: Math.floor(recordingTime),
          })
          .catch((err) => console.error("Failed to update call status:", err));
      }

      // Cleanup resources
      cleanup(false);

      // Navigate away
      onEndCall();

      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (error) {
      console.error("Error ending call:", error);
      cleanup(false);
      onEndCall();
      router.push("/");
    }
  };
  const handlePlayClick = async () => {
    console.log("🎬 Manual play button clicked");

    try {
      // Step 1: Resume AudioContext first
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
        console.log("✅ AudioContext resumed");
      }

      // Step 2: Resume remote audio element
      if (remoteAudioRef.current) {
        console.log("🔊 Resuming audio element...");
        try {
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1.0;
          await remoteAudioRef.current.play();
          console.log("✅ Audio element playing");
        } catch (audioErr) {
          console.error("❌ Audio play failed:", audioErr);
        }
      }

      // Step 3: Resume video element
      if (remoteVideoRef.current) {
        console.log("📹 Resuming video element...");
        try {
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.volume = 1.0;
          await remoteVideoRef.current.play();
          console.log("✅ Video element playing");
          setConnectionStatus("connected");
          setError(null);
          setShowPlayButton(false);
        } catch (videoErr) {
          console.error("❌ Video play failed:", videoErr);
          setError("⚠️ Playback failed - try again");
        }
      }
    } catch (err) {
      console.error("❌ Manual play failed:", err);
      setError("⚠️ Could not start playback");
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        console.log("✅ Entered fullscreen");
      } else {
        await document.exitFullscreen();
        console.log("✅ Exited fullscreen");
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // ✅ Show loading during initialization
  if (!userInteracted) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <Video className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-white text-3xl font-bold mb-2">
              Ready to join?
            </h1>
            <p className="text-gray-400 text-lg">Tap to start your call</p>
          </div>
          <button
            onClick={async () => {
              console.log("🎬 START CALL BUTTON CLICKED");
              console.log("   Current state:", {
                userInteracted,
                roomId,
                user: !!user,
                userId: user?._id,
              });

              // Test socket first
              try {
                const testResponse = await fetch(
                  "https://youtube-clone-project-q3pd.onrender.com/health"
                );
                const health = await testResponse.json();
                console.log("✅ Backend health:", health);
              } catch (e) {
                console.error("❌ Backend unreachable:", e);
                alert(
                  "Backend server is not responding. Please wait a moment and try again."
                );
                return;
              }

              setUserInteracted(true);

              // ✅ CRITICAL: Force re-render after state update
              setTimeout(() => {
                console.log("🔄 Checking initialization...");
                console.log("   webrtcServiceRef:", !!webrtcServiceRef.current);
                console.log("   localVideoRef:", !!localVideoRef.current);
                console.log("   remoteVideoRef:", !!remoteVideoRef.current);
              }, 100);
            }}
            className="px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-lg shadow-2xl transition-all transform hover:scale-105 active:scale-95"
          >
            🎥 START CALL
          </button>
        </div>
      </div>
    );
  }

  // ✅ Show initializing screen AFTER user clicks start
  if (userInteracted && !webrtcServiceRef.current) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-white text-2xl font-bold mb-2">
            Initializing Call...
          </h1>
          <p className="text-gray-400">Setting up audio and video</p>

          {/* Debug info */}
          <div className="mt-4 text-xs text-gray-500">
            <p>userInteracted: {String(userInteracted)}</p>
            <p>webrtcService: {String(!!webrtcServiceRef.current)}</p>
            <p>initializing: {String(initializingRef.current)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden touch-none">
      {/* Remote Video (Main) - FIXED */}
      <video
        ref={remoteVideoRef}
        id="remote-video"
        autoPlay
        playsInline
        muted={false} // ✅ Must be false for audio
        className="w-full h-full object-cover absolute inset-0"
        style={{
          backgroundColor: "#000",
          objectFit: "cover",
        }}
        onLoadedMetadata={async (e) => {
          console.log("✅ Remote video metadata loaded");
          try {
            await e.currentTarget.play();
            console.log("✅ Remote video playing");
          } catch (err) {
            console.error("❌ Autoplay blocked:", err);
            setShowPlayButton(true);
          }
        }}
      />
      {/* Connecting Overlay */}
      {connectionStatus === "connecting" && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10">
          <div className="text-center px-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-base sm:text-xl">
              Connecting to {remotePeerName}...
            </p>
          </div>
        </div>
      )}
      {/* Local Video (PiP) - FIXED */}
      <div className="absolute bottom-24 sm:bottom-28 right-2 sm:right-6 w-32 h-24 xs:w-40 xs:h-30 sm:w-64 sm:h-48 rounded-lg sm:rounded-xl overflow-hidden border-2 sm:border-4 border-white shadow-2xl bg-black z-20">
        <video
          ref={localVideoRef}
          id="local-video"
          autoPlay
          playsInline
          muted // ✅ Local always muted (no {true})
          className="w-full h-full object-cover"
          onLoadedMetadata={(e) => {
            console.log("✅ Local video metadata loaded");
            e.currentTarget.play().catch(console.error);
          }}
          onError={(e) => {
            console.error("❌ Local video error:", e.currentTarget.error);
          }}
        />
        {!isVideoEnabled && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <VideoOff className="w-6 h-6 sm:w-12 sm:h-12 text-gray-400" />
          </div>
        )}
      </div>
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent p-3 sm:p-6 z-10 safe-area-top">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-lg sm:text-2xl md:text-3xl font-bold truncate">
              {remotePeerName}
            </h2>
            <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 flex-wrap">
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  connectionStatus === "connected"
                    ? "bg-green-500"
                    : connectionStatus === "connecting"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
                }`}
              />
              <p className="text-gray-300 text-xs sm:text-sm capitalize">
                {connectionStatus}
              </p>
            </div>
          </div>

          {/* Recording Indicator */}
          {isRecording && (
            <div className="flex items-center gap-1.5 sm:gap-3 bg-red-600/90 px-2.5 py-1.5 sm:px-6 sm:py-3 rounded-full animate-pulse flex-shrink-0">
              <Circle className="w-2.5 h-2.5 sm:w-4 sm:h-4 fill-white text-white" />
              <span className="text-white text-xs sm:text-lg font-bold">
                {formatTime(recordingTime)}
              </span>
            </div>
          )}
        </div>
      </div>
      {/* Play Button Overlay */}
      {showPlayButton && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50">
          <button
            onClick={handlePlayClick}
            className="p-8 sm:p-12 rounded-full bg-green-600 hover:bg-green-700 transition-all shadow-2xl transform hover:scale-110 active:scale-95"
          >
            <Play
              className="w-12 h-12 sm:w-16 sm:h-16 text-white"
              fill="currentColor"
            />
          </button>
        </div>
      )}
      {/* Error Banner */}
      {error && !showPlayButton && (
        <div className="absolute top-14 sm:top-24 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-red-600/95 text-white px-3 py-2 sm:px-6 sm:py-4 rounded-lg z-30 sm:max-w-md text-center shadow-2xl text-xs sm:text-base">
          <p className="font-semibold">{error}</p>
        </div>
      )}
      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent px-2 py-3 sm:p-8 z-20 safe-area-bottom">
        <div className="flex items-center justify-center gap-1.5 xs:gap-2 sm:gap-3 md:gap-4">
          {/* Audio Toggle */}
          <button
            onClick={toggleAudio}
            className={`p-2.5 xs:p-3 sm:p-4 md:p-5 rounded-full transition-all shadow-lg touch-manipulation ${
              isAudioEnabled
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isAudioEnabled ? (
              <Mic className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
            ) : (
              <MicOff className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
            )}
          </button>

          {/* Video Toggle */}
          <button
            onClick={toggleVideo}
            className={`p-2.5 xs:p-3 sm:p-4 md:p-5 rounded-full transition-all shadow-lg touch-manipulation ${
              isVideoEnabled
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isVideoEnabled ? (
              <Video className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
            ) : (
              <VideoOff className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
            )}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`p-2.5 xs:p-3 sm:p-4 md:p-5 rounded-full transition-all shadow-lg touch-manipulation ${
              isScreenSharing
                ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400/50"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <MonitorUp className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
          </button>

          {/* Recording */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={connectionStatus !== "connected"}
            className={`p-2.5 xs:p-3 sm:p-4 md:p-5 rounded-full transition-all shadow-lg disabled:opacity-50 touch-manipulation ${
              isRecording
                ? "bg-red-600 hover:bg-red-700 ring-2 ring-red-400/50"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <Circle
              className={`w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white ${
                isRecording ? "fill-white" : ""
              }`}
            />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 xs:p-3 sm:p-4 md:p-5 rounded-full bg-gray-700 hover:bg-gray-600 transition-all shadow-lg touch-manipulation"
          >
            <Maximize className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            disabled={isEndingCallRef.current}
            className="p-3 xs:p-3.5 sm:p-5 md:p-6 rounded-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 transition-all shadow-xl ml-1 sm:ml-4 touch-manipulation"
          >
            <PhoneOff className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
