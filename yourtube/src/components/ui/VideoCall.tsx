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

// ✅ OPTIMIZED: Simplified audio verification with optimistic validation
const verifyAudioTrack = async (track: MediaStreamTrack): Promise<boolean> => {
  console.log("🎤 Audio track validation:", {
    readyState: track.readyState,
    muted: track.muted,
    enabled: track.enabled,
    label: track.label,
  });

  const isValid = track.readyState === "live" && !track.muted && track.enabled;

  if (!isValid) {
    console.warn("⚠️ Audio track not ready yet");
  }

  return isValid;
};

// ✅ KEPT: Helper to wait for track readiness (useful for USB mic scenarios)
const waitForTrackReady = (
  track: MediaStreamTrack,
  kind: string
): Promise<void> => {
  return new Promise((resolve) => {
    if (track.readyState === "live" && !track.muted) {
      console.log(`✅ ${kind} track ready immediately`);
      resolve();
      return;
    }

    console.log(`⏳ Waiting for ${kind} track...`);
    let resolved = false;

    const checkReady = () => {
      if (track.readyState === "live" && !track.muted && !resolved) {
        resolved = true;
        console.log(`✅ ${kind} track became ready`);
        resolve();
      }
    };

    track.addEventListener("unmute", checkReady, { once: true });
    const interval = setInterval(checkReady, 100);

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        clearInterval(interval);
        console.log(`⏰ ${kind} track timeout - proceeding anyway`);
        resolve();
      }
    }, 5000);
  });
};
// ✅ MERGED: Best of both - Enhanced media acquisition with Windows audio fix + simplified fallback
const ensureAudioNotMuted = async (): Promise<MediaStream> => {
  console.log("🔧 Getting media with enhanced audio handling...");

  try {
    // Step 1: Request permissions FIRST
    const permStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    permStream.getTracks().forEach((t) => t.stop());
    console.log("✅ Permissions granted");

    // Step 2: Wait for device enumeration
    await new Promise((resolve) => setTimeout(resolve, 500));

    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((d) => d.kind === "audioinput");

    console.log(`🎤 Found ${audioInputs.length} microphones`);

    // Step 3: Try USB microphone FIRST (if available)
    const usbMic = audioInputs.find(
      (d) =>
        d.label.toLowerCase().includes("usb") &&
        !d.label.toLowerCase().includes("monitor")
    );

    if (usbMic) {
      console.log(`🎯 Trying USB mic: ${usbMic.label}`);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: usbMic.deviceId },
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

        // Small delay for USB mic initialization
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const audioTrack = stream.getAudioTracks()[0];
        audioTrack.enabled = true;

        const isAudioWorking = await verifyAudioTrack(audioTrack);
        if (
          isAudioWorking &&
          audioTrack.readyState === "live" &&
          !audioTrack.muted
        ) {
          console.log(`✅ SUCCESS! Using ${usbMic.label}`);
          return stream;
        }

        console.warn("USB mic not ready, trying next...");
        stream.getTracks().forEach((t) => t.stop());
      } catch (err: any) {
        console.warn(`USB mic failed: ${err.message}`);
      }
    }

    // Step 4: Fallback to default microphone
    console.log("📌 Trying default microphone...");
    const stream = await navigator.mediaDevices.getUserMedia({
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

    // Small delay for track initialization
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Force enable all tracks
    stream.getTracks().forEach((track) => {
      track.enabled = true;
    });

    const audioTrack = stream.getAudioTracks()[0];
    const isAudioWorking = await verifyAudioTrack(audioTrack);

    if (
      isAudioWorking &&
      audioTrack.readyState === "live" &&
      !audioTrack.muted
    ) {
      console.log("✅ Default mic working");
      return stream;
    }

    // If verification failed but we have a stream, proceed anyway (optimistic)
    if (audioTrack && audioTrack.readyState === "live") {
      console.warn("⚠️ Audio verification incomplete, but proceeding");
      return stream;
    }

    throw new Error("All microphones failed");
  } catch (err: any) {
    console.error("❌ Media access failed:", err);

    if (
      err.name === "NotAllowedError" ||
      err.name === "PermissionDeniedError"
    ) {
      throw new Error("🚫 Camera/mic blocked! Click 🔒 in address bar → Allow");
    } else if (err.name === "NotReadableError") {
      throw new Error(
        "⚠️ Microphone in use. Close Zoom/Teams/Discord and refresh."
      );
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

  // ✅ State Management
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [remoteAudioStatus, setRemoteAudioStatus] = useState<string>("waiting");

  // ✅ Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const webrtcServiceRef = useRef<WebRTCService | null>(null);
  const recordingServiceRef = useRef<RecordingService | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callEndedRef = useRef(false);
  const isEndingCallRef = useRef(false);
  const initializingRef = useRef(false);
  const initializedRef = useRef(false);
  // ✅ Auto-enter fullscreen on mount
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
          console.log("✅ Entered fullscreen mode");
        }
      } catch (error) {
        console.warn("⚠️ Fullscreen not supported or blocked:", error);
      }
    };

    enterFullscreen();

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
  }, []);
  // ✅ Resume AudioContext on user interaction
  useEffect(() => {
    const resumeAudioContext = () => {
      const AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;

      if (AudioContext) {
        console.log("🎤 Attempting to resume AudioContext...");

        const ctx = new AudioContext();
        if (ctx.state === "suspended") {
          ctx
            .resume()
            .then(() => {
              console.log("✅ AudioContext resumed");
              ctx.close();
            })
            .catch((err) => {
              console.error("❌ AudioContext resume failed:", err);
            });
        } else {
          console.log("✅ AudioContext already running");
          ctx.close();
        }
      }
    };

    const timer = setTimeout(resumeAudioContext, 1000);

    const events = ["click", "touchstart", "keydown"];
    events.forEach((evt) => {
      document.addEventListener(evt, resumeAudioContext, { once: true });
    });

    return () => {
      clearTimeout(timer);
      events.forEach((evt) => {
        document.removeEventListener(evt, resumeAudioContext);
      });
    };
  }, []);
  // ✅ Socket event handlers
  useEffect(() => {
    if (!webrtcServiceRef.current) return;

    let socket: any;

    const setupHandlers = async () => {
      try {
        socket = await waitForSocket(5000);
        console.log("✅ Socket ready for event handlers:", socket.id);
      } catch (err) {
        console.error("❌ Socket not ready for handlers");
        return;
      }

      const handleOffer = async (data: {
        offer: RTCSessionDescriptionInit;
        from: string;
      }) => {
        console.log("\n📥 ===== RECEIVED OFFER =====");
        console.log("   Type:", data.offer.type);
        console.log("   From:", data.from);
        console.log("   SDP length:", data.offer.sdp?.length);

        if (!webrtcServiceRef.current) {
          console.error("❌ WebRTC service not available");
          return;
        }

        try {
          await webrtcServiceRef.current.setRemoteDescription(data.offer);
          console.log("✅ Remote description set");

          const answer = await webrtcServiceRef.current.createAnswer();
          console.log("✅ Answer created");

          socket.emit("answer", roomId, answer);
          console.log("📤 Answer sent to room:", roomId);
        } catch (error) {
          console.error("❌ Error handling offer:", error);
        }
      };

      const handleAnswer = async (data: {
        answer: RTCSessionDescriptionInit;
        from: string;
      }) => {
        console.log("\n📥 ===== RECEIVED ANSWER =====");
        console.log("   Type:", data.answer.type);
        console.log("   From:", data.from);
        console.log("   SDP length:", data.answer.sdp?.length);

        if (!webrtcServiceRef.current) {
          console.error("❌ WebRTC service not available");
          return;
        }

        try {
          await webrtcServiceRef.current.setRemoteDescription(data.answer);
          console.log("✅ Remote description set from answer");
        } catch (error) {
          console.error("❌ Error handling answer:", error);
        }
      };

      const handleIceCandidate = async (data: {
        candidate: RTCIceCandidateInit;
        from: string;
      }) => {
        console.log("❄️ Received ICE candidate from:", data.from);

        if (!webrtcServiceRef.current) return;

        if (data.candidate && data.candidate.candidate) {
          try {
            await webrtcServiceRef.current.addIceCandidate(data.candidate);
            console.log("✅ ICE candidate added");
          } catch (error) {
            console.error("❌ Error adding ICE candidate:", error);
          }
        }
      };

      const handleCallEnded = (data: { endedBy?: string; reason?: string }) => {
        console.log("📴 Remote peer ended call", data);
        if (!callEndedRef.current) {
          callEndedRef.current = true;

          if (isRecording && recordingServiceRef.current) {
            recordingServiceRef.current.stopRecording();
          }

          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
          }

          // Clean up all audio elements
          document.querySelectorAll("audio").forEach((audio) => {
            if (audio.srcObject) {
              (audio.srcObject as MediaStream)
                .getTracks()
                .forEach((t) => t.stop());
            }
            audio.pause();
            audio.srcObject = null;
            audio.remove();
          });

          // Clean up video refs
          if (localVideoRef.current?.srcObject) {
            (localVideoRef.current.srcObject as MediaStream)
              .getTracks()
              .forEach((t) => t.stop());
            localVideoRef.current.srcObject = null;
          }

          if (remoteVideoRef.current?.srcObject) {
            (remoteVideoRef.current.srcObject as MediaStream)
              .getTracks()
              .forEach((t) => t.stop());
            remoteVideoRef.current.srcObject = null;
          }

          if (webrtcServiceRef.current) {
            webrtcServiceRef.current.close();
            webrtcServiceRef.current = null;
          }

          delete (window as any).peerConnection;

          onEndCall();
          setTimeout(() => {
            router.push("/");
          }, 300);
        }
      };

      socket.on("offer", handleOffer);
      socket.on("answer", handleAnswer);
      socket.on("ice-candidate", handleIceCandidate);
      socket.on("call-ended", handleCallEnded);

      console.log("✅ All socket event handlers registered");

      return () => {
        socket.off("offer", handleOffer);
        socket.off("answer", handleAnswer);
        socket.off("ice-candidate", handleIceCandidate);
        socket.off("call-ended", handleCallEnded);
      };
    };

    const cleanup = setupHandlers();
    return () => {
      cleanup.then((fn) => fn && fn());
    };
  }, [roomId, webrtcServiceRef.current, isRecording, onEndCall, router]);
  // ✅ Main initialization effect
  useEffect(() => {
    console.log("🔄 Mount effect triggered, roomId:", roomId);

    if (!roomId) {
      console.error("❌ No roomId provided!");
      setError("Invalid room ID");
      return;
    }

    if (initializingRef.current || initializedRef.current) {
      console.log("⚠️ Already initialized, skipping");
      return;
    }

    initializingRef.current = true;

    let mounted = true;

    const init = async () => {
      try {
        console.log("🎬 Starting call initialization...");
        await initializeCall();

        if (mounted) {
          initializedRef.current = true;
          console.log("✅ Initialization complete");
        }
      } catch (error: any) {
        console.error("❌ Init error:", error);
        if (mounted) {
          setError(error.message || "Failed to initialize call");
        }
      } finally {
        initializingRef.current = false;
      }
    };

    const timer = setTimeout(init, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      console.log("🧹 Unmounting...");
      if (initializedRef.current && !callEndedRef.current) {
        cleanup(false);
      }
    };
  }, [roomId]);
  const initializeCall = async () => {
    try {
      setError(null);
      console.log("\n🎥 ===== INITIALIZING CALL =====");
      console.log("   Room ID:", roomId);
      console.log("   Is Initiator:", isInitiator);
      console.log("   User:", user?._id);

      // Step 1: Wait for socket connection
      let socket;
      try {
        socket = await waitForSocket(10000);
        console.log("✅ Socket ready:", socket.id);
      } catch (err) {
        setError("Connection failed. Please refresh the page.");
        return;
      }

      // Step 2: Initialize WebRTC and Recording services
      webrtcServiceRef.current = new WebRTCService();
      recordingServiceRef.current = new RecordingService();

      const pc = webrtcServiceRef.current.getPeerConnection();
      if (pc) {
        (window as any).peerConnection = pc;
        console.log("✅ PeerConnection exposed as window.peerConnection");
        console.log("   Connection state:", pc.connectionState);
        console.log("   ICE state:", pc.iceConnectionState);
      }

      // Step 3: Get local media stream
      let localStream: MediaStream;
      try {
        console.log("🎤 Requesting media with enhanced audio handling...");
        localStream = await ensureAudioNotMuted();

        console.log("✅ Local stream obtained");
        console.log("   Video tracks:", localStream.getVideoTracks().length);
        console.log("   Audio tracks:", localStream.getAudioTracks().length);

        const audioTrack = localStream.getAudioTracks()[0];
        const videoTrack = localStream.getVideoTracks()[0];

        if (!audioTrack) {
          throw new Error("Audio track missing!");
        }

        console.log("🎤 Audio track details:", {
          enabled: audioTrack.enabled,
          muted: audioTrack.muted,
          readyState: audioTrack.readyState,
          label: audioTrack.label,
        });

        console.log("📹 Video track details:", {
          enabled: videoTrack.enabled,
          readyState: videoTrack.readyState,
          label: videoTrack.label,
        });

        // Force enable all tracks
        localStream.getTracks().forEach((track) => {
          track.enabled = true;
        });

        webrtcServiceRef.current.setLocalStream(localStream);
      } catch (error: any) {
        console.error("❌ Media access failed:", error);

        if (
          error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError"
        ) {
          setError(
            "Camera/microphone blocked! Click camera icon in address bar and allow."
          );
        } else if (error.name === "NotFoundError") {
          setError("No camera or microphone found.");
        } else if (error.name === "NotReadableError") {
          setError(
            "Camera/microphone in use. Close other apps (Zoom/Teams/Discord) and refresh."
          );
        } else {
          setError("Failed to access camera/microphone: " + error.message);
        }
        return;
      }

      // Step 4: Set local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.muted = true;
        console.log("✅ Local video element set");

        try {
          await localVideoRef.current.play();
          console.log("✅ Local video playing");
        } catch (e) {
          console.warn("⚠️ Local video autoplay blocked (normal)");
        }
      }

      // Step 5: Setup remote stream event listener
      webrtcServiceRef.current.setupEventListeners(
        async (remoteStream: MediaStream) => {
          console.log("\n🎬 ===== REMOTE STREAM CALLBACK =====");

          if (!remoteStream || !remoteVideoRef.current) {
            console.error("❌ Missing stream or video element");
            return;
          }

          const audioTracks = remoteStream.getAudioTracks();
          const videoTracks = remoteStream.getVideoTracks();

          console.log("📊 Remote stream details:", {
            streamId: remoteStream.id,
            audioTracks: audioTracks.length,
            videoTracks: videoTracks.length,
            audioLabel: audioTracks[0]?.label,
            videoLabel: videoTracks[0]?.label,
          });

          // Log and enable all tracks
          audioTracks.forEach((track, i) => {
            console.log(`🎤 Audio track ${i}:`, {
              id: track.id.substring(0, 8),
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
            });
            track.enabled = true;
          });

          videoTracks.forEach((track, i) => {
            console.log(`📹 Video track ${i}:`, {
              id: track.id.substring(0, 8),
              enabled: track.enabled,
              muted: track.muted,
              readyState: track.readyState,
            });
            track.enabled = true;
          });

          // Attach stream to video element
          if (remoteVideoRef.current.srcObject !== remoteStream) {
            console.log("📺 Attaching remote stream to <video>");
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.autoplay = true;
            remoteVideoRef.current.playsInline = true;
            remoteVideoRef.current.muted = false; // ✅ CRITICAL for audio
          }

          // Wait for video metadata
          console.log("⏳ Waiting for video metadata...");
          await new Promise<void>((resolve) => {
            if (remoteVideoRef.current!.readyState >= 2) {
              console.log("✅ Metadata already loaded");
              resolve();
            } else {
              remoteVideoRef.current!.onloadedmetadata = () => {
                console.log("✅ Metadata loaded via event");
                resolve();
              };
              setTimeout(() => {
                console.log("⏰ Metadata timeout - continuing anyway");
                resolve();
              }, 3000);
            }
          });

          // Attempt playback with retry logic
          const attemptPlay = async (attempt = 1): Promise<void> => {
            if (!remoteVideoRef.current) return;

            console.log(`▶️ Play attempt ${attempt}...`);

            try {
              await remoteVideoRef.current.play();
              console.log("✅ PLAYBACK STARTED SUCCESSFULLY!");
              setConnectionStatus("connected");
              setError(null);
              return;
            } catch (err: any) {
              console.error(`❌ Play failed (${err.name}):`, err.message);

              if (err.name === "NotAllowedError") {
                console.log("🔒 Autoplay blocked - waiting for user click");
                setError("🔊 Click anywhere to enable audio/video");

                const handleUserGesture = async () => {
                  console.log("👆 User clicked!");
                  try {
                    if (remoteVideoRef.current) {
                      await remoteVideoRef.current.play();
                      console.log("✅ Playback resumed!");
                      setConnectionStatus("connected");
                      setError(null);
                    }
                  } catch (e: any) {
                    console.error("❌ Still failed:", e.name);
                  }

                  document.removeEventListener("click", handleUserGesture);
                  document.removeEventListener("touchstart", handleUserGesture);
                };

                document.addEventListener("click", handleUserGesture, {
                  once: true,
                });
                document.addEventListener("touchstart", handleUserGesture, {
                  once: true,
                });
              } else if (attempt < 3) {
                console.log(`🔄 Retrying in 500ms (attempt ${attempt + 1})...`);
                await new Promise((r) => setTimeout(r, 500));
                return attemptPlay(attempt + 1);
              } else {
                setError("⚠️ Video playback failed after 3 attempts");
              }
            }
          };

          await attemptPlay();

          // Health monitoring for audio tracks
          const monitorHealth = () => {
            audioTracks.forEach((track) => {
              if (track.readyState === "live" && track.muted) {
                console.warn("🔇 Audio track muted - attempting recovery");
                track.enabled = false;
                setTimeout(() => {
                  track.enabled = true;
                }, 100);
              }
            });
          };

          const healthCheckInterval = setInterval(monitorHealth, 5000);
          setTimeout(() => clearInterval(healthCheckInterval), 60000);

          console.log("✅ Remote stream setup complete\n");
        },
        (candidate: RTCIceCandidate) => {
          const socket = getSocket();
          socket.emit("ice-candidate", roomId, candidate);
          console.log("❄️ ICE candidate sent");
        }
      );

      // Step 6: Add local stream to peer connection
      webrtcServiceRef.current.addLocalStreamToPeer();

      // Step 7: Join room
      console.log("📞 Joining room:", roomId);
      socket.emit("join-room", roomId, user?._id || socket.id);

      // Step 8: Handle initiator flow
      if (isInitiator) {
        console.log("⏳ Waiting for both users...");

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.log("⏰ Timeout, proceeding anyway");
            resolve();
          }, 10000);

          const handleBothReady = () => {
            console.log("✅ Both users ready");
            clearTimeout(timeout);
            socket.off("both-users-ready", handleBothReady);
            resolve();
          };

          socket.on("both-users-ready", handleBothReady);
        });

        console.log("📤 Creating offer...");
        try {
          const offer = await webrtcServiceRef.current.createOffer();
          console.log("✅ Offer created");
          socket.emit("offer", roomId, offer);
          console.log("📤 Offer sent");
        } catch (error) {
          console.error("❌ Offer error:", error);
        }
      } else {
        console.log("⏳ Waiting for offer...");
      }

      console.log("===== INITIALIZATION COMPLETE =====\n");
    } catch (error: any) {
      console.error("❌ Initialization error:", error);
      setError(error.message || "Failed to initialize call");
    }
  };
  const cleanup = (emitEvent: boolean = true) => {
    console.log("🧹 Cleanup starting...");

    // Clean up audio element monitoring intervals
    document.querySelectorAll("#remote-audio-element").forEach((audio: any) => {
      if (audio._monitorInterval) {
        clearInterval(audio._monitorInterval);
      }
      if (audio._keepAlive) {
        clearInterval(audio._keepAlive);
      }
    });

    // Clear recording interval
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }

    // Stop recording if active
    if (isRecording && recordingServiceRef.current) {
      recordingServiceRef.current.stopRecording();
    }

    // Remove all audio elements
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

    // Clean up local video
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => {
        track.stop();
        console.log(`Stopped local ${track.kind} track`);
      });
      localVideoRef.current.srcObject = null;
    }

    // Clean up remote video
    if (remoteVideoRef.current?.srcObject) {
      const stream = remoteVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => {
        track.stop();
        console.log(`Stopped remote ${track.kind} track`);
      });
      remoteVideoRef.current.srcObject = null;
    }

    // Close WebRTC connection
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.close();
      webrtcServiceRef.current = null;
    }

    // Remove global peer connection reference
    delete (window as any).peerConnection;

    // Emit end call event if requested
    if (emitEvent) {
      try {
        const socket = getSocket();
        socket.emit("end-call", roomId, { endedBy: user?._id });
        console.log("📤 Cleanup sent end-call signal");
      } catch (error) {
        console.error("Socket cleanup error:", error);
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
  return (
    <div
      ref={containerRef}
      className="w-screen h-screen bg-black relative overflow-hidden touch-none"
    >
      {/* ✅ Remote Video (Main) */}
      <video
        ref={remoteVideoRef}
        id="remote-video"
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover absolute inset-0"
        style={{ backgroundColor: "#000" }}
        onLoadedMetadata={() => {
          console.log("✅ Video metadata loaded");
        }}
        onCanPlay={() => {
          console.log("✅ Video can play");
        }}
        onPlay={() => {
          console.log("✅ Video PLAYING");
          setConnectionStatus("connected");
          setError(null);
        }}
        onPause={() => {
          console.warn("⚠️ Video PAUSED");
        }}
        onError={(e) => {
          console.error("❌ Video error:", e);
        }}
      />

      {/* ✅ Connecting Overlay */}
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

      {/* ✅ Local Video (Picture-in-Picture) */}
      <div className="absolute bottom-24 sm:bottom-28 right-2 sm:right-6 w-32 h-24 xs:w-40 xs:h-30 sm:w-64 sm:h-48 rounded-lg sm:rounded-xl overflow-hidden border-2 sm:border-4 border-white shadow-2xl bg-black z-20">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted={true}
          className="w-full h-full object-cover"
        />
        {!isVideoEnabled && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <VideoOff className="w-6 h-6 sm:w-12 sm:h-12 text-gray-400" />
          </div>
        )}
      </div>

      {/* ✅ Top Bar - Peer Info & Recording Status */}
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
              {remoteAudioStatus === "muted" && (
                <span className="text-red-400 text-xs sm:text-sm">🔇</span>
              )}
              {remoteAudioStatus === "active" && (
                <span className="text-green-400 text-xs sm:text-sm">🔊</span>
              )}
            </div>
          </div>
          {/* ✅ Recording Indicator */}
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

      {/* ✅ Error Banner */}
      {error && (
        <div className="absolute top-14 sm:top-24 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-red-600/95 text-white px-3 py-2 sm:px-6 sm:py-4 rounded-lg z-30 sm:max-w-md text-center shadow-2xl text-xs sm:text-base">
          <p className="font-semibold">{error}</p>
          <button
            onClick={async () => {
              const video = remoteVideoRef.current;
              if (video) {
                try {
                  await video.play();
                  console.log("✅ Manual play successful");
                  setConnectionStatus("connected");
                  setError(null);
                } catch (err: any) {
                  console.error("Manual play failed:", err.name);
                }
              }
            }}
            className="mt-2 px-4 py-2 bg-white text-red-600 rounded font-bold hover:bg-gray-100 active:bg-gray-200 transition"
          >
            ▶️ CLICK TO PLAY VIDEO
          </button>
        </div>
      )}

      {/* ✅ Bottom Controls Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent px-2 py-3 sm:p-8 z-20 safe-area-bottom">
        <div className="flex items-center justify-center gap-1.5 xs:gap-2 sm:gap-3 md:gap-4">
          {/* Audio Toggle */}
          <button
            onClick={toggleAudio}
            className={`p-2.5 xs:p-3 sm:p-4 md:p-5 rounded-full transition-all shadow-lg touch-manipulation ${
              isAudioEnabled
                ? "bg-gray-700 hover:bg-gray-600 active:bg-gray-500"
                : "bg-red-600 hover:bg-red-700 active:bg-red-800"
            }`}
            aria-label={isAudioEnabled ? "Mute audio" : "Unmute audio"}
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
                ? "bg-gray-700 hover:bg-gray-600 active:bg-gray-500"
                : "bg-red-600 hover:bg-red-700 active:bg-red-800"
            }`}
            aria-label={isVideoEnabled ? "Turn off video" : "Turn on video"}
          >
            {isVideoEnabled ? (
              <Video className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
            ) : (
              <VideoOff className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
            )}
          </button>

          {/* Screen Share Toggle */}
          <button
            onClick={toggleScreenShare}
            className={`p-2.5 xs:p-3 sm:p-4 md:p-5 rounded-full transition-all shadow-lg touch-manipulation ${
              isScreenSharing
                ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 ring-2 sm:ring-4 ring-blue-400/50"
                : "bg-gray-700 hover:bg-gray-600 active:bg-gray-500"
            }`}
            aria-label={isScreenSharing ? "Stop sharing" : "Share screen"}
          >
            <MonitorUp className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
          </button>

          {/* Recording Toggle */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={connectionStatus !== "connected"}
            className={`p-2.5 xs:p-3 sm:p-4 md:p-5 rounded-full transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation ${
              isRecording
                ? "bg-red-600 hover:bg-red-700 active:bg-red-800 ring-2 sm:ring-4 ring-red-400/50"
                : "bg-gray-700 hover:bg-gray-600 active:bg-gray-500"
            }`}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            <Circle
              className={`w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white ${
                isRecording ? "fill-white" : ""
              }`}
            />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 xs:p-3 sm:p-4 md:p-5 rounded-full bg-gray-700 hover:bg-gray-600 active:bg-gray-500 transition-all shadow-lg touch-manipulation"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            <Maximize className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            disabled={isEndingCallRef.current}
            className="p-3 xs:p-3.5 sm:p-5 md:p-6 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all shadow-xl ml-1 sm:ml-4 touch-manipulation"
            aria-label="End call"
          >
            <PhoneOff className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
export default VideoCall;
