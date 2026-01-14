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
      audioInputs.map((d) => d.label || d.deviceId)
    );

    // 🔥 TRY DEFAULT DEVICE FIRST (respects Windows settings)
    const defaultDevice = audioInputs.find(
      (d) =>
        d.deviceId === "default" || d.label.toLowerCase().includes("default")
    );

    if (defaultDevice) {
      console.log("🎯 Trying Windows default device:", defaultDevice.label);

      try {
        const testStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: defaultDevice.deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1,
          },
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
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              channelCount: 1,
            },
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
        `   Testing device ${i + 1}/${audioInputs.length}: ${device.label}`
      );

      try {
        const testStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: device.deviceId ? { exact: device.deviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1,
          },
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

        // Get full stream with this device
        const fullStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: device.deviceId ? { exact: device.deviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1,
          },
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
        !!(window as any).debugVideoCall
      );
      console.log(
        "   window.peerConnection exists:",
        !!(window as any).peerConnection
      );
      console.log(
        "   window.webrtcService exists:",
        !!(window as any).webrtcService
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
            "❌ Debug commands never initialized - component may not have mounted"
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
}: VideoCallProps) => {
  const router = useRouter();
  const { user } = useUser();
  // ... rest of component

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
  // Add this state near other states:
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

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
              localStream.getAudioTracks().length
            );
            console.log(
              "   Video tracks:",
              localStream.getVideoTracks().length
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
            !!localVideoRef.current?.srcObject
          );
          console.log(
            "   Video element paused:",
            localVideoRef.current?.paused
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
              remoteStream.getAudioTracks().length
            );
            console.log(
              "   Video tracks:",
              remoteStream.getVideoTracks().length
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
            !!remoteVideoRef.current?.srcObject
          );
          console.log(
            "   Video element paused:",
            remoteVideoRef.current?.paused
          );
          console.log("   Video dimensions:", {
            width: remoteVideoRef.current?.videoWidth,
            height: remoteVideoRef.current?.videoHeight,
          });
          console.log("   Audio element exists:", !!remoteAudioRef.current);
          if (remoteAudioRef.current) {
            console.log(
              "   Audio element paused:",
              remoteAudioRef.current.paused
            );
            console.log(
              "   Audio element muted:",
              remoteAudioRef.current.muted
            );
            console.log(
              "   Audio element volume:",
              remoteAudioRef.current.volume
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
              })`
            );
            console.log(`      Sender enabled: ${t.sender.track?.enabled}`);
            console.log(
              `      Receiver track: ${t.receiver.track?.label || "none"} (${
                t.receiver.track?.kind || "none"
              })`
            );
            console.log(
              `      Receiver enabled: ${t.receiver.track?.enabled}\n`
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
                audioContextRef.current.state
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
    // ✅ Force video element refresh when connected
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
  // ✅ Auto-start for initiator who already initiated the call
  useEffect(() => {
    if (isInitiator && !userInteracted && roomId && !initializingRef.current) {
      console.log("🤖 Auto-starting call for initiator after delay");

      // Give user 1 second to see the screen, then auto-start
      const autoStartTimer = setTimeout(() => {
        if (!userInteracted && !initializingRef.current) {
          console.log("🤖 Auto-clicking START CALL for initiator");
          setUserInteracted(true);
        }
      }, 1000); // Reduced from any longer delay

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

    // Force visibility and repaint
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

      // Force repaint
      video.style.display = "none";
      video.offsetHeight; // Trigger reflow
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

    // Immediate visibility
    ensureVisible();

    // Also try forcing play again
    const playPromise = video.play().catch((e) => {
      console.error("Play retry failed:", e);
    });

    // Retry after a short delay
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

        // Wait for video refs with timeout
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

      // ✅ REMOVED: The manual stream triggering that was causing double-calls
      // The webrtc.ts trackHandler already handles this properly
    };

    pc.addEventListener("connectionstatechange", checkConnection);
    pc.addEventListener("iceconnectionstatechange", checkConnection);

    // Initial check
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

    // Remove navigation blocker
    if (typeof window !== "undefined") {
      window.onbeforeunload = null;
    }

    // Stop recording
    if (isRecording && recordingServiceRef.current) {
      try {
        recordingServiceRef.current.stopRecording();
      } catch (e) {
        console.error("❌ Recording cleanup error:", e);
      }
    }

    // Stop monitor intervals
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

    // Clean up remote audio element
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

    // Remove ALL audio elements
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

    // Close AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
        audioContextRef.current = null;
      } catch (e) {
        console.error("❌ AudioContext cleanup error:", e);
      }
    }

    // Clean local video
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

    // Clean remote video
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

    // Clean global media tracks
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

    // Close WebRTC
    if (webrtcServiceRef.current) {
      try {
        webrtcServiceRef.current.close();
        webrtcServiceRef.current = null;
      } catch (e) {
        console.error("❌ WebRTC cleanup error:", e);
      }
    }

    // Clean up window exposure
    if (typeof window !== "undefined") {
      delete (window as any).peerConnection;
      delete (window as any).webrtcService;
    }

    // Emit end call if requested
    if (emitEvent && !callEndedRef.current) {
      try {
        const socket = getSocket();
        socket.emit("end-call", roomId, { endedBy: user?._id });
        console.log("📤 Cleanup sent end-call signal");
      } catch (error) {
        console.error("Socket cleanup error:", error);
      }
    }

    // Reset initialization flags
    initializedRef.current = false;
    initializingRef.current = false;
    remoteStreamReceivedRef.current = false;
    setIsInitialized(false);

    console.log("✅ Cleanup complete");
  };

  // ✅ Force video visibility by injecting CSS into document
  useEffect(() => {
    console.log("🎨 Injecting video visibility CSS");

    const styleEl = document.createElement("style");
    styleEl.id = "video-call-override";
    styleEl.innerHTML = `
    /* Force video element to be visible */
    #remote-video-element,
    .video-call-remote {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      object-fit: cover !important;
      z-index: 2147483647 !important;
      background: black !important;
    }
    
    /* Ensure container is visible */
    .fixed.inset-0.w-screen.h-screen {
      z-index: 2147483646 !important;
      background: black !important;
    }
  `;

    document.head.appendChild(styleEl);

    console.log("✅ Video visibility CSS injected");

    return () => {
      styleEl.remove();
    };
  }, []);

  // ✅ Initialize call function
  const initializeCall = async () => {
    console.log("\n🎥 ===== INITIALIZING CALL (COMPLETE) =====");

    try {
      setError(null);

      if (!user?._id) {
        throw new Error("User not authenticated");
      }

      // Socket setup
      if (!isSocketConnected()) {
        console.log("🔌 Initializing socket...");
        initializeSocket.initializeSocket(user._id);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      let socket;
      try {
        socket = await waitForSocket(15000);
        console.log("✅ Socket connected:", socket.id);
      } catch (err) {
        setError("Failed to connect. Please refresh.");
        return;
      }

      // Create WebRTC service
      console.log("🔧 Creating WebRTC service...");
      webrtcServiceRef.current = new WebRTCService();
      recordingServiceRef.current = new RecordingService();

      // ✅ CRITICAL FIX: Register socket handlers BEFORE doing anything else
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

      // ✅ Register handlers NOW
      socket.on("offer", handleOffer);
      socket.on("answer", handleAnswer);
      socket.on("ice-candidate", handleIceCandidate);
      console.log("✅ Socket handlers registered");

      // Get media stream with Windows audio fix
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

      // Set local stream
      webrtcServiceRef.current.setLocalStream(stream);

      // ✅ THIS IS THE CRITICAL PART - Attach to local video WITH status update
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;

        // ✅ Force video visibility
        localVideoRef.current.style.display = "block";
        localVideoRef.current.style.visibility = "visible";
        localVideoRef.current.style.opacity = "1";

        await localVideoRef.current.play().catch(console.error);
        console.log("✅ Local video attached and playing");

        // ✅ CRITICAL: Update status immediately to hide overlay
        setConnectionStatus("waiting");
        setInitStep("Camera ready - waiting for other person...");

        // Force re-render
        setTimeout(() => {
          if (connectionStatus === "connecting") {
            setConnectionStatus("waiting");
          }
        }, 100);
      }

      // Setup event listeners BEFORE adding tracks
      console.log("🔧 Setting up event listeners...");

      webrtcServiceRef.current.setupEventListeners(
        // Remote stream callback
        // Remote stream callback
        async (remoteStream: MediaStream) => {
          console.log("\n🎬 ===== REMOTE STREAM RECEIVED =====");

          if (!remoteStream.active || !remoteVideoRef.current) {
            console.error("❌ Invalid stream or no video element");
            return;
          }

          // Enable all tracks
          remoteStream.getTracks().forEach((track) => {
            track.enabled = true;
            console.log(`✅ Enabled ${track.kind}: ${track.label}`);
          });

          // Attach stream to video
          const video = remoteVideoRef.current;
          video.srcObject = remoteStream;

          // 🔥 CRITICAL FIX: Start MUTED to allow autoplay
          video.muted = true;
          video.volume = 1.0;

          // Force video visibility
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
          // 🔥 FORCE PLAY WITH MAXIMUM ATTEMPTS
          let playAttempts = 0;
          const maxAttempts = 5;

          const attemptPlay = async () => {
            playAttempts++;
            console.log(`🎬 Play attempt ${playAttempts}/${maxAttempts}`);

            try {
              // Force video to be visible FIRST
              video.style.display = "block";
              video.style.visibility = "visible";
              video.style.opacity = "1";
              video.style.zIndex = "2147483647";

              // Force play WITH audio
              video.muted = false;
              video.volume = 1.0;

              await video.play();
              console.log("✅ Video playing with audio!");

              // Double-check it's still visible
              setTimeout(() => {
                video.style.display = "block";
                video.style.visibility = "visible";
                video.style.opacity = "1";
              }, 100);

              return true;
            } catch (err: any) {
              console.error(
                `❌ Play attempt ${playAttempts} failed:`,
                err.name
              );

              if (playAttempts < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 500));
                return attemptPlay();
              } else {
                console.error(
                  "❌ All play attempts failed, showing manual play button"
                );
                setShowPlayButton(true);
                return false;
              }
            }
          };

          await attemptPlay();

          // Update states - THIS TRIGGERS RE-RENDER
          setHasRemoteStream(true);
          setConnectionStatus("connected");
          setShowPlayButton(false);
          setError(null);

          // Mark ref too
          remoteStreamReceivedRef.current = true;

          console.log("===== REMOTE STREAM SETUP DONE =====\n");
        },
        // ICE candidate callback
        (candidate: RTCIceCandidate) => {
          const socket = getSocket();
          socket.emit("ice-candidate", roomId, candidate);
        }
      );

      // Add local stream to peer connection
      console.log("📤 Adding local stream to peer...");
      await webrtcServiceRef.current.addLocalStreamToPeer();

      // Join room
      console.log("🚪 Joining room:", roomId);
      socket.emit("join-room", roomId, user._id);

      if (isInitiator) {
        console.log("👑 INITIATOR - waiting for both-users-ready signal...");

        await new Promise<void>((resolve, reject) => {
          let resolved = false;

          const safeResolve = () => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          };

          const timeout = setTimeout(() => {
            console.error("❌ TIMEOUT: Receiver never joined after 90 seconds");
            reject(new Error("Receiver did not join the call"));
          }, 90000);

          socket.once("both-users-ready", (data: any) => {
            console.log("✅✅✅ Both users ready signal received!");
            clearTimeout(timeout);

            console.log(
              "⏳ Waiting 5 more seconds for receiver to stabilize..."
            );
            setTimeout(() => {
              console.log(
                "✅ Creating offer NOW after both-users-ready + 5s delay"
              );
              safeResolve();
            }, 5000);
          });
        });

        console.log("📝 Creating offer...");
        const offer = await webrtcServiceRef.current.createOffer();
        console.log("📤 Sending offer...");
        socket.emit("offer", roomId, offer);
        console.log("✅ Offer sent");
      }

      // Expose to window for debugging
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
        console.log("✅ Entered fullscreen");
      } else {
        await document.exitFullscreen();
        console.log("✅ Exited fullscreen");
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  // ✅ Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };
  return (
    <div
      className="fixed inset-0 w-screen h-screen bg-black z-[999999]"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "black",
        zIndex: 999999,
      }}
    >
      {/* Remote Video */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted={false}
        id="remote-video-element"
        className="video-call-remote"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          zIndex: 2147483647,
          backgroundColor: "black",
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
            // Force visibility again
            v.style.display = "block";
            v.style.visibility = "visible";
            v.style.opacity = "1";
            v.style.zIndex = "2147483647";
          }
        }}
        onLoadedMetadata={() => {
          console.log("📹 Remote video metadata loaded");
          // Force play and visibility
          if (remoteVideoRef.current) {
            const v = remoteVideoRef.current;
            v.style.display = "block";
            v.style.visibility = "visible";
            v.style.opacity = "1";
            v.play().catch((e) => console.error("Play error:", e));
          }
        }}
      />

      {/* Connection Status Overlay - Hide when local video is ready */}
      {connectionStatus === "connecting" &&
        !localVideoRef.current?.srcObject && (
          <div
            id="connecting-overlay"
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-[1000000] pointer-events-none"
          >
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-xl">Starting camera...</p>
              <p className="text-gray-400 text-sm mt-2">
                Please allow camera access
              </p>
            </div>
          </div>
        )}

      {/* Local Video - Picture in Picture */}
      <div
        className="absolute bottom-24 right-4 w-32 h-24 sm:w-64 sm:h-48 rounded-xl overflow-hidden border-4 border-white shadow-2xl bg-black pointer-events-auto"
        style={{
          position: "fixed",
          bottom: "6rem",
          right: "1rem",
          zIndex: 1000001,
          backgroundColor: "black",
        }}
      >
        {" "}
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
          }}
        />
        {!isVideoEnabled && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <VideoOff className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
          </div>
        )}
      </div>

      {/* Header - Call Info */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 via-black/30 to-transparent p-3 sm:p-6 z-[1000002] pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div>
            <h2 className="text-white text-xl sm:text-3xl font-bold">
              {remotePeerName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div
                className={`w-2 h-2 rounded-full ${
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
            <div className="flex items-center gap-2 sm:gap-3 bg-red-600/90 backdrop-blur-sm px-3 py-2 sm:px-6 sm:py-3 rounded-full animate-pulse shadow-lg">
              <Circle className="w-3 h-3 sm:w-4 sm:h-4 fill-white text-white" />
              <span className="text-white text-sm sm:text-lg font-bold">
                {formatTime(recordingTime)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error/Info Message */}
      {error && (
        <div className="absolute top-20 sm:top-24 left-1/2 transform -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg z-[1000003] shadow-xl max-w-md text-center text-sm sm:text-base pointer-events-auto">
          {error}
        </div>
      )}

      {/* Play Button - if autoplay blocked */}
      {showPlayButton && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-[1000004] pointer-events-auto">
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

      {/* Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-3 sm:p-8 z-[1000005] pointer-events-none">
        <div className="flex items-center justify-center gap-2 sm:gap-4 pointer-events-auto">
          {/* Audio Toggle */}
          <button
            onClick={toggleAudio}
            className={`p-3 sm:p-5 rounded-full transition-all transform hover:scale-110 active:scale-95 shadow-lg ${
              isAudioEnabled
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-red-600 hover:bg-red-700"
            }`}
            title={isAudioEnabled ? "Mute Audio" : "Unmute Audio"}
          >
            {isAudioEnabled ? (
              <Mic className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            ) : (
              <MicOff className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            )}
          </button>

          {/* Video Toggle */}
          <button
            onClick={toggleVideo}
            className={`p-3 sm:p-5 rounded-full transition-all transform hover:scale-110 active:scale-95 shadow-lg ${
              isVideoEnabled
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-red-600 hover:bg-red-700"
            }`}
            title={isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
          >
            {isVideoEnabled ? (
              <Video className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            ) : (
              <VideoOff className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            )}
          </button>

          {/* Screen Share Toggle */}
          <button
            onClick={toggleScreenShare}
            className={`p-3 sm:p-5 rounded-full transition-all transform hover:scale-110 active:scale-95 shadow-lg ${
              isScreenSharing
                ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400/50"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          >
            <MonitorUp className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
          </button>

          {/* Record Toggle */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={connectionStatus !== "connected"}
            className={`p-3 sm:p-5 rounded-full transition-all transform hover:scale-110 active:scale-95 shadow-lg disabled:opacity-50 ${
              isRecording
                ? "bg-red-600 hover:bg-red-700 ring-2 ring-red-400/50"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
            title={isRecording ? "Stop Recording" : "Start Recording"}
          >
            <Circle
              className={`w-5 h-5 sm:w-7 sm:h-7 text-white ${
                isRecording ? "fill-white" : ""
              }`}
            />
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            disabled={isEndingCallRef.current}
            className="p-4 sm:p-6 rounded-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 transition-all transform hover:scale-110 active:scale-95 shadow-xl ml-2 sm:ml-4"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </button>
        </div>
      </div>
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
