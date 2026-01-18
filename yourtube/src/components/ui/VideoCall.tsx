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
  Minimize,
  Play,
  Settings,
  Users,
  Shield,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
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
  theme?: "light" | "dark";
}

// ✅ Audio verification helper
const verifyAudioTrack = async (track: MediaStreamTrack): Promise<boolean> => {
  console.log("🎤 Verifying audio track:", {
    readyState: track.readyState,
    muted: track.muted,
    enabled: track.enabled,
    label: track.label,
  });

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

  const settings = track.getSettings();
  console.log("🎤 Audio settings:", {
    sampleRate: settings.sampleRate,
    channelCount: settings.channelCount,
  });

  console.log("✅ Audio track verified");
  return true;
};

// ✅ CRITICAL: Windows Audio Fix - Ensures microphone is not muted
const ensureAudioNotMuted = async (): Promise<MediaStream> => {
  console.log("🔧 Starting media acquisition with Windows audio fix...");

  // Stop any existing streams first
  try {
    if (typeof window !== "undefined") {
      const existingTracks = (window as any).__mediaStreamTracks;
      if (existingTracks && Array.isArray(existingTracks)) {
        existingTracks.forEach((track: MediaStreamTrack) => {
          try {
            track.stop();
            console.log(`🛑 Stopped existing ${track.kind} track`);
          } catch (e) {
            // Ignore errors
          }
        });
      }
    }
  } catch (e) {
    console.warn("⚠️ Could not check existing streams:", e);
  }

  try {
    // Request permissions first
    const permStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    permStream.getTracks().forEach((t) => t.stop());
    console.log("✅ Permissions granted");

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Enumerate devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === "audioinput");
    const videoInputs = devices.filter((d) => d.kind === "videoinput");

    console.log(`📹 Found ${videoInputs.length} cameras`);
    console.log(`🎤 Found ${audioInputs.length} microphones`);

    if (audioInputs.length === 0) {
      throw new Error("No microphone found");
    }

    console.log(
      "   Available audio inputs:",
      audioInputs.map((d) => d.label || d.deviceId),
    );

    // 🔥 TRY DEFAULT DEVICE FIRST (respects Windows settings)
    const defaultDevice = audioInputs.find(
      (d) =>
        d.deviceId === "default" || d.label.toLowerCase().includes("default"),
    );

    if (defaultDevice) {
      console.log("🎯 Trying Windows default device:", defaultDevice.label);

      try {
        const testStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: defaultDevice.deviceId },
            echoCancellation: { exact: true },
            noiseSuppression: { exact: true },
            autoGainControl: { exact: true },
            sampleRate: { ideal: 48000 },
            channelCount: { ideal: 1 },
            googEchoCancellation: true,
            googAutoGainControl: true,
            googNoiseSuppression: true,
            googHighpassFilter: true,
            googTypingNoiseDetection: true,
            googAudioMirroring: false,
          } as any,
          video: false,
        });

        const audioTrack = testStream.getAudioTracks()[0];

        if (!audioTrack.muted && (await verifyAudioTrack(audioTrack))) {
          console.log("✅ Default device works! Using:", defaultDevice.label);
          audioTrack.stop();

          // Get full stream with video
          const fullStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: { exact: defaultDevice.deviceId },
              echoCancellation: { exact: true },
              noiseSuppression: { exact: true },
              autoGainControl: { exact: true },
              sampleRate: { ideal: 48000 },
              channelCount: { ideal: 1 },
              googEchoCancellation: true,
              googAutoGainControl: true,
              googNoiseSuppression: true,
              googHighpassFilter: true,
              googTypingNoiseDetection: true,
              googAudioMirroring: false,
            } as any,
            video:
              videoInputs.length > 0
                ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 },
                  }
                : false,
          });

          // Save tracks globally for cleanup
          if (typeof window !== "undefined") {
            (window as any).__mediaStreamTracks = fullStream.getTracks();
          }

          return fullStream;
        }

        audioTrack.stop();
      } catch (err) {
        console.warn("⚠️ Default device failed, trying others...");
      }
    }

    // 🔥 FALLBACK: Test each device for audio production
    for (let i = 0; i < audioInputs.length; i++) {
      const device = audioInputs[i];

      // Skip 'default' device (already tried)
      if (device.deviceId === "default") continue;

      console.log(
        `   Testing device ${i + 1}/${audioInputs.length}: ${device.label}`,
      );

      try {
        const testStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: device.deviceId ? { exact: device.deviceId } : undefined,
            echoCancellation: { exact: true },
            noiseSuppression: { exact: true },
            autoGainControl: { exact: true },
            sampleRate: { ideal: 48000 },
            channelCount: { ideal: 1 },
            googEchoCancellation: true,
            googAutoGainControl: true,
            googNoiseSuppression: true,
            googHighpassFilter: true,
            googTypingNoiseDetection: true,
            googAudioMirroring: false,
          } as any,
          video: false,
        });

        const audioTrack = testStream.getAudioTracks()[0];

        if (audioTrack.muted) {
          console.warn(`   ❌ Device ${i + 1} is MUTED`);
          audioTrack.stop();
          continue;
        }

        // Test if device produces audio
        const isProducingAudio = await new Promise<boolean>((resolve) => {
          try {
            const AudioContext =
              (window as any).AudioContext ||
              (window as any).webkitAudioContext;
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(testStream);
            const analyser = audioContext.createAnalyser();
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            let checks = 0;

            const check = () => {
              analyser.getByteFrequencyData(dataArray);
              const average =
                dataArray.reduce((a, b) => a + b) / dataArray.length;
              checks++;

              if (average > 0) {
                console.log(`   ✅ Device ${i + 1} producing audio!`);
                audioContext.close();
                resolve(true);
              } else if (checks < 3) {
                setTimeout(check, 300);
              } else {
                audioContext.close();
                resolve(false);
              }
            };

            setTimeout(check, 100);
          } catch (err) {
            resolve(false);
          }
        });

        if (!isProducingAudio) {
          console.warn(`   ❌ Device ${i + 1} not producing audio`);
          audioTrack.stop();
          continue;
        }

        console.log(`   ✅ Found working device: ${device.label}`);
        audioTrack.stop();

        const fullStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: device.deviceId ? { exact: device.deviceId } : undefined,
            echoCancellation: { exact: true },
            noiseSuppression: { exact: true },
            autoGainControl: { exact: true },
            sampleRate: { ideal: 48000 },
            channelCount: { ideal: 1 },
            googEchoCancellation: true,
            googAutoGainControl: true,
            googNoiseSuppression: true,
            googHighpassFilter: true,
            googTypingNoiseDetection: true,
            googAudioMirroring: false,
          } as any,
          video:
            videoInputs.length > 0
              ? {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  frameRate: { ideal: 30 },
                }
              : false,
        });

        // Force enable all tracks
        fullStream.getTracks().forEach((t) => (t.enabled = true));

        // Save tracks globally for cleanup
        if (typeof window !== "undefined") {
          (window as any).__mediaStreamTracks = fullStream.getTracks();
        }

        console.log("✅ Media acquisition complete");
        return fullStream;
      } catch (err: any) {
        console.error(`   ❌ Device ${i + 1} error:`, err.message);
        continue;
      }
    }

    throw new Error("No working microphone found");
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

// ✅ Global debug helper
if (typeof window !== "undefined") {
  (window as any).debugCall = {
    checkRefs: () => {
      console.log("🔍 Current Refs Status:");
      console.log(
        "   window.debugVideoCall exists:",
        !!(window as any).debugVideoCall,
      );
      console.log(
        "   window.peerConnection exists:",
        !!(window as any).peerConnection,
      );
      console.log(
        "   window.webrtcService exists:",
        !!(window as any).webrtcService,
      );
    },

    waitForDebug: () => {
      console.log("⏳ Waiting for VideoCall to initialize...");
      let checkCount = 0;
      const checkInterval = setInterval(() => {
        checkCount++;
        console.log(`   Checking ${checkCount}...`);

        if ((window as any).debugVideoCall) {
          clearInterval(checkInterval);
          console.log("✅ Debug commands ready!");
          console.log("   Run: window.debugVideoCall.fullDiagnostic()");
        }
      }, 500);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (!(window as any).debugVideoCall) {
          console.error(
            "❌ Debug commands never initialized - component may not have mounted",
          );
          console.log("   Try clicking 'START CALL' button first");
        }
      }, 10000);
    },
  };

  console.log("✅ window.debugCall created globally");
}

const VideoCall = ({
  roomId,
  isInitiator,
  onEndCall,
  remotePeerName = "Remote User",
  callId = "",
  theme = "dark",
}: VideoCallProps) => {
  const router = useRouter();
  const { user } = useUser();

  // Logging
  console.log("🎬 ===== VideoCall RENDER =====");
  console.log("   Time:", new Date().toISOString());
  console.log("   roomId:", roomId);
  console.log("   isInitiator:", isInitiator);
  console.log("   user:", user?._id);
  console.log("===============================\n");

  // State
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
  const [initError, setInitError] = useState<string | null>(null);
  const [initStep, setInitStep] = useState<string>("idle");
  const [remoteAudioStatus, setRemoteAudioStatus] = useState<string>("waiting");
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [networkQuality, setNetworkQuality] = useState<
    "excellent" | "good" | "poor" | "disconnected"
  >("good");

  // Refs
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
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callDurationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Add this state near other states:
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

  // Theme colors
  const themeColors = {
    dark: {
      bg: "bg-gradient-to-br from-gray-950 via-gray-900 to-black",
      overlay: "bg-black/60",
      glass: "bg-white/5 backdrop-blur-2xl border border-white/10",
      glassHover: "hover:bg-white/10",
      text: "text-white",
      textMuted: "text-gray-400",
      textSubtle: "text-gray-500",
      accent: "from-violet-600 via-purple-600 to-indigo-600",
      accentSolid: "bg-violet-600",
      danger: "from-rose-600 to-red-600",
      success: "from-emerald-500 to-green-500",
      warning: "from-amber-500 to-orange-500",
      buttonBg: "bg-white/10 hover:bg-white/20",
      buttonActive: "bg-violet-600 hover:bg-violet-700",
      buttonDanger:
        "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700",
      shadow: "shadow-2xl shadow-black/50",
      ring: "ring-white/20",
    },
    light: {
      bg: "bg-gradient-to-br from-slate-100 via-gray-50 to-white",
      overlay: "bg-white/80",
      glass: "bg-black/5 backdrop-blur-2xl border border-black/10",
      glassHover: "hover:bg-black/10",
      text: "text-gray-900",
      textMuted: "text-gray-600",
      textSubtle: "text-gray-400",
      accent: "from-violet-600 via-purple-600 to-indigo-600",
      accentSolid: "bg-violet-600",
      danger: "from-rose-600 to-red-600",
      success: "from-emerald-500 to-green-500",
      warning: "from-amber-500 to-orange-500",
      buttonBg: "bg-black/10 hover:bg-black/20",
      buttonActive: "bg-violet-600 hover:bg-violet-700",
      buttonDanger:
        "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700",
      shadow: "shadow-2xl shadow-gray-300/50",
      ring: "ring-black/10",
    },
  };

  const colors = themeColors[theme];

  // ✅ Call duration timer
  useEffect(() => {
    if (connectionStatus === "connected") {
      callDurationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (callDurationIntervalRef.current) {
        clearInterval(callDurationIntervalRef.current);
      }
    };
  }, [connectionStatus]);

  // ✅ Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (connectionStatus === "connected") {
          setShowControls(false);
        }
      }, 4000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [connectionStatus]);

  // ✅ Force audio context resume on user interaction
  const ensureAudioContextResumed = async () => {
    if (!audioContextRef.current) return;

    if (audioContextRef.current.state === "suspended") {
      try {
        await audioContextRef.current.resume();
        console.log("✅ AudioContext resumed");
      } catch (err) {
        console.error("❌ Failed to resume AudioContext:", err);
      }
    }
  };

  // ✅ Setup debug commands
  useEffect(() => {
    if (typeof window === "undefined") return;

    const createDebugCommands = () => {
      (window as any).debugVideoCall = {
        checkService: () => {
          console.log("🔍 ===== WebRTC Service Status =====");
          console.log("   Service exists:", !!webrtcServiceRef.current);

          if (webrtcServiceRef.current) {
            const pc = webrtcServiceRef.current.getPeerConnection();
            console.log("   Peer connection exists:", !!pc);
            if (pc) {
              console.log("   Connection state:", pc.connectionState);
              console.log("   ICE state:", pc.iceConnectionState);
              console.log("   Signaling state:", pc.signalingState);
              console.log("   ICE gathering state:", pc.iceGatheringState);
            }
          } else {
            console.log("   ❌ WebRTC service not initialized");
          }
          console.log("=====================================\n");
        },

        checkLocalStream: () => {
          console.log("🔍 ===== Local Stream Status =====");
          const localStream = webrtcServiceRef.current?.getLocalStream();
          console.log("   Stream exists:", !!localStream);

          if (localStream) {
            console.log("   Stream ID:", localStream.id);
            console.log("   Active:", localStream.active);
            console.log(
              "   Audio tracks:",
              localStream.getAudioTracks().length,
            );
            console.log(
              "   Video tracks:",
              localStream.getVideoTracks().length,
            );

            localStream.getTracks().forEach((track, i) => {
              console.log(`\n   Track ${i} (${track.kind}):`);
              console.log("      Label:", track.label);
              console.log("      Enabled:", track.enabled);
              console.log("      Muted:", track.muted);
              console.log("      ReadyState:", track.readyState);
            });
          } else {
            console.log("   ❌ No local stream");
          }

          console.log(
            "\n   Video element srcObject:",
            !!localVideoRef.current?.srcObject,
          );
          console.log(
            "   Video element paused:",
            localVideoRef.current?.paused,
          );
          console.log("==================================\n");
        },

        checkRemoteStream: () => {
          console.log("🔍 ===== Remote Stream Status =====");
          const remoteStream = webrtcServiceRef.current?.getRemoteStream();
          console.log("   Stream exists:", !!remoteStream);

          if (remoteStream) {
            console.log("   Stream ID:", remoteStream.id);
            console.log("   Active:", remoteStream.active);
            console.log(
              "   Audio tracks:",
              remoteStream.getAudioTracks().length,
            );
            console.log(
              "   Video tracks:",
              remoteStream.getVideoTracks().length,
            );

            remoteStream.getTracks().forEach((track, i) => {
              console.log(`\n   Track ${i} (${track.kind}):`);
              console.log("      Label:", track.label);
              console.log("      Enabled:", track.enabled);
              console.log("      Muted:", track.muted);
              console.log("      ReadyState:", track.readyState);
            });
          } else {
            console.log("   ❌ No remote stream");
          }

          console.log(
            "\n   Video element srcObject:",
            !!remoteVideoRef.current?.srcObject,
          );
          console.log(
            "   Video element paused:",
            remoteVideoRef.current?.paused,
          );
          console.log("   Video dimensions:", {
            width: remoteVideoRef.current?.videoWidth,
            height: remoteVideoRef.current?.videoHeight,
          });
          console.log("   Audio element exists:", !!remoteAudioRef.current);
          if (remoteAudioRef.current) {
            console.log(
              "   Audio element paused:",
              remoteAudioRef.current.paused,
            );
            console.log(
              "   Audio element muted:",
              remoteAudioRef.current.muted,
            );
            console.log(
              "   Audio element volume:",
              remoteAudioRef.current.volume,
            );
          }
          console.log("===================================\n");
        },

        checkTransceivers: () => {
          console.log("🔍 ===== Transceivers Status =====");
          const pc = webrtcServiceRef.current?.getPeerConnection();

          if (!pc) {
            console.log("   ❌ No peer connection");
            console.log("==================================\n");
            return;
          }

          const transceivers = pc.getTransceivers();
          console.log(`   Total transceivers: ${transceivers.length}\n`);

          transceivers.forEach((t, i) => {
            console.log(`   Transceiver ${i}:`);
            console.log(`      Mid: ${t.mid}`);
            console.log(`      Direction: ${t.direction}`);
            console.log(`      Current direction: ${t.currentDirection}`);
            console.log(
              `      Sender track: ${t.sender.track?.label || "none"} (${
                t.sender.track?.kind || "none"
              })`,
            );
            console.log(`      Sender enabled: ${t.sender.track?.enabled}`);
            console.log(
              `      Receiver track: ${t.receiver.track?.label || "none"} (${
                t.receiver.track?.kind || "none"
              })`,
            );
            console.log(
              `      Receiver enabled: ${t.receiver.track?.enabled}\n`,
            );
          });
          console.log("==================================\n");
        },

        getStats: async () => {
          console.log("🔍 ===== WebRTC Stats =====");
          const pc = webrtcServiceRef.current?.getPeerConnection();
          if (!pc) {
            console.log("   ❌ No peer connection");
            console.log("===========================\n");
            return;
          }

          try {
            const stats = await pc.getStats();

            const inboundAudio: any[] = [];
            const inboundVideo: any[] = [];
            const outboundAudio: any[] = [];
            const outboundVideo: any[] = [];

            stats.forEach((report) => {
              if (report.type === "inbound-rtp") {
                if (report.kind === "audio") inboundAudio.push(report);
                if (report.kind === "video") inboundVideo.push(report);
              } else if (report.type === "outbound-rtp") {
                if (report.kind === "audio") outboundAudio.push(report);
                if (report.kind === "video") outboundVideo.push(report);
              }
            });

            if (inboundAudio.length > 0) {
              console.log("\n   📥 INBOUND AUDIO:");
              inboundAudio.forEach((r) => {
                console.log("      Bytes received:", r.bytesReceived || 0);
                console.log("      Packets received:", r.packetsReceived || 0);
                console.log("      Packets lost:", r.packetsLost || 0);
              });
            }

            if (inboundVideo.length > 0) {
              console.log("\n   📥 INBOUND VIDEO:");
              inboundVideo.forEach((r) => {
                console.log("      Bytes received:", r.bytesReceived || 0);
                console.log("      Packets received:", r.packetsReceived || 0);
                console.log("      Packets lost:", r.packetsLost || 0);
                console.log("      Frame width:", r.frameWidth || 0);
                console.log("      Frame height:", r.frameHeight || 0);
              });
            }

            if (outboundAudio.length > 0) {
              console.log("\n   📤 OUTBOUND AUDIO:");
              outboundAudio.forEach((r) => {
                console.log("      Bytes sent:", r.bytesSent || 0);
                console.log("      Packets sent:", r.packetsSent || 0);
              });
            }

            if (outboundVideo.length > 0) {
              console.log("\n   📤 OUTBOUND VIDEO:");
              outboundVideo.forEach((r) => {
                console.log("      Bytes sent:", r.bytesSent || 0);
                console.log("      Packets sent:", r.packetsSent || 0);
                console.log("      Frame width:", r.frameWidth || 0);
                console.log("      Frame height:", r.frameHeight || 0);
              });
            }

            console.log("\n===========================\n");
          } catch (err) {
            console.error("   ❌ Error getting stats:", err);
            console.log("===========================\n");
          }
        },

        forcePlayRemote: async () => {
          console.log("🎬 ===== Force Playing Remote Media =====");

          if (remoteVideoRef.current) {
            try {
              remoteVideoRef.current.muted = false;
              remoteVideoRef.current.volume = 1.0;
              await remoteVideoRef.current.play();
              console.log("   ✅ Remote video playing");
            } catch (err: any) {
              console.error("   ❌ Video failed:", err.name);
            }
          } else {
            console.log("   ❌ No remote video element");
          }

          if (remoteAudioRef.current) {
            try {
              remoteAudioRef.current.muted = false;
              remoteAudioRef.current.volume = 1.0;
              await remoteAudioRef.current.play();
              console.log("   ✅ Remote audio playing");
            } catch (err: any) {
              console.error("   ❌ Audio failed:", err.name);
            }
          } else {
            console.log("   ❌ No remote audio element");
          }

          if (audioContextRef.current) {
            if (audioContextRef.current.state === "suspended") {
              await audioContextRef.current.resume();
              console.log("   ✅ AudioContext resumed");
            } else {
              console.log(
                "   ℹ️ AudioContext state:",
                audioContextRef.current.state,
              );
            }
          } else {
            console.log("   ❌ No AudioContext");
          }

          console.log("=========================================\n");
        },

        fullDiagnostic: async () => {
          console.log("\n\n");
          console.log("═══════════════════════════════════════");
          console.log("       FULL DIAGNOSTIC REPORT");
          console.log("═══════════════════════════════════════\n");

          (window as any).debugVideoCall.checkService();
          (window as any).debugVideoCall.checkLocalStream();
          (window as any).debugVideoCall.checkRemoteStream();
          (window as any).debugVideoCall.checkTransceivers();
          await (window as any).debugVideoCall.getStats();

          console.log("═══════════════════════════════════════");
          console.log("       END DIAGNOSTIC REPORT");
          console.log("═══════════════════════════════════════\n\n");

          return {
            hasService: !!webrtcServiceRef.current,
            hasPeerConnection: !!webrtcServiceRef.current?.getPeerConnection(),
            hasLocalStream: !!webrtcServiceRef.current?.getLocalStream(),
            hasRemoteStream: !!webrtcServiceRef.current?.getRemoteStream(),
            connectionState:
              webrtcServiceRef.current?.getPeerConnection()?.connectionState,
            iceConnectionState:
              webrtcServiceRef.current?.getPeerConnection()?.iceConnectionState,
          };
        },

        quickCheck: () => {
          const pc = webrtcServiceRef.current?.getPeerConnection();
          const status = {
            initialized: !!webrtcServiceRef.current,
            peerConnection: !!pc,
            connectionState: pc?.connectionState || "none",
            iceState: pc?.iceConnectionState || "none",
            localStream: !!webrtcServiceRef.current?.getLocalStream(),
            remoteStream: !!webrtcServiceRef.current?.getRemoteStream(),
            localVideoPlaying: !localVideoRef.current?.paused,
            remoteVideoPlaying: !remoteVideoRef.current?.paused,
            remoteAudioPlaying: !remoteAudioRef.current?.paused,
          };
          console.log("⚡ Quick Status:", status);
          return status;
        },
      };

      console.log("\n✅ Debug commands loaded successfully!");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("Available commands:");
      console.log("  • window.debugVideoCall.quickCheck()");
      console.log("  • window.debugVideoCall.fullDiagnostic()");
      console.log("  • window.debugVideoCall.checkService()");
      console.log("  • window.debugVideoCall.checkLocalStream()");
      console.log("  • window.debugVideoCall.checkRemoteStream()");
      console.log("  • window.debugVideoCall.checkTransceivers()");
      console.log("  • window.debugVideoCall.getStats()");
      console.log("  • window.debugVideoCall.forcePlayRemote()");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    };

    createDebugCommands();

    const persistInterval = setInterval(() => {
      if (!(window as any).debugVideoCall) {
        console.log("🔧 Recreating debug commands...");
        createDebugCommands();
      }
    }, 3000);

    return () => {
      clearInterval(persistInterval);
    };
  }, []);

  // ✅ Component mount/unmount logging
  useEffect(() => {
    console.log("🎬 VideoCall component MOUNTED");
    console.log("   roomId:", roomId);
    console.log("   isInitiator:", isInitiator);
    console.log("   userInteracted:", userInteracted);

    return () => {
      console.log("🛑 VideoCall component UNMOUNTED");
    };
  }, []);

  // ✅ Video refs status logging
  useEffect(() => {
    console.log("📹 Video refs status:");
    console.log("   localVideoRef.current:", !!localVideoRef.current);
    console.log("   remoteVideoRef.current:", !!remoteVideoRef.current);
  });

  // ✅ User interaction detection
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

  // ✅ Fullscreen management
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

  // ✅ AudioContext resume on user interaction
  useEffect(() => {
    if (!userInteracted) return;

    const resumeAllAudio = async () => {
      try {
        const AudioContext =
          (window as any).AudioContext || (window as any).webkitAudioContext;

        if (AudioContext) {
          if (audioContextRef.current?.state === "suspended") {
            await audioContextRef.current.resume();
            console.log("✅ Resumed AudioContext on user interaction");
          }

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

  // ✅ Ensure window objects persist after initialization
  useEffect(() => {
    if (!isInitialized || !webrtcServiceRef.current) return;

    const pc = webrtcServiceRef.current.getPeerConnection();
    if (pc) {
      (window as any).peerConnection = pc;
      (window as any).webrtcService = webrtcServiceRef.current;

      console.log("✅ Window exposure verified after initialization:", {
        peerConnection: !!(window as any).peerConnection,
        webrtcService: !!(window as any).webrtcService,
        debugVideoCall: !!(window as any).debugVideoCall,
      });
    }
  }, [isInitialized]);

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

        // Force unmute if it got muted somehow
        if (video.muted) {
          console.warn("⚠️ Video was muted, forcing unmute");
          video.muted = false;
          video.volume = 1.0;
        }

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

  // ✅ Auto-start for initiator who already initiated the call
  useEffect(() => {
    if (isInitiator && !userInteracted && roomId && !initializingRef.current) {
      console.log("🤖 Auto-starting call for initiator after delay");

      const autoStartTimer = setTimeout(() => {
        if (!userInteracted && !initializingRef.current) {
          console.log("🤖 Auto-clicking START CALL for initiator");
          setUserInteracted(true);
        }
      }, 1000);

      return () => clearTimeout(autoStartTimer);
    }
  }, [isInitiator, userInteracted, roomId]);

  // ✅ Socket cleanup on unmount
  useEffect(() => {
    return () => {
      const socket = getSocket();
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      console.log("🧹 Socket handlers cleaned up");
    };
  }, []);

  // ✅ Force video visibility after stream is attached
  useEffect(() => {
    if (
      !remoteVideoRef.current ||
      connectionStatus !== "connected" ||
      !hasRemoteStream
    )
      return;

    const video = remoteVideoRef.current;

    console.log("🔄 Force video visibility effect triggered");

    const ensureVisible = () => {
      video.style.visibility = "visible";
      video.style.opacity = "1";
      video.style.display = "block";
      video.style.position = "absolute";
      video.style.top = "0";
      video.style.left = "0";
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.zIndex = "1";
      video.style.objectFit = "cover";

      video.style.display = "none";
      video.offsetHeight;
      video.style.display = "block";

      console.log("✅ Video visibility forced:", {
        display: video.style.display,
        visibility: video.style.visibility,
        opacity: video.style.opacity,
        zIndex: video.style.zIndex,
        hasSrcObject: !!video.srcObject,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      });
    };

    ensureVisible();

    const playPromise = video.play().catch((e) => {
      console.error("Play retry failed:", e);
    });

    const timer = setTimeout(() => {
      console.log("🔄 Retrying video visibility...");
      ensureVisible();
      video.play().catch((e) => console.error("Play retry failed:", e));
    }, 500);

    return () => clearTimeout(timer);
  }, [connectionStatus, hasRemoteStream]);

  // ✅ Main initialization effect
  useEffect(() => {
    console.log("\n🔄 ===== INIT EFFECT TRIGGERED =====");
    console.log("   roomId:", roomId);
    console.log("   userInteracted:", userInteracted);
    console.log("=====================================\n");

    if (!roomId) {
      console.error("❌ BLOCKED: No room ID");
      setInitError("Invalid room ID");
      return;
    }

    if (!userInteracted) {
      console.log("⏳ BLOCKED: Waiting for user interaction");
      return;
    }

    if (initializingRef.current) {
      console.warn("⚠️ BLOCKED: Already initializing");
      return;
    }

    if (initializedRef.current) {
      console.warn("⚠️ BLOCKED: Already initialized");
      return;
    }

    console.log("✅ ALL CHECKS PASSED - STARTING INITIALIZATION\n");

    initializingRef.current = true;
    let mounted = true;

    const init = async () => {
      try {
        setInitError(null);

        let attempts = 0;
        while (
          (!localVideoRef.current || !remoteVideoRef.current) &&
          attempts < 20
        ) {
          console.log(`⏳ Waiting for video refs... attempt ${attempts + 1}`);
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }

        if (!localVideoRef.current || !remoteVideoRef.current) {
          throw new Error("Video elements not rendered after 2 seconds");
        }

        console.log("✅ Video refs confirmed");

        setInitStep("Initializing WebRTC");
        await initializeCall();

        if (!mounted) {
          console.log("⚠️ Component unmounted during init");
          return;
        }

        if (!webrtcServiceRef.current) {
          throw new Error("WebRTC service not created");
        }

        console.log("\n✅✅✅ INITIALIZATION SUCCEEDED ✅✅✅");
        initializedRef.current = true;
        initializingRef.current = false;
        setIsInitialized(true);
        setInitStep("Connected");
      } catch (error: any) {
        console.error("\n❌❌❌ INITIALIZATION FAILED ❌❌❌");
        console.error("   Error:", error.message);

        if (mounted) {
          const errorMsg = error.message || "Initialization failed";
          setError(errorMsg);
          setInitError(errorMsg);
          initializingRef.current = false;
          setInitStep(`Failed: ${errorMsg}`);
        }
      }
    };

    init();

    return () => {
      console.log("🧹 Init effect cleanup");
      mounted = false;

      if (
        initializedRef.current &&
        !callEndedRef.current &&
        webrtcServiceRef.current
      ) {
        cleanup(false);
      }
    };
  }, [roomId, userInteracted]);

  // ✅ Monitor peer connection state
  useEffect(() => {
    if (!webrtcServiceRef.current) return;

    const pc = webrtcServiceRef.current.getPeerConnection();
    if (!pc) return;

    const checkConnection = () => {
      console.log("🔍 Connection check:", {
        connection: pc.connectionState,
        ice: pc.iceConnectionState,
        signaling: pc.signalingState,
      });
    };

    pc.addEventListener("connectionstatechange", checkConnection);
    pc.addEventListener("iceconnectionstatechange", checkConnection);

    setTimeout(checkConnection, 2000);
    const interval = setInterval(checkConnection, 5000);

    return () => {
      pc.removeEventListener("connectionstatechange", checkConnection);
      pc.removeEventListener("iceconnectionstatechange", checkConnection);
      clearInterval(interval);
    };
  }, [isInitialized]);

  // ✅ Cleanup function
  const cleanup = (emitEvent: boolean = true) => {
    console.log("🧹 Cleanup starting...", {
      emitEvent,
      callEnded: callEndedRef.current,
      hasWebRTC: !!webrtcServiceRef.current,
    });

    if (!webrtcServiceRef.current) {
      console.log("⚠️ Already cleaned up");
      return;
    }

    if (typeof window !== "undefined") {
      window.onbeforeunload = null;
    }

    if (isRecording && recordingServiceRef.current) {
      try {
        recordingServiceRef.current.stopRecording();
      } catch (e) {
        console.error("❌ Recording cleanup error:", e);
      }
    }

    document.querySelectorAll("#remote-audio-element").forEach((audio: any) => {
      if (audio._monitorInterval) {
        clearInterval(audio._monitorInterval);
      }
      if (audio._keepAlive) {
        clearInterval(audio._keepAlive);
      }
    });

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }

    if (remoteAudioRef.current) {
      try {
        remoteAudioRef.current.pause();
        if (remoteAudioRef.current.srcObject) {
          const stream = remoteAudioRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => {
            track.stop();
            console.log(`🛑 Stopped remote ${track.kind} track`);
          });
        }
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current.remove();
        remoteAudioRef.current = null;
      } catch (e) {
        console.error("❌ Remote audio cleanup error:", e);
      }
    }

    document.querySelectorAll("audio").forEach((audio) => {
      console.log("🗑️ Removing audio element:", audio.id);
      if (audio.srcObject) {
        const stream = audio.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log(`   Stopped ${track.kind} track: ${track.id}`);
        });
      }
      audio.pause();
      audio.srcObject = null;
      audio.remove();
    });

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
        audioContextRef.current = null;
      } catch (e) {
        console.error("❌ AudioContext cleanup error:", e);
      }
    }

    if (typeof window !== "undefined" && (window as any).__audioBooster) {
      try {
        const booster = (window as any).__audioBooster;
        if (booster.source) booster.source.disconnect();
        if (booster.highpass) booster.highpass.disconnect();
        if (booster.lowpass) booster.lowpass.disconnect();
        if (booster.voiceBoost) booster.voiceBoost.disconnect();
        if (booster.compressor) booster.compressor.disconnect();
        if (booster.gainNode) booster.gainNode.disconnect();
        if (booster.audioCtx && booster.audioCtx.state !== "closed") {
          booster.audioCtx.close();
        }
        delete (window as any).__audioBooster;
        console.log("🔊 Audio booster cleaned up");
      } catch (e) {
        console.error("❌ Audio booster cleanup error:", e);
      }
    }

    if (localVideoRef.current?.srcObject) {
      try {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log(`🛑 Stopped local ${track.kind}: ${track.label}`);
        });
        localVideoRef.current.srcObject = null;
        localVideoRef.current.pause();
      } catch (e) {
        console.error("❌ Local video cleanup error:", e);
      }
    }

    if (remoteVideoRef.current?.srcObject) {
      try {
        const stream = remoteVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log(`🛑 Stopped remote ${track.kind}: ${track.label}`);
        });
        remoteVideoRef.current.srcObject = null;
        remoteVideoRef.current.pause();
      } catch (e) {
        console.error("❌ Remote video cleanup error:", e);
      }
    }

    if (typeof window !== "undefined" && (window as any).__mediaStreamTracks) {
      try {
        const tracks = (window as any).__mediaStreamTracks;
        if (Array.isArray(tracks)) {
          tracks.forEach((track: MediaStreamTrack) => {
            try {
              track.stop();
              console.log(`🛑 Stopped global ${track.kind} track`);
            } catch (e) {
              // Ignore
            }
          });
        }
        delete (window as any).__mediaStreamTracks;
      } catch (e) {
        console.error("❌ Global tracks cleanup error:", e);
      }
    }

    if (webrtcServiceRef.current) {
      try {
        webrtcServiceRef.current.close();
        webrtcServiceRef.current = null;
      } catch (e) {
        console.error("❌ WebRTC cleanup error:", e);
      }
    }

    if (typeof window !== "undefined") {
      delete (window as any).peerConnection;
      delete (window as any).webrtcService;
    }

    if (emitEvent && !callEndedRef.current) {
      try {
        const socket = getSocket();
        socket.emit("end-call", roomId, { endedBy: user?._id });
        console.log("📤 Cleanup sent end-call signal");
      } catch (error) {
        console.error("Socket cleanup error:", error);
      }
    }

    initializedRef.current = false;
    initializingRef.current = false;
    remoteStreamReceivedRef.current = false;
    setIsInitialized(false);

    console.log("✅ Cleanup complete");
  };

  // ✅ Initialize call function
  const initializeCall = async () => {
    console.log("\n🎥 ===== INITIALIZING CALL (COMPLETE) =====");

    try {
      setError(null);

      if (!user?._id) {
        throw new Error("User not authenticated");
      }

      if (!isSocketConnected()) {
        console.log("🔌 Initializing socket...");
        initializeSocket.initializeSocket(user._id);
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      let socket;
      try {
        socket = await waitForSocket(15000);
        console.log("✅ Socket connected:", socket.id);
      } catch (err) {
        setError("Failed to connect. Please refresh.");
        return;
      }

      console.log("🔧 Creating WebRTC service...");
      webrtcServiceRef.current = new WebRTCService();
      recordingServiceRef.current = new RecordingService();

      console.log("🔧 Registering socket handlers BEFORE media/joining...");

      const handleOffer = async (data: {
        offer: RTCSessionDescriptionInit;
        from: string;
      }) => {
        console.log("\n📥 ===== RECEIVED OFFER =====");
        console.log("   From:", data.from);

        if (!webrtcServiceRef.current) {
          console.error("❌ No WebRTC service");
          return;
        }

        try {
          await webrtcServiceRef.current.setRemoteDescription(data.offer);
          console.log("✅ Remote description (offer) set");

          const answer = await webrtcServiceRef.current.createAnswer();
          console.log("✅ Answer created, sending...");

          socket.emit("answer", roomId, answer);
          console.log("📤 Answer sent");
          console.log("===========================\n");
        } catch (error) {
          console.error("❌ Error handling offer:", error);
          setError("Failed to process incoming call");
        }
      };

      const handleAnswer = async (data: {
        answer: RTCSessionDescriptionInit;
        from: string;
      }) => {
        console.log("\n📥 ===== RECEIVED ANSWER =====");
        console.log("   From:", data.from);

        if (!webrtcServiceRef.current) {
          console.error("❌ No WebRTC service");
          return;
        }

        try {
          await webrtcServiceRef.current.setRemoteDescription(data.answer);
          console.log("✅ Remote description (answer) set");
          console.log("===========================\n");
        } catch (error) {
          console.error("❌ Error handling answer:", error);
        }
      };

      const handleIceCandidate = async (data: {
        candidate: RTCIceCandidateInit;
        from: string;
      }) => {
        if (!webrtcServiceRef.current) return;

        if (data.candidate?.candidate) {
          console.log("❄️ Received ICE from:", data.from);
          try {
            await webrtcServiceRef.current.addIceCandidate(data.candidate);
          } catch (error) {
            console.error("❌ ICE candidate error:", error);
          }
        }
      };

      socket.on("offer", handleOffer);
      socket.on("answer", handleAnswer);
      socket.on("ice-candidate", handleIceCandidate);
      console.log("✅ Socket handlers registered");

      console.log("🎤 Getting media stream with audio fix...");
      let stream: MediaStream;
      try {
        stream = await ensureAudioNotMuted();
        console.log("✅ Media acquired:", {
          audio: stream.getAudioTracks().length,
          video: stream.getVideoTracks().length,
        });
      } catch (err: any) {
        setError(err.message || "Camera/mic access failed");
        return;
      }

      webrtcServiceRef.current.setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;

        localVideoRef.current.style.display = "block";
        localVideoRef.current.style.visibility = "visible";
        localVideoRef.current.style.opacity = "1";

        await localVideoRef.current.play().catch(console.error);
        console.log("✅ Local video attached and playing");

        setConnectionStatus("waiting");
        setInitStep("Camera ready - waiting for other person...");

        setTimeout(() => {
          if (connectionStatus === "connecting") {
            setConnectionStatus("waiting");
          }
        }, 100);
      }

      console.log("🔧 Setting up event listeners...");

      webrtcServiceRef.current.setupEventListeners(
        async (remoteStream: MediaStream) => {
          console.log("\n🎬 ===== REMOTE STREAM RECEIVED =====");

          if (!remoteStream.active || !remoteVideoRef.current) {
            console.error("❌ Invalid stream or no video element");
            return;
          }

          remoteStream.getTracks().forEach((track) => {
            track.enabled = true;
            console.log(`✅ Enabled ${track.kind}: ${track.label}`);
          });

          const video = remoteVideoRef.current;
          video.srcObject = remoteStream;

          video.muted = true;
          video.volume = 1.0;

          video.style.visibility = "visible";
          video.style.opacity = "1";
          video.style.display = "block";
          video.style.position = "absolute";
          video.style.top = "0";
          video.style.left = "0";
          video.style.width = "100%";
          video.style.height = "100%";
          video.style.zIndex = "5";
          video.style.objectFit = "cover";
          video.style.backgroundColor = "black";

          console.log("✅ Video element visibility forced");

          let playAttempts = 0;
          const maxAttempts = 5;

          const attemptPlay = async () => {
            playAttempts++;
            console.log(`🎬 Play attempt ${playAttempts}/${maxAttempts}`);

            try {
              video.style.display = "block";
              video.style.visibility = "visible";
              video.style.opacity = "1";
              video.style.zIndex = "2147483647";

              video.muted = false;
              video.volume = 1.0;

              try {
                if (video.srcObject) {
                  const AudioContext =
                    (window as any).AudioContext ||
                    (window as any).webkitAudioContext;
                  const audioCtx = new AudioContext();
                  const source = audioCtx.createMediaStreamSource(
                    video.srcObject as MediaStream,
                  );

                  const compressor = audioCtx.createDynamicsCompressor();
                  compressor.threshold.value = -50;
                  compressor.knee.value = 40;
                  compressor.ratio.value = 12;
                  compressor.attack.value = 0;
                  compressor.release.value = 0.25;

                  const highpass = audioCtx.createBiquadFilter();
                  highpass.type = "highpass";
                  highpass.frequency.value = 100;
                  highpass.Q.value = 1;

                  const lowpass = audioCtx.createBiquadFilter();
                  lowpass.type = "lowpass";
                  lowpass.frequency.value = 8000;
                  lowpass.Q.value = 1;

                  const voiceBoost = audioCtx.createBiquadFilter();
                  voiceBoost.type = "peaking";
                  voiceBoost.frequency.value = 2000;
                  voiceBoost.Q.value = 1;
                  voiceBoost.gain.value = 6;

                  const gainNode = audioCtx.createGain();
                  gainNode.gain.value = 2.5;

                  source
                    .connect(highpass)
                    .connect(lowpass)
                    .connect(voiceBoost)
                    .connect(compressor)
                    .connect(gainNode)
                    .connect(audioCtx.destination);

                  console.log("🎙️ Crystal clear audio pipeline active!");
                  console.log("   ✓ Noise gate: -50dB threshold");
                  console.log("   ✓ High-pass filter: 100Hz");
                  console.log("   ✓ Low-pass filter: 8kHz");
                  console.log("   ✓ Voice boost: +6dB @ 2kHz");
                  console.log("   ✓ Final gain: 2.5x");

                  (window as any).__audioBooster = {
                    audioCtx,
                    source,
                    highpass,
                    lowpass,
                    voiceBoost,
                    compressor,
                    gainNode,
                  };
                }
              } catch (audioErr) {
                console.warn("⚠️ Audio boost failed, using default:", audioErr);
              }

              setTimeout(() => {
                video.style.display = "block";
                video.style.visibility = "visible";
                video.style.opacity = "1";
              }, 100);

              return true;
            } catch (err: any) {
              console.error(
                `❌ Play attempt ${playAttempts} failed:`,
                err.name,
              );

              if (playAttempts < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 500));
                return attemptPlay();
              } else {
                console.error(
                  "❌ All play attempts failed, showing manual play button",
                );
                setShowPlayButton(true);
                return false;
              }
            }
          };

          await attemptPlay();

          setHasRemoteStream(true);
          setConnectionStatus("connected");
          setShowPlayButton(false);
          setError(null);

          remoteStreamReceivedRef.current = true;

          console.log("===== REMOTE STREAM SETUP DONE =====\n");
        },
        (candidate: RTCIceCandidate) => {
          const socket = getSocket();
          socket.emit("ice-candidate", roomId, candidate);
        },
      );

      console.log("📤 Adding local stream to peer...");
      await webrtcServiceRef.current.addLocalStreamToPeer();

      console.log("🚪 Joining room:", roomId);
      socket.emit("join-room", roomId, user._id);

      if (isInitiator) {
        console.log("👑 INITIATOR - Waiting for both-users-ready signal...");

        const readyPromise = new Promise<void>((resolve, reject) => {
          let resolved = false;

          const safeResolve = () => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          };

          const timeout = setTimeout(() => {
            if (!resolved) {
              console.warn(
                "⚠️ No both-users-ready signal, creating offer anyway",
              );
              safeResolve();
            }
          }, 10000);

          socket.once("both-users-ready", () => {
            console.log("✅ Backend confirmed both users ready!");
            clearTimeout(timeout);
            safeResolve();
          });

          socket.once("should-create-offer", () => {
            console.log("✅ Manual offer request received");
            clearTimeout(timeout);
            safeResolve();
          });
        });

        await readyPromise;

        await new Promise((resolve) => setTimeout(resolve, 500));

        console.log("📝 Creating offer...");
        const offer = await webrtcServiceRef.current.createOffer();
        console.log("📤 Sending offer...");
        socket.emit("offer", roomId, offer);
        console.log("✅ Offer sent");
      } else {
        console.log("👂 RECEIVER - Waiting for offer...");

        const offerTimeout = setTimeout(() => {
          console.warn("⚠️ No offer received after 8s, requesting it");
          socket.emit("request-offer", roomId);
        }, 8000);

        const clearOfferTimeout = () => {
          clearTimeout(offerTimeout);
          socket.off("offer", clearOfferTimeout);
        };
        socket.once("offer", clearOfferTimeout);
      }

      if (typeof window !== "undefined") {
        (window as any).peerConnection =
          webrtcServiceRef.current.getPeerConnection();
        (window as any).webrtcService = webrtcServiceRef.current;
      }

      console.log("✅ Call initialization complete\n");
    } catch (error: any) {
      console.error("❌ Init failed:", error);
      setError(error.message || "Initialization failed");
    }
  };

  // ✅ Toggle audio
  const toggleAudio = () => {
    if (webrtcServiceRef.current) {
      const newState = !isAudioEnabled;
      webrtcServiceRef.current.toggleAudio(newState);
      setIsAudioEnabled(newState);
      console.log(`🎤 Local audio ${newState ? "enabled" : "disabled"}`);
    }
  };

  // ✅ Toggle video
  const toggleVideo = () => {
    if (webrtcServiceRef.current) {
      const newState = !isVideoEnabled;
      webrtcServiceRef.current.toggleVideo(newState);
      setIsVideoEnabled(newState);
      console.log(`📹 Local video ${newState ? "enabled" : "disabled"}`);
    }
  };

  // ✅ Toggle screen share
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

  // ✅ Start recording
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
        remoteStream,
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

  // ✅ Stop recording
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

  // ✅ Handle end call
  const handleEndCall = async () => {
    if (callEndedRef.current) {
      console.log("⚠️ Call already ended, skipping");
      return;
    }
    console.log("📴 Ending call initiated by local user");
    callEndedRef.current = true;
    isEndingCallRef.current = true;

    try {
      if (isRecording) {
        stopRecording();
      }

      try {
        const socket = getSocket();
        socket.emit("end-call", roomId, { endedBy: user?._id });
        console.log("📤 Sent end-call signal");
      } catch (error) {
        console.error("Socket emit error:", error);
      }

      if (callId) {
        await axiosInstance
          .put(`/call/${callId}/status`, {
            status: "ended",
            duration: Math.floor(recordingTime),
          })
          .catch((err) => console.error("Failed to update call status:", err));
      }

      cleanup(false);
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

  // ✅ Handle play button click
  const handlePlayClick = async () => {
    console.log("🎬 Manual play clicked");

    if (remoteVideoRef.current) {
      try {
        remoteVideoRef.current.muted = true;
        await remoteVideoRef.current.play();
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.volume = 1.0;

        setShowPlayButton(false);
        setConnectionStatus("connected");
        setHasRemoteStream(true);
        console.log("✅ Playing with audio");
      } catch (err) {
        console.error("❌ Play failed:", err);
      }
    }
  };

  // ✅ Toggle fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        console.log("✅ Entered fullscreen");
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        console.log("✅ Exited fullscreen");
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  // ✅ Format time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // ✅ Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // ✅ Network quality indicator
  const NetworkIndicator = () => {
    const qualityConfig = {
      excellent: {
        color: "text-emerald-400",
        bg: "bg-emerald-500/20",
        icon: Wifi,
        bars: 4,
      },
      good: {
        color: "text-green-400",
        bg: "bg-green-500/20",
        icon: Wifi,
        bars: 3,
      },
      poor: {
        color: "text-amber-400",
        bg: "bg-amber-500/20",
        icon: Wifi,
        bars: 2,
      },
      disconnected: {
        color: "text-red-400",
        bg: "bg-red-500/20",
        icon: WifiOff,
        bars: 0,
      },
    };

    const config = qualityConfig[networkQuality];
    const Icon = config.icon;

    return (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bg}`}
      >
        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
        <div className="flex gap-0.5">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className={`w-1 rounded-full transition-all duration-300 ${
                bar <= config.bars ? config.color : "bg-gray-600"
              }`}
              style={{ height: `${bar * 3 + 4}px` }}
            />
          ))}
        </div>
      </div>
    );
  };

  // ✅ Premium Control Button Component
  const ControlButton = ({
    onClick,
    active,
    danger,
    disabled,
    icon: Icon,
    label,
    size = "normal",
    pulse,
  }: {
    onClick: () => void;
    active?: boolean;
    danger?: boolean;
    disabled?: boolean;
    icon: any;
    label: string;
    size?: "normal" | "large";
    pulse?: boolean;
  }) => {
    const baseClasses = `
      relative group flex items-center justify-center
      rounded-2xl transition-all duration-300 ease-out
      transform hover:scale-105 active:scale-95
      disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent
    `;

    const sizeClasses =
      size === "large"
        ? "w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20"
        : "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16";

    const iconSizeClasses =
      size === "large"
        ? "w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9"
        : "w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7";

    let colorClasses = "";
    if (danger) {
      colorClasses = `
        bg-gradient-to-br from-rose-500 via-red-500 to-rose-600
        hover:from-rose-600 hover:via-red-600 hover:to-rose-700
        shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50
        focus:ring-rose-500
      `;
    } else if (active) {
      colorClasses = `
        bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600
        hover:from-violet-600 hover:via-purple-600 hover:to-indigo-700
        shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50
        focus:ring-violet-500
      `;
    } else {
      colorClasses = `
        ${colors.glass}
        hover:bg-white/15 dark:hover:bg-white/15
        shadow-lg shadow-black/10
        focus:ring-white/30
      `;
    }

    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onClick}
          disabled={disabled}
          className={`${baseClasses} ${sizeClasses} ${colorClasses}`}
          title={label}
        >
          {/* Pulse animation for active states */}
          {pulse && (
            <span className="absolute inset-0 rounded-2xl animate-ping bg-current opacity-20" />
          )}

          {/* Glow effect */}
          <span
            className={`
            absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
            transition-opacity duration-300
            ${danger ? "bg-rose-400/20" : active ? "bg-violet-400/20" : "bg-white/5"}
            blur-xl
          `}
          />

          {/* Icon */}
          <Icon className={`${iconSizeClasses} text-white relative z-10`} />
        </button>

        {/* Label */}
        <span
          className={`
          text-[10px] sm:text-xs font-medium tracking-wide
          ${colors.textMuted} opacity-0 group-hover:opacity-100
          transition-opacity duration-300 whitespace-nowrap
        `}
        >
          {label}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`
        fixed inset-0 w-screen h-screen overflow-hidden
        ${colors.bg}
      `}
      style={{ zIndex: 2147483647 }}
    >
      {/* ===== PREMIUM BACKGROUND EFFECTS ===== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient orbs */}
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-violet-600/20 to-transparent rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-tl from-indigo-600/20 to-transparent rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* ===== REMOTE VIDEO (Full Screen) ===== */}
      <div className="absolute inset-0">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted={false}
          id="remote-video-element"
          className="w-full h-full object-cover"
          style={{
            display: "block",
            visibility: "visible",
            opacity: 1,
          }}
          onPlay={() => {
            console.log("📹 Remote video onPlay fired");
            if (remoteVideoRef.current) {
              const v = remoteVideoRef.current;
              v.muted = false;
              v.volume = 1.0;
              v.style.display = "block";
              v.style.visibility = "visible";
              v.style.opacity = "1";
            }
          }}
          onLoadedMetadata={() => {
            console.log("📹 Remote video metadata loaded");
            if (remoteVideoRef.current) {
              const v = remoteVideoRef.current;
              v.style.display = "block";
              v.style.visibility = "visible";
              v.style.opacity = "1";
              v.play().catch((e) => console.error("Play error:", e));
            }
          }}
        />

        {/* Remote video placeholder when no stream */}
        {!hasRemoteStream && connectionStatus !== "connecting" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              {/* Avatar placeholder */}
              <div
                className={`
                w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44
                rounded-full mx-auto mb-6
                bg-gradient-to-br ${colors.accent}
                flex items-center justify-center
                shadow-2xl shadow-violet-500/30
                ring-4 ring-white/10
              `}
              >
                <span className="text-4xl sm:text-5xl md:text-6xl font-bold text-white">
                  {getInitials(remotePeerName)}
                </span>
              </div>
              <h3
                className={`text-xl sm:text-2xl md:text-3xl font-semibold ${colors.text} mb-2`}
              >
                {remotePeerName}
              </h3>
              <p className={`${colors.textMuted} text-sm sm:text-base`}>
                {connectionStatus === "waiting"
                  ? "Waiting to connect..."
                  : "Connecting..."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ===== CONNECTION OVERLAY ===== */}
      {connectionStatus === "connecting" &&
        !localVideoRef.current?.srcObject && (
          <div
            className={`
            absolute inset-0 ${colors.overlay} backdrop-blur-xl
            flex items-center justify-center z-50
          `}
          >
            <div className="text-center p-8">
              {/* Premium loader */}
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-8">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
                {/* Spinning ring */}
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 animate-spin" />
                {/* Inner pulse */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/30 animate-pulse" />
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Video className="w-8 h-8 sm:w-10 sm:h-10 text-violet-400" />
                </div>
              </div>

              <h2
                className={`text-2xl sm:text-3xl font-bold ${colors.text} mb-3`}
              >
                Starting Your Call
              </h2>
              <p className={`${colors.textMuted} text-sm sm:text-base`}>
                Please allow camera and microphone access
              </p>

              {/* Progress steps */}
              <div className="mt-8 flex items-center justify-center gap-2">
                {["Camera", "Microphone", "Connecting"].map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <div
                      className={`
                      w-2 h-2 rounded-full transition-colors duration-500
                      ${i === 0 ? "bg-violet-500" : i === 1 ? "bg-violet-500/50" : "bg-violet-500/20"}
                    `}
                    />
                    <span className={`text-xs ${colors.textSubtle}`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      {/* ===== HEADER - Call Info ===== */}
      <div
        className={`
        absolute top-0 left-0 right-0 z-40
        transition-all duration-500 ease-out
        ${showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}
      `}
      >
        {/* Gradient fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-transparent pointer-events-none" />

        <div className="relative px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6">
          <div className="flex items-start justify-between">
            {/* Left - Caller Info */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Avatar */}
              <div
                className={`
                relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14
                rounded-xl sm:rounded-2xl overflow-hidden
                bg-gradient-to-br ${colors.accent}
                shadow-lg shadow-violet-500/20
                ring-2 ring-white/20
              `}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm sm:text-base md:text-lg font-bold text-white">
                    {getInitials(remotePeerName)}
                  </span>
                </div>
              </div>

              {/* Name & Status */}
              <div>
                <h2 className="text-white text-base sm:text-lg md:text-xl font-semibold tracking-tight">
                  {remotePeerName}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  {/* Status dot */}
                  <div
                    className={`
                    w-2 h-2 rounded-full transition-colors duration-300
                    ${
                      connectionStatus === "connected"
                        ? "bg-emerald-400 shadow-lg shadow-emerald-400/50"
                        : connectionStatus === "connecting" ||
                            connectionStatus === "waiting"
                          ? "bg-amber-400 animate-pulse"
                          : "bg-red-400"
                    }
                  `}
                  />
                  <span className="text-gray-400 text-xs sm:text-sm capitalize">
                    {connectionStatus === "connected"
                      ? formatTime(callDuration)
                      : connectionStatus}
                  </span>

                  {/* Encrypted badge */}
                  {connectionStatus === "connected" && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 ml-2">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-medium">
                        Encrypted
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right - Recording & Network */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Network quality */}
              <NetworkIndicator />

              {/* Recording indicator */}
              {isRecording && (
                <div
                  className={`
                  flex items-center gap-2 sm:gap-3
                  bg-red-500/90 backdrop-blur-sm
                  px-3 py-1.5 sm:px-4 sm:py-2
                  rounded-full shadow-lg shadow-red-500/30
                  animate-pulse
                `}
                >
                  <div className="relative">
                    <Circle className="w-3 h-3 sm:w-4 sm:h-4 fill-white text-white" />
                    <span className="absolute inset-0 rounded-full bg-white animate-ping opacity-75" />
                  </div>
                  <span className="text-white text-xs sm:text-sm font-bold tracking-wider">
                    REC {formatTime(recordingTime)}
                  </span>
                </div>
              )}

              {/* Fullscreen toggle */}
              <button
                onClick={toggleFullscreen}
                className={`
                  p-2 sm:p-2.5 rounded-xl ${colors.glass}
                  hover:bg-white/10 transition-all duration-300
                  hidden sm:flex
                `}
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                ) : (
                  <Maximize className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== LOCAL VIDEO - Picture in Picture ===== */}
      <div
        className={`
        absolute z-30 transition-all duration-500 ease-out
        ${showControls ? "opacity-100 scale-100" : "opacity-80 scale-95"}
        bottom-28 sm:bottom-32 md:bottom-36
        right-3 sm:right-5 md:right-6
      `}
      >
        <div
          className={`
          relative
          w-24 h-32 sm:w-36 sm:h-48 md:w-44 md:h-60
          rounded-2xl sm:rounded-3xl overflow-hidden
          ${colors.glass} shadow-2xl shadow-black/40
          ring-2 ring-white/20
          group cursor-pointer
          hover:ring-violet-500/50 hover:shadow-violet-500/20
          transition-all duration-300
        `}
        >
          {/* Video */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted={true}
            className="w-full h-full object-cover"
            style={{
              display: "block",
              visibility: "visible",
              opacity: 1,
              transform: "scaleX(-1)", // Mirror effect
            }}
          />

          {/* Video off overlay */}
          {!isVideoEnabled && (
            <div
              className={`
              absolute inset-0 ${colors.overlay} backdrop-blur-sm
              flex items-center justify-center
            `}
            >
              <div
                className={`
                w-12 h-12 sm:w-16 sm:h-16 rounded-full
                bg-gradient-to-br ${colors.accent}
                flex items-center justify-center
              `}
              >
                <VideoOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          )}

          {/* Muted indicator */}
          {!isAudioEnabled && (
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
              <div className="p-1.5 sm:p-2 rounded-full bg-red-500/90 shadow-lg shadow-red-500/30">
                <MicOff className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
            </div>
          )}

          {/* "You" label */}
          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3">
            <div
              className={`
              px-2 py-0.5 sm:px-3 sm:py-1 rounded-full
              ${colors.glass}
            `}
            >
              <span className="text-[10px] sm:text-xs text-white font-medium">
                You
              </span>
            </div>
          </div>

          {/* Hover expand hint */}
          <div
            className={`
            absolute inset-0 bg-black/0 group-hover:bg-black/20
            flex items-center justify-center
            transition-all duration-300 opacity-0 group-hover:opacity-100
          `}
          >
            <Maximize className="w-6 h-6 text-white/80" />
          </div>
        </div>
      </div>

      {/* ===== ERROR MESSAGE ===== */}
      {error && (
        <div
          className={`
          absolute top-20 sm:top-24 left-1/2 -translate-x-1/2
          z-50 max-w-md w-[calc(100%-2rem)]
        `}
        >
          <div
            className={`
            ${colors.glass} backdrop-blur-xl
            px-4 py-3 sm:px-6 sm:py-4
            rounded-2xl shadow-2xl shadow-black/20
            border border-red-500/20
          `}
          >
            <p className="text-red-400 text-sm sm:text-base text-center font-medium">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* ===== PLAY BUTTON (Autoplay blocked) ===== */}
      {showPlayButton && (
        <div
          className={`
          absolute inset-0 ${colors.overlay} backdrop-blur-xl
          flex items-center justify-center z-50
        `}
        >
          <div className="text-center">
            <button
              onClick={handlePlayClick}
              className={`
                group relative
                w-24 h-24 sm:w-32 sm:h-32
                rounded-full
                bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600
                hover:from-violet-600 hover:via-purple-600 hover:to-indigo-700
                shadow-2xl shadow-violet-500/40
                transition-all duration-300
                transform hover:scale-110 active:scale-95
              `}
            >
              {/* Pulse rings */}
              <span className="absolute inset-0 rounded-full bg-violet-500/30 animate-ping" />
              <span
                className="absolute -inset-3 rounded-full border-2 border-violet-500/30 animate-pulse"
                style={{ animationDelay: "0.5s" }}
              />

              <Play
                className="w-10 h-10 sm:w-12 sm:h-12 text-white relative z-10 ml-1"
                fill="currentColor"
              />
            </button>
            <p className={`mt-6 ${colors.text} text-lg font-medium`}>
              Tap to start video
            </p>
            <p className={`mt-2 ${colors.textMuted} text-sm`}>
              Audio will play automatically
            </p>
          </div>
        </div>
      )}

      {/* ===== CONTROL BAR ===== */}
      <div
        className={`
        absolute bottom-0 left-0 right-0 z-40
        transition-all duration-500 ease-out
        ${showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}
      >
        {/* Gradient fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent pointer-events-none" />

        <div className="relative px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
          {/* Main controls */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4">
            {/* Audio Toggle */}
            <ControlButton
              onClick={toggleAudio}
              active={!isAudioEnabled}
              icon={isAudioEnabled ? Mic : MicOff}
              label={isAudioEnabled ? "Mute" : "Unmute"}
            />

            {/* Video Toggle */}
            <ControlButton
              onClick={toggleVideo}
              active={!isVideoEnabled}
              icon={isVideoEnabled ? Video : VideoOff}
              label={isVideoEnabled ? "Stop Video" : "Start Video"}
            />

            {/* Screen Share */}
            <ControlButton
              onClick={toggleScreenShare}
              active={isScreenSharing}
              icon={MonitorUp}
              label={isScreenSharing ? "Stop Share" : "Share Screen"}
            />

            {/* Record Toggle */}
            <ControlButton
              onClick={isRecording ? stopRecording : startRecording}
              disabled={connectionStatus !== "connected"}
              active={isRecording}
              pulse={isRecording}
              icon={Circle}
              label={isRecording ? "Stop Rec" : "Record"}
            />

            {/* Spacer for visual separation */}
            <div className="w-2 sm:w-4" />

            {/* End Call - Larger and more prominent */}
            <ControlButton
              onClick={handleEndCall}
              disabled={isEndingCallRef.current}
              danger
              size="large"
              icon={PhoneOff}
              label="End Call"
            />
          </div>

          {/* Bottom safe area indicator for mobile */}
          <div className="h-2 sm:h-4 md:h-6" />
        </div>
      </div>

      {/* ===== SCREEN SHARE INDICATOR ===== */}
      {isScreenSharing && (
        <div
          className={`
          absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50
        `}
        >
          <div
            className={`
            flex items-center gap-2 sm:gap-3
            ${colors.glass} backdrop-blur-xl
            px-4 py-2 sm:px-5 sm:py-2.5
            rounded-full shadow-2xl shadow-blue-500/20
            border border-blue-500/30
          `}
          >
            <div className="relative">
              <MonitorUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            </div>
            <span className="text-blue-400 text-xs sm:text-sm font-medium">
              Sharing your screen
            </span>
          </div>
        </div>
      )}

      {/* ===== PREMIUM CSS INJECTION ===== */}
      <style jsx global>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes glow {
          0%,
          100% {
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(139, 92, 246, 0.5);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        .video-call-premium * {
          -webkit-tap-highlight-color: transparent;
        }

        /* Smooth scrollbar for any scrollable content */
        .video-call-premium ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .video-call-premium ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }

        .video-call-premium ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        .video-call-premium ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* Video element enhancements */
        #remote-video-element {
          filter: contrast(1.02) saturate(1.05);
        }

        /* Button focus states */
        button:focus-visible {
          outline: none;
          ring: 2px solid rgba(139, 92, 246, 0.5);
          ring-offset: 2px;
        }

        /* Animations for smoother experience */
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Safe area padding for notched devices */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .safe-area-bottom {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
    </div>
  );
};

// ✅ EMERGENCY: Global click helper for debugging
if (typeof window !== "undefined") {
  (window as any).forceStartCall = () => {
    console.log("🚨 EMERGENCY START CALL TRIGGERED");
    const button = document.querySelector("button") as HTMLButtonElement;
    if (button) {
      button.click();
      console.log("✅ Button clicked programmatically");
    } else {
      console.error("❌ Button not found");
    }
  };
}

export default VideoCall;
