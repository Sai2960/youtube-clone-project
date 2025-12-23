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

// ✅ Global debug helper (works immediately)
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
const VideoCall: React.FC<VideoCallProps> = ({
  roomId,
  isInitiator,
  onEndCall,
  remotePeerName = "Remote User",
  callId = "",
}) => {
  const router = useRouter();
  const { user } = useUser();

  // ✅ ADD THIS - IMMEDIATE LOGGING
  console.log("🎬 ===== VideoCall RENDER =====");
  console.log("   Time:", new Date().toISOString());
  console.log("   roomId:", roomId);
  console.log("   isInitiator:", isInitiator);
  console.log("   user:", user?._id);
  console.log("===============================\n");

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

  const [initError, setInitError] = useState<string | null>(null);
  const [initStep, setInitStep] = useState<string>("idle");

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

  // ✅ NEW: Force audio context resume on user interaction
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
  const setupRemoteAudio = async (stream: MediaStream) => {
    console.log("🔊 ===== SETTING UP REMOTE AUDIO (FIXED) =====");

    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();

    console.log(
      `📊 Remote stream tracks: audio=${audioTracks.length}, video=${videoTracks.length}`
    );

    if (audioTracks.length === 0) {
      console.error("❌ No audio tracks in remote stream!");
      return;
    }

    // ✅ CRITICAL: Force enable ALL tracks
    stream.getTracks().forEach((track) => {
      track.enabled = true;
      console.log(`   ✅ Enabled ${track.kind}: ${track.label}`);
    });

    // ✅ STEP 1: Attach to video element (includes audio)
    if (remoteVideoRef.current) {
      console.log("📹 Attaching stream to video element...");

      // Clean old stream
      if (remoteVideoRef.current.srcObject) {
        const oldStream = remoteVideoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach((t) => t.stop());
      }

      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.muted = false; // ✅ CRITICAL: Must be unmuted
      remoteVideoRef.current.volume = 1.0;

      // ✅ CRITICAL: Set audio output to default speakers
      if ("setSinkId" in HTMLMediaElement.prototype) {
        try {
          await (remoteVideoRef.current as any).setSinkId("");
          console.log("✅ Audio output set to default");
        } catch (err) {
          console.warn("⚠️ Could not set audio output:", err);
        }
      }

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

    // ✅ STEP 2: Create backup audio element
    if (remoteAudioRef.current) {
      try {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current.remove();
      } catch (e) {
        console.warn("Audio cleanup:", e);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));

    const audioEl = document.createElement("audio");
    audioEl.id = "remote-audio-backup";
    audioEl.autoplay = true;
    audioEl.setAttribute("playsinline", "true");
    audioEl.muted = false;
    audioEl.volume = 1.0;
    audioEl.controls = false;
    audioEl.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;";

    const audioOnlyStream = new MediaStream(audioTracks);
    audioEl.srcObject = audioOnlyStream;

    remoteAudioRef.current = audioEl;
    document.body.appendChild(audioEl);

    // ✅ CRITICAL: Set audio output
    if ("setSinkId" in HTMLMediaElement.prototype) {
      try {
        await (audioEl as any).setSinkId("");
        console.log("✅ Backup audio output set");
      } catch (err) {
        console.warn("⚠️ Could not set backup audio output");
      }
    }

    try {
      await audioEl.play();
      console.log("✅ Backup audio element playing");
    } catch (err: any) {
      console.warn("⚠️ Backup audio autoplay blocked:", err.name);
    }

    console.log("===== REMOTE AUDIO SETUP COMPLETE =====\n");
  };
  useEffect(() => {
    if (typeof window === "undefined") return;

    const createDebugCommands = () => {
      (window as any).debugVideoCall = {
        // Check WebRTC service status
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

        // Check local stream
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

        // Check remote stream
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

        // Check transceivers
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

        // Get WebRTC stats
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

        // Force play remote video/audio
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

        // Full diagnostic - PROPERLY AWAIT ALL ASYNC OPERATIONS
        fullDiagnostic: async () => {
          console.log("\n\n");
          console.log("═══════════════════════════════════════");
          console.log("       FULL DIAGNOSTIC REPORT");
          console.log("═══════════════════════════════════════\n");

          // Run all checks
          (window as any).debugVideoCall.checkService();
          (window as any).debugVideoCall.checkLocalStream();
          (window as any).debugVideoCall.checkRemoteStream();
          (window as any).debugVideoCall.checkTransceivers();

          // Wait for async stats
          await (window as any).debugVideoCall.getStats();

          console.log("═══════════════════════════════════════");
          console.log("       END DIAGNOSTIC REPORT");
          console.log("═══════════════════════════════════════\n\n");

          // Return summary
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

        // Quick status check
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

    // Create immediately on mount
    createDebugCommands();

    // Recreate every 3 seconds to ensure persistence
    const persistInterval = setInterval(() => {
      if (!(window as any).debugVideoCall) {
        console.log("🔧 Recreating debug commands...");
        createDebugCommands();
      }
    }, 3000);

    return () => {
      clearInterval(persistInterval);
      // Keep debug commands available even after unmount
    };
  }, []); // Run once on mount
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

        // ✅ Wait for video refs with timeout
        let attempts = 0;
        while ((!localVideoRef.current || !remoteVideoRef.current) && attempts < 20) {
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

  // Socket event handlers - FIXED VERSION
  useEffect(() => {
    if (!webrtcServiceRef.current) return;

    let socket: any;
    let cleanupFn: (() => void) | undefined;

    const setupHandlers = async () => {
      try {
        socket = await waitForSocket(15000);
        console.log("✅ Socket ready for signaling:", socket.id);
      } catch (err) {
        console.error("❌ Socket timeout");
        setError("Connection timeout");
        return;
      }

      // ✅ CRITICAL FIX: Handle offer (for NON-initiator)
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
          // ✅ Set remote description FIRST
          await webrtcServiceRef.current.setRemoteDescription(data.offer);
          console.log("✅ Remote description (offer) set");

          // ✅ Create and send answer
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

      // ✅ CRITICAL FIX: Handle answer (for initiator)
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

      // ✅ Handle ICE candidates
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

      // ✅ Handle call ended
      const handleCallEnded = (data: { endedBy?: string; reason?: string }) => {
        console.log("📴 Call ended by remote");
        if (!callEndedRef.current) {
          callEndedRef.current = true;
          cleanup(false);
          onEndCall();
          setTimeout(() => router.push("/"), 300);
        }
      };

      // ✅ Register all handlers
      socket.on("offer", handleOffer);
      socket.on("answer", handleAnswer);
      socket.on("ice-candidate", handleIceCandidate);
      socket.on("call-ended", handleCallEnded);

      console.log("✅ Signaling handlers registered");

      cleanupFn = () => {
        socket.off("offer", handleOffer);
        socket.off("answer", handleAnswer);
        socket.off("ice-candidate", handleIceCandidate);
        socket.off("call-ended", handleCallEnded);
      };
    };

    setupHandlers();

    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, [roomId, onEndCall, router]);

  // ✅ NEW: Ensure window.peerConnection persists
  // ✅ FIXED: Ensure window objects persist - use state instead of ref

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
    console.log("\n🎥 ===== INITIALIZING CALL (FIXED) =====");

    try {
      setError(null);

      if (!user?._id) {
        throw new Error("User not authenticated");
      }

      // ✅ Socket setup
      if (!isSocketConnected()) {
        console.log("🔌 Initializing socket...");
        initializeSocket(user._id);
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

      // ✅ Create WebRTC service
      console.log("🔧 Creating WebRTC service...");
      webrtcServiceRef.current = new WebRTCService();
      recordingServiceRef.current = new RecordingService();

      // ✅ Get media stream
      console.log("🎤 Getting media stream...");
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

      // ✅ Set local stream
      webrtcServiceRef.current.setLocalStream(stream);

      // ✅ Attach to local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Local always muted
        await localVideoRef.current.play().catch(console.error);
        console.log("✅ Local video attached");
      }

      // ✅ Setup event listeners BEFORE adding tracks
      console.log("🔧 Setting up event listeners...");
      webrtcServiceRef.current.setupEventListeners(
        async (remoteStream: MediaStream) => {
          console.log("\n🎬 ===== REMOTE STREAM CALLBACK =====");

          if (remoteStreamReceivedRef.current) {
            console.log("⚠️ Already processed");
            return;
          }
          remoteStreamReceivedRef.current = true;

          if (!remoteStream || !remoteVideoRef.current) {
            console.error("❌ Missing stream or video element");
            return;
          }

          // Force enable all tracks
          remoteStream.getTracks().forEach((t) => {
            t.enabled = true;
            console.log(`✅ Enabled ${t.kind}: ${t.label}`);
          });

          // Attach to video element
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.volume = 1.0;

          try {
            await remoteVideoRef.current.play();
            console.log("✅ Remote video playing");
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
          if (remoteStream.getAudioTracks().length > 0) {
            await setupRemoteAudio(remoteStream);
          }

          console.log("===== REMOTE STREAM SETUP COMPLETE =====\n");
        },
        (candidate: RTCIceCandidate) => {
          const socket = getSocket();
          socket.emit("ice-candidate", roomId, candidate);
        }
      );

      // ✅ Add local stream to peer connection
      console.log("📤 Adding local stream to peer...");
      await webrtcServiceRef.current.addLocalStreamToPeer();

      // ✅ Join room
      console.log("🚪 Joining room:", roomId);
      socket.emit("join-room", roomId, user._id);

      // ✅ CRITICAL: Handle signaling based on role
      if (isInitiator) {
        console.log("👑 I am INITIATOR - waiting for peer to join...");

        // Wait for peer to be ready
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.log("⏰ Timeout waiting for peer, creating offer anyway");
            resolve();
          }, 10000);

          socket.once("both-users-ready", () => {
            console.log("✅ Both users ready!");
            clearTimeout(timeout);
            resolve();
          });

          socket.once("user-joined-room", (data: any) => {
            console.log("✅ Peer joined room:", data);
            clearTimeout(timeout);
            setTimeout(resolve, 500); // Small delay
          });
        });

        // Create and send offer
        console.log("📝 Creating offer...");
        const offer = await webrtcServiceRef.current.createOffer();
        console.log("📤 Sending offer...");
        socket.emit("offer", roomId, offer);
        console.log("✅ Offer sent");
      } else {
        console.log("🙋 I am RECEIVER - waiting for offer...");
        // Offer handler is in the useEffect above
      }

      // ✅ Expose to window for debugging
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
      // ✅ Step 1: Resume AudioContext first
      await ensureAudioContextResumed();

      // ✅ Step 2: Play video unmuted
      if (remoteVideoRef.current) {
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.volume = 1.0;
        await remoteVideoRef.current.play();
        console.log("✅ Video playing with audio");
      }

      // ✅ Step 3: Play backup audio element
      if (remoteAudioRef.current) {
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.volume = 1.0;
        await remoteAudioRef.current.play();
        console.log("✅ Backup audio playing");
      }

      // ✅ Step 4: Resume AudioContext if exists
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
        console.log("✅ AudioContext resumed");
      }

      setConnectionStatus("connected");
      setShowPlayButton(false);
      setError(null);
    } catch (err: any) {
      console.error("❌ Manual play failed:", err);
      setError("⚠️ Could not start playback - try again");
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



  // ✅ ALWAYS render the container and video elements
  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden touch-none">
      {/* ✅ Video elements MUST always be in the DOM */}
   {/* ✅ Video elements - ALWAYS in DOM from first render */}
      <video
        ref={remoteVideoRef}
        id="remote-video"
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover absolute inset-0"
        style={{
          backgroundColor: "#000",
        }}
        onLoadedMetadata={async (e) => {
          console.log("✅ Remote video metadata loaded");
          const video = e.currentTarget;
          try {
            video.muted = false;
            video.volume = 1.0;
            await video.play();
            console.log("✅ Remote video playing");
          } catch (err: any) {
            console.error("❌ Autoplay blocked:", err.name);
            setShowPlayButton(true);
          }
        }}
      />

      {/* Local video - ALWAYS in DOM */}
      <div className="absolute bottom-24 sm:bottom-28 right-2 sm:right-6 w-32 h-24 sm:w-64 sm:h-48 rounded-lg overflow-hidden border-2 border-white shadow-2xl bg-black z-20">
        <video
          ref={localVideoRef}
          id="local-video"
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {!isVideoEnabled && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <VideoOff className="w-12 h-12 text-gray-400" />
          </div>
        )}
      </div>

      {/* ✅ OVERLAY 1: Start Call Screen (highest z-index) */}
      {!userInteracted && (
        <div className="absolute inset-0 bg-black z-50 flex items-center justify-center">
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
              onClick={() => {
                console.log("🎬 ===== START CALL BUTTON CLICKED =====");
                setUserInteracted(true);
              }}
              className="px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-lg shadow-2xl transition-all transform hover:scale-105 active:scale-95"
            >
              🎥 START CALL
            </button>
          </div>
        </div>
      )}

      {/* ✅ OVERLAY 2: Initializing Screen */}
      {userInteracted && !isInitialized && (
        <div className="absolute inset-0 bg-black/95 z-40 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h1 className="text-white text-2xl font-bold mb-2">
              {initError ? "Initialization Failed" : "Initializing Call..."}
            </h1>
            <p className="text-gray-400 mb-4">{initStep}</p>

            {initError && (
              <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-4">
                <p className="text-red-300 text-sm mb-3">{initError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Debug info */}
            <div className="mt-6 text-left bg-gray-900 p-4 rounded-lg">
              <p className="text-xs text-gray-400 font-mono">
                Step: {initStep}
              </p>
              <p className="text-xs text-gray-400 font-mono">
                webrtcService: {String(!!webrtcServiceRef.current)}
              </p>
              <p className="text-xs text-gray-400 font-mono">
                localVideoRef: {String(!!localVideoRef.current)}
              </p>
              <p className="text-xs text-gray-400 font-mono">
                remoteVideoRef: {String(!!remoteVideoRef.current)}
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Main UI - only visible when initialized */}
      {isInitialized && (
        <>
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent p-3 sm:p-6 z-10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-white text-lg sm:text-2xl font-bold truncate">
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
              {isRecording && (
                <div className="flex items-center gap-2 sm:gap-3 bg-red-600/90 px-3 py-2 sm:px-6 sm:py-3 rounded-full animate-pulse">
                  <Circle className="w-3 h-3 sm:w-4 sm:h-4 fill-white" />
                  <span className="text-white text-sm sm:text-lg font-bold">
                    {formatTime(recordingTime)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Play Button */}
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
            <div className="absolute top-14 sm:top-24 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-red-600/95 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-lg z-30 shadow-2xl text-center">
              <p className="font-semibold text-sm sm:text-base">{error}</p>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent px-2 py-3 sm:p-8 z-20">
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <button
                onClick={toggleAudio}
                className={`p-3 sm:p-4 rounded-full transition-all shadow-lg ${
                  isAudioEnabled
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isAudioEnabled ? (
                  <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                ) : (
                  <MicOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                )}
              </button>
              <button
                onClick={toggleVideo}
                className={`p-3 sm:p-4 rounded-full transition-all shadow-lg ${
                  isVideoEnabled
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isVideoEnabled ? (
                  <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                ) : (
                  <VideoOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                )}
              </button>
              <button
                onClick={toggleScreenShare}
                className={`p-3 sm:p-4 rounded-full transition-all shadow-lg ${
                  isScreenSharing
                    ? "bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400/50"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                <MonitorUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={connectionStatus !== "connected"}
                className={`p-3 sm:p-4 rounded-full transition-all shadow-lg disabled:opacity-50 ${
                  isRecording
                    ? "bg-red-600 hover:bg-red-700 ring-2 ring-red-400/50"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                <Circle
                  className={`w-5 h-5 sm:w-6 sm:h-6 text-white ${
                    isRecording ? "fill-white" : ""
                  }`}
                />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-3 sm:p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all shadow-lg"
              >
                <Maximize className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
              <button
                onClick={handleEndCall}
                disabled={isEndingCallRef.current}
                className="p-4 sm:p-6 rounded-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 transition-all shadow-xl ml-2 sm:ml-4"
              >
                <PhoneOff className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default VideoCall;
