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
import { getSocket, waitForSocket } from "@/lib/socket";
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

  if (track.readyState !== "live" || track.muted || !track.enabled) {
    console.warn("⚠️ Audio track not ready");
    return false;
  }

  try {
    const AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContext();
    const stream = new MediaStream([track]);
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    return new Promise((resolve) => {
      let maxLevel = 0;
      let checks = 0;

      const checkLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        maxLevel = Math.max(maxLevel, avg);
        checks++;

        if (checks >= 5) {
          audioContext.close();
          const isWorking = maxLevel > 0.5;
          console.log(
            `🎤 Audio verification: ${
              isWorking ? "✅ PASS" : "❌ FAIL"
            } (max: ${maxLevel.toFixed(2)})`
          );
          resolve(isWorking);
        } else {
          setTimeout(checkLevel, 200);
        }
      };

      checkLevel();
    });
  } catch (err) {
    console.error("❌ Audio verification failed:", err);
    return true;
  }
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
  const setupRemoteAudio = async (stream: MediaStream) => {
    console.log("🔊 Setting up remote audio (FIXED)");

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn("⚠️ No audio tracks");
      return;
    }

    // Remove old audio element
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
    }

    // Create new persistent audio element
    const audioEl = document.createElement("audio");
    audioEl.id = "remote-audio-persistent";
    audioEl.autoplay = true;
    audioEl.setAttribute("playsinline", "true");
    audioEl.muted = false;
    audioEl.volume = 1.0;
    audioEl.style.display = "none"; // ✅ CRITICAL: Hide from UI

    // ✅ CRITICAL: Create isolated audio stream
    const audioStream = new MediaStream(audioTracks);
    audioEl.srcObject = audioStream;

    // Store reference
    remoteAudioRef.current = audioEl;
    document.body.appendChild(audioEl);
    // ✅ Handle audio events
    audioEl.oncanplay = () => console.log("✅ Audio can play");
    audioEl.onplay = () => console.log("✅ Audio PLAYING");
    audioEl.onpause = () => {
      console.warn("⚠️ Audio paused");
      audioEl.play().catch(console.error);
    };
    audioEl.onerror = (e) => console.error("❌ Audio error:", e);

    // ✅ Attempt to play
    // Try to play
    try {
      await audioEl.play();
      console.log("✅ Remote audio started");
    } catch (err: any) {
      console.error("❌ Audio play failed:", err.name);
      if (err.name === "NotAllowedError") {
        setShowPlayButton(true);
        setError("🔊 Tap play to enable audio");
      }
    }

    try {
      const AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;

      if (AudioContext) {
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }

        audioContextRef.current = new AudioContext();
        const source =
          audioContextRef.current.createMediaStreamSource(audioStream);
        const analyser = audioContextRef.current.createAnalyser();

        source.connect(analyser);
        analyser.connect(audioContextRef.current.destination);

        console.log("✅ AudioContext connected");
      }
    } catch (err) {
      console.warn("⚠️ AudioContext setup failed:", err);
    }
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

    const resumeAudioContext = () => {
      const AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;

      if (AudioContext) {
        const ctx = new AudioContext();
        if (ctx.state === "suspended") {
          ctx.resume().then(() => {
            console.log("✅ AudioContext resumed");
            ctx.close();
          });
        } else {
          ctx.close();
        }
      }
    };

    const timer = setTimeout(resumeAudioContext, 1000);
    return () => clearTimeout(timer);
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

  // Main initialization
  useEffect(() => {
    console.log("🔄 Mount effect, roomId:", roomId);

    if (!roomId) {
      setError("Invalid room ID");
      return;
    }

    if (!userInteracted) {
      console.log("⏳ Waiting for user interaction...");
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
        console.log("🎬 Initializing call...");
        await initializeCall();

        if (mounted) {
          initializedRef.current = true;
          console.log("✅ Initialization complete");
        }
      } catch (error: any) {
        console.error("❌ Init error:", error);
        if (mounted) {
          setError(error.message || "Init failed");
        }
      } finally {
        initializingRef.current = false;
      }
    };

    const timer = setTimeout(init, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (initializedRef.current && !callEndedRef.current) {
        cleanup(false);
      }
    };
  }, [roomId, userInteracted]);

  // Audio monitoring
  useEffect(() => {
    if (connectionStatus !== "connected" || !webrtcServiceRef.current) return;

    const monitor = setInterval(async () => {
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
      }

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

      // Resume AudioContext
      try {
        const AudioContext =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const tempCtx = new AudioContext();
          if (tempCtx.state === "suspended") {
            await tempCtx.resume();
            console.log("✅ AudioContext resumed");
          }
          tempCtx.close();
        }
      } catch (err) {
        console.warn("⚠️ AudioContext resume failed:", err);
      }

      // Wait for socket
      let socket;
      try {
        socket = await waitForSocket(15000);
        console.log("✅ Socket ready:", socket.id);
      } catch (err) {
        setError("Connection failed");
        return;
      }

      // Initialize services
      webrtcServiceRef.current = new WebRTCService();
      recordingServiceRef.current = new RecordingService();

      const pc = webrtcServiceRef.current?.getPeerConnection();
      if (pc) {
        (window as any).peerConnection = pc;
        console.log("✅ PeerConnection exposed");
      }

      // Get media
      let localStream: MediaStream;
      try {
        console.log("🎤 Requesting media...");
        localStream = await ensureAudioNotMuted();

        const audioTrack = localStream.getAudioTracks()[0];
        const videoTrack = localStream.getVideoTracks()[0];

        if (!audioTrack) {
          throw new Error("No audio track!");
        }

        console.log("🎤 Audio:", audioTrack.label);
        console.log("📹 Video:", videoTrack.label);

        localStream.getTracks().forEach((track) => {
          track.enabled = true;
        });

        webrtcServiceRef.current.setLocalStream(localStream);
      } catch (error: any) {
        console.error("❌ Media access failed:", error);
        setError(error.message || "Camera/mic failed");
        return;
      }

      // Set local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.muted = true;

        try {
          await localVideoRef.current.play();
          console.log("✅ Local video playing");
        } catch (e) {
          console.warn("⚠️ Local autoplay blocked");
        }
      }

      // Setup remote stream listener
      webrtcServiceRef.current.setupEventListeners(
        async (remoteStream: MediaStream) => {
          console.log("\n🎬 Remote stream callback fired");

          if (remoteStreamReceivedRef.current) {
            console.log("⚠️ Already processed");
            return;
          }
          remoteStreamReceivedRef.current = true;

          if (!remoteStream || !remoteVideoRef.current) {
            console.error("❌ Missing stream/element");
            return;
          }

          const audioTracks = remoteStream.getAudioTracks();
          const videoTracks = remoteStream.getVideoTracks();

          console.log(
            `📊 Remote: audio=${audioTracks.length}, video=${videoTracks.length}`
          );

          // Force enable
          remoteStream.getTracks().forEach((t) => {
            t.enabled = true;
          });

          await new Promise((resolve) => setTimeout(resolve, 200));

          // Set video
          console.log("📺 Setting video srcObject...");
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.autoplay = true;
          remoteVideoRef.current.playsInline = true;
          remoteVideoRef.current.muted = false; // ✅ NOT MUTED
          remoteVideoRef.current.volume = 1.0; // ✅ FULL VOLUME
          remoteVideoRef.current.load();

          // Wait for metadata
          await new Promise<void>((resolve) => {
            if (remoteVideoRef.current!.readyState >= 2) {
              resolve();
            } else {
              remoteVideoRef.current!.onloadedmetadata = () => resolve();
              setTimeout(resolve, 3000);
            }
          });

          // Play video
          try {
            await remoteVideoRef.current.play();
            console.log("✅ Video playing!");
            setConnectionStatus("connected");
            setShowPlayButton(false);
            setError(null);
          } catch (err: any) {
            console.error("❌ Autoplay blocked:", err.name);
            setShowPlayButton(true);
            setError("🔊 Tap play");
          }

          // Setup audio separately
          if (audioTracks.length > 0) {
            await setupRemoteAudio(remoteStream);
          }

          console.log("✅ Remote stream setup complete\n");
        },
        (candidate: RTCIceCandidate) => {
          const socket = getSocket();
          socket.emit("ice-candidate", roomId, candidate);
        }
      );

      // Add local stream
      webrtcServiceRef.current.addLocalStreamToPeer();

      // Join room
      socket.emit("join-room", roomId, user?._id || socket.id);

      // Initiator flow
      if (isInitiator) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 10000);

          const handleBothReady = () => {
            clearTimeout(timeout);
            socket.off("both-users-ready", handleBothReady);
            resolve();
          };

          socket.on("both-users-ready", handleBothReady);
        });

        try {
          const offer = await webrtcServiceRef.current.createOffer();
          socket.emit("offer", roomId, offer);
          console.log("📤 Offer sent");
        } catch (error) {
          console.error("❌ Offer error:", error);
        }
      }

      console.log("===== INIT COMPLETE =====\n");
    } catch (error: any) {
      console.error("❌ Init error:", error);
      setError(error.message || "Init failed");
    }
  };

  const cleanup = (emitEvent: boolean = true) => {
    console.log("🧹 Cleanup...");

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }

    if (isRecording && recordingServiceRef.current) {
      recordingServiceRef.current.stopRecording();
    }

    // Clean remote audio
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      if (remoteAudioRef.current.srcObject) {
        const stream = remoteAudioRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
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

    delete (window as any).peerConnection;

    // Emit end call
    if (emitEvent) {
      try {
        const socket = getSocket();
        socket.emit("end-call", roomId, { endedBy: user?._id });
      } catch (error) {
        console.error("Socket error:", error);
      }
    }

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
    console.log("🎬 Manual play button clicked (FIXED)");

    try {
      // Step 1: Resume remote audio element
      if (remoteAudioRef.current) {
        console.log("🔊 Attempting audio play...");
        try {
          await remoteAudioRef.current.play();
          console.log("✅ Audio resumed");
        } catch (err) {
          console.error("❌ Audio play failed:", err);
        }
      } else {
        console.warn("⚠️ Audio element not found");
      }

      // Step 2: Resume video element
      if (remoteVideoRef.current) {
        console.log("📹 Attempting video play...");
        try {
          await remoteVideoRef.current.play();
          console.log("✅ Video resumed");
          setConnectionStatus("connected");
          setError(null);
          setShowPlayButton(false);
        } catch (err) {
          console.error("❌ Video play failed:", err);
          setError("⚠️ Playback failed - please try again");
        }
      }

      // Step 3: Resume AudioContext if needed
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
        console.log("✅ AudioContext resumed");
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
  // ✅ Show initial interaction prompt
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
            <p className="text-gray-400 text-lg">
              Tap the button below to start your call
            </p>
          </div>
          <button
            onClick={async () => {
              console.log("🎬 START CALL BUTTON CLICKED");
              setUserInteracted(true);

              // Force immediate initialization
              setTimeout(async () => {
                if (!initializingRef.current && !initializedRef.current) {
                  console.log("🚀 FORCING CALL INITIALIZATION");
                  try {
                    await initializeCall();
                    initializedRef.current = true;
                  } catch (error) {
                    console.error("❌ Forced init error:", error);
                  }
                }
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
  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden touch-none">
      {/* Remote Video (Main) - FIXED */}
      <video
        ref={remoteVideoRef}
        id="remote-video"
        autoPlay
        playsInline
        muted={false} // Video element handles video
        className="w-full h-full object-cover absolute inset-0"
        style={{
          backgroundColor: "#000",
          objectFit: "cover",
        }}
        // ✅ CRITICAL: Wait for metadata before attempting play
        onLoadedMetadata={async (e) => {
          console.log("✅ Video metadata loaded");
          console.log("   Duration:", e.currentTarget.duration);
          console.log("   Video width:", e.currentTarget.videoWidth);
          console.log("   Video height:", e.currentTarget.videoHeight);

          // Verify video dimensions
          if (
            e.currentTarget.videoWidth === 0 ||
            e.currentTarget.videoHeight === 0
          ) {
            console.error("❌ Invalid video dimensions!");
            return;
          }

          // ✅ Wait a moment for stream to stabilize
          await new Promise((resolve) => setTimeout(resolve, 300));

          try {
            await e.currentTarget.play();
            console.log("✅ Video playing after metadata");
            setConnectionStatus("connected");
            setShowPlayButton(false);
            setError(null);
          } catch (err: any) {
            console.warn("⚠️ Autoplay blocked:", err.name);
            setShowPlayButton(true);
            setError("🔊 Tap play button to start");
          }
        }}
        // ✅ Additional safety: canplay event
        onCanPlay={async (e) => {
          console.log("✅ Video can play (buffered)");

          if (e.currentTarget.paused) {
            try {
              await e.currentTarget.play();
              console.log("✅ Video resumed from canplay");
            } catch (err) {
              console.warn("⚠️ Play from canplay blocked");
              setShowPlayButton(true);
            }
          }
        }}
        // ✅ Track successful play
        onPlay={() => {
          console.log("✅ Video PLAYING");
          setConnectionStatus("connected");
          setError(null);
          setShowPlayButton(false);
        }}
        // ✅ CRITICAL: Auto-resume if paused unexpectedly
        onPause={(e) => {
          console.warn("⚠️ Video PAUSED unexpectedly");

          // Don't resume if user explicitly ended call
          if (!callEndedRef.current) {
            console.log("🔄 Attempting auto-resume");
            e.currentTarget.play().catch((err) => {
              console.error("❌ Auto-resume failed:", err);
              setShowPlayButton(true);
            });
          }
        }}
        // ✅ Handle waiting state
        onWaiting={() => {
          console.log("⏳ Video buffering...");
        }}
        onPlaying={() => {
          console.log("▶️ Video resumed playing");
        }}
        // ✅ Handle stalled state
        onStalled={() => {
          console.warn("⚠️ Video stream stalled");
        }}
        // ✅ Track errors
        onError={(e) => {
          const videoEl = e.currentTarget;
          console.error("❌ Video error:", {
            code: videoEl.error?.code,
            message: videoEl.error?.message,
            readyState: videoEl.readyState,
            networkState: videoEl.networkState,
          });

          setError("Video playback error");
          setShowPlayButton(true);

          // Attempt recovery
          if (remoteVideoRef.current?.srcObject) {
            console.log("🔄 Attempting video recovery...");
            const stream = remoteVideoRef.current.srcObject;
            remoteVideoRef.current.srcObject = null;

            setTimeout(() => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = stream;
                remoteVideoRef.current.play().catch(console.error);
              }
            }, 500);
          }
        }}
        // ✅ Track ready state changes
        onLoadedData={() => {
          console.log("✅ Video data loaded");
        }}
        onSuspend={() => {
          console.log("⏸️ Video suspended");
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
          autoPlay
          playsInline
          muted={true} // Local video always muted to prevent echo
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
