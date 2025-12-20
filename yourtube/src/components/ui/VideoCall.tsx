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
// ✅ Audio verification with actual level testing
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

        console.log(`🎤 Audio level check ${checks}/5: ${avg.toFixed(2)}`);

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
    return true; // Optimistic fallback
  }
};
// ✅ Intelligent microphone selection with webcam priority
const ensureAudioNotMuted = async (): Promise<MediaStream> => {
  console.log(
    "🔧 Starting media acquisition with intelligent mic selection..."
  );

  try {
    // Step 1: Request permissions
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
    const videoInputs = devices.filter((d) => d.kind === "videoinput");

    console.log(`📹 Found ${videoInputs.length} cameras`);
    console.log(`🎤 Found ${audioInputs.length} microphones:`);
    audioInputs.forEach((mic, i) => {
      console.log(
        `   ${i + 1}. ${mic.label} (${mic.deviceId.substring(0, 8)}...)`
      );
    });

    // Step 3: Find primary camera
    const camera =
      videoInputs.find(
        (v) =>
          v.label.toLowerCase().includes("hd") ||
          v.label.toLowerCase().includes("camera") ||
          v.label.toLowerCase().includes("video")
      ) || videoInputs[0];

    console.log(`📹 Selected camera: ${camera?.label}`);

    // Step 4: Find microphone - Priority order
    let targetMic = audioInputs.find((mic) => {
      const micLabel = mic.label.toLowerCase();
      const cameraLabel = camera?.label.toLowerCase() || "";

      // Check if mic belongs to camera
      if (cameraLabel.includes("hd") && micLabel.includes("hd")) {
        return true;
      }

      if (
        micLabel.includes("video") ||
        micLabel.includes("camera") ||
        (cameraLabel && micLabel.includes(cameraLabel.split(" ")[0]))
      ) {
        return true;
      }

      return false;
    });

    // Fallback to USB mic
    if (!targetMic) {
      targetMic = audioInputs.find(
        (d) =>
          d.label.toLowerCase().includes("usb") &&
          !d.label.toLowerCase().includes("monitor")
      );
    }

    // Final fallback: default microphone
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

    // Step 5: Request media with specific devices
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

    console.log("📡 Requesting media...");
    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Wait for tracks to initialize
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const audioTrack = stream.getAudioTracks()[0];
    const videoTrack = stream.getVideoTracks()[0];

    console.log("✅ Stream obtained:");
    console.log(`   🎤 Audio: ${audioTrack.label}`);
    console.log(`   📹 Video: ${videoTrack.label}`);

    // Force enable
    audioTrack.enabled = true;
    videoTrack.enabled = true;

    // Verify audio
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

      const fallbackAudio = fallbackStream.getAudioTracks()[0];
      console.log("✅ Using fallback microphone:", fallbackAudio.label);

      return fallbackStream;
    }

    console.log("✅ Media acquisition complete with verified audio");
    await new Promise((resolve) => setTimeout(resolve, 500));

    return stream;
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

  // State Management
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
  // ✅ Detect user interaction before starting call
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
  // ✅ Auto-enter fullscreen
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
  // ✅ Resume AudioContext
  useEffect(() => {
    if (!userInteracted) return;

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

    return () => {
      clearTimeout(timer);
    };
  }, [userInteracted]);
  // ✅ Socket event handlers
  useEffect(() => {
    if (!webrtcServiceRef.current) return;

    let socket: any;

    const setupHandlers = async () => {
      try {
        socket = await waitForSocket(15000);
        console.log("✅ Socket ready for event handlers:", socket.id);
      } catch (err) {
        console.error("❌ Socket not ready for handlers");
        setError("Connection timeout. Please refresh.");
        return;
      }

      const handleOffer = async (data: {
        offer: RTCSessionDescriptionInit;
        from: string;
      }) => {
        console.log("\n📥 ===== RECEIVED OFFER =====");
        console.log("   Type:", data.offer.type);
        console.log("   From:", data.from);

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
  }, [roomId, isRecording, onEndCall, router]);
  // ✅ Main initialization effect
  useEffect(() => {
    console.log("🔄 Mount effect triggered, roomId:", roomId);

    if (!roomId) {
      console.error("❌ No roomId provided!");
      setError("Invalid room ID");
      return;
    }

    if (!userInteracted) {
      console.log("⏳ Waiting for user interaction...");
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
  }, [roomId, userInteracted]);
  const initializeCall = async () => {
    try {
      setError(null);
      console.log("\n🎥 ===== INITIALIZING CALL =====");

      // AudioContext resume
      try {
        const AudioContext =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const tempCtx = new AudioContext();
          if (tempCtx.state === "suspended") {
            await tempCtx.resume();
            console.log("✅ AudioContext resumed before call setup");
          }
          tempCtx.close();
        }
      } catch (err) {
        console.warn("⚠️ Could not resume AudioContext:", err);
      }

      // Step 1: Wait for socket
      let socket;
      try {
        socket = await waitForSocket(15000);
        console.log("✅ Socket ready:", socket.id);
      } catch (err) {
        setError("Connection failed. Please refresh the page.");
        return;
      }

      // Step 2: Initialize services
      webrtcServiceRef.current = new WebRTCService();
      recordingServiceRef.current = new RecordingService();

      const pc = webrtcServiceRef.current?.getPeerConnection();
      if (pc) {
        (window as any).peerConnection = pc;
        console.log("✅ PeerConnection exposed as window.peerConnection");
        console.log("   Connection state:", pc.connectionState);
        console.log("   ICE state:", pc.iceConnectionState);
      }

      // Step 3: Get media
      let localStream: MediaStream;
      try {
        console.log("🎤 Requesting media...");
        localStream = await ensureAudioNotMuted();

        const audioTrack = localStream.getAudioTracks()[0];
        const videoTrack = localStream.getVideoTracks()[0];

        if (!audioTrack) {
          throw new Error("Audio track missing!");
        }

        console.log("🎤 Audio:", audioTrack.label);
        console.log("📹 Video:", videoTrack.label);

        localStream.getTracks().forEach((track) => {
          track.enabled = true;
        });

        webrtcServiceRef.current.setLocalStream(localStream);
      } catch (error: any) {
        console.error("❌ Media access failed:", error);
        setError(error.message || "Failed to access camera/microphone");
        return;
      }

      // Step 4: Set local video
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
      // Step 5: Setup remote stream listener
      webrtcServiceRef.current.setupEventListeners(
        async (remoteStream: MediaStream) => {
          console.log("\n🎬 ===== REMOTE STREAM CALLBACK =====");

          if (!remoteStream || !remoteVideoRef.current) {
            console.error("❌ Missing stream or video element");
            return;
          }

          const audioTracks = remoteStream.getAudioTracks();
          const videoTracks = remoteStream.getVideoTracks();

          console.log(
            `📊 Tracks: audio=${audioTracks.length}, video=${videoTracks.length}`
          );

          // Force enable all tracks
          remoteStream.getTracks().forEach((t) => {
            t.enabled = true;
            console.log(`   ✅ Enabled ${t.kind}: ${t.label}`);
          });

          // ✅ CRITICAL FIX: Create dedicated audio element
          console.log("🔊 Creating audio element for remote audio...");

          // Remove any existing audio elements
          document
            .querySelectorAll("#remote-audio-element")
            .forEach((el) => el.remove());

          const audioElement = document.createElement("audio");
          audioElement.id = "remote-audio-element";
          audioElement.autoplay = true;
          audioElement.setAttribute("playsinline", "true");
          audioElement.muted = false;
          audioElement.volume = 1.0;
          audioElement.style.display = "none";

          // Create audio-only stream
          const audioStream = new MediaStream(audioTracks);
          audioElement.srcObject = audioStream;

          document.body.appendChild(audioElement);

          try {
            await audioElement.play();
            console.log("✅ Audio element playing");
          } catch (err: any) {
            console.warn("⚠️ Audio blocked:", err.name);
            setShowPlayButton(true);
          }

          // Clear existing srcObject
          if (remoteVideoRef.current.srcObject) {
            console.log("🔄 Clearing existing srcObject");
            const oldStream = remoteVideoRef.current.srcObject as MediaStream;
            oldStream.getTracks().forEach((t) => t.stop());
            remoteVideoRef.current.srcObject = null;
          }

          await new Promise((resolve) => requestAnimationFrame(resolve));

          // Set video srcObject
          console.log("📺 Setting video srcObject...");
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.autoplay = true;
          remoteVideoRef.current.playsInline = true;
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.volume = 1.0;
          remoteVideoRef.current.load();

          // Wait for metadata
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              console.log("⏰ Metadata timeout");
              resolve();
            }, 5000);

            if (remoteVideoRef.current!.readyState >= 2) {
              clearTimeout(timeout);
              console.log("✅ Metadata already loaded");
              resolve();
            } else {
              remoteVideoRef.current!.onloadedmetadata = () => {
                clearTimeout(timeout);
                console.log("✅ Metadata loaded");
                resolve();
              };
            }
          });

          // Try play with retry
          let playAttempts = 0;
          const tryPlay = async (): Promise<boolean> => {
            try {
              console.log(`▶️ Play attempt ${++playAttempts}...`);

              if (!document.contains(remoteVideoRef.current)) {
                console.error("❌ Video element not in DOM!");
                return false;
              }

              await remoteVideoRef.current!.play();
              console.log("✅ VIDEO PLAYING!");
              setConnectionStatus("connected");
              setError(null);
              setShowPlayButton(false);
              return true;
            } catch (err: any) {
              console.error(`❌ Play failed (${err.name}):`, err.message);

              if (err.name === "NotAllowedError") {
                console.log("🔊 Autoplay blocked - need user gesture");
                setShowPlayButton(true);
                setError("🔊 Tap the play button to start");

                return new Promise((resolve) => {
                  const handleInteraction = async () => {
                    try {
                      await remoteVideoRef.current?.play();
                      await audioElement.play();
                      console.log("✅ Resumed after user gesture!");
                      setConnectionStatus("connected");
                      setError(null);
                      setShowPlayButton(false);
                      resolve(true);
                    } catch (e) {
                      console.error("❌ Still failed:", e);
                      resolve(false);
                    }
                    cleanup();
                  };

                  const cleanup = () => {
                    document.removeEventListener("click", handleInteraction);
                    document.removeEventListener(
                      "touchstart",
                      handleInteraction
                    );
                    document.removeEventListener("keydown", handleInteraction);
                  };

                  document.addEventListener("click", handleInteraction, {
                    once: true,
                  });
                  document.addEventListener("touchstart", handleInteraction, {
                    once: true,
                  });
                  document.addEventListener("keydown", handleInteraction, {
                    once: true,
                  });
                });
              } else if (err.name === "AbortError" && playAttempts < 3) {
                await new Promise((r) => setTimeout(r, 500));
                return tryPlay();
              }

              return false;
            }
          };

          const success = await tryPlay();
          if (!success && !showPlayButton) {
            setShowPlayButton(true);
            setError("⚠️ Tap play button to start video");
          }

          console.log("✅ Remote stream setup complete\n");
        },
        (candidate: RTCIceCandidate) => {
          const socket = getSocket();
          socket.emit("ice-candidate", roomId, candidate);
          console.log("❄️ ICE candidate sent");
        }
      );
      // Step 6: Add local stream
      webrtcServiceRef.current.addLocalStreamToPeer();

      // Step 7: Join room
      console.log("📞 Joining room:", roomId);
      socket.emit("join-room", roomId, user?._id || socket.id);

      // Step 8: Initiator flow
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

          // Verify transceivers after offer
          if (pc) {
            const transceivers = pc.getTransceivers();
            console.log("\n🔍 Post-offer verification:");
            transceivers.forEach((t, i) => {
              console.log(`   Transceiver ${i}:`, {
                kind: t.sender.track?.kind,
                direction: t.direction,
                senderEnabled: t.sender.track?.enabled,
                senderMuted: t.sender.track?.muted,
              });
            });
          }
        } catch (error) {
          console.error("❌ Offer error:", error);
        }
      } else {
        console.log("⏳ Waiting for offer...");
      }

      // Connection monitoring
      if (pc) {
        const checkConnection = setInterval(() => {
          if (
            pc.connectionState === "connected" &&
            pc.iceConnectionState === "connected"
          ) {
            console.log("✅ Connection verified");
            webrtcServiceRef.current?.logConnectionStats();
            clearInterval(checkConnection);
          } else if (
            pc.connectionState === "failed" ||
            pc.iceConnectionState === "failed"
          ) {
            console.error("❌ Connection failed!");
            setError("Connection failed - please refresh");
            clearInterval(checkConnection);
          }
        }, 2000);

        setTimeout(() => clearInterval(checkConnection), 30000);
      }

      console.log("===== INITIALIZATION COMPLETE =====\n");
    } catch (error: any) {
      console.error("❌ Initialization error:", error);
      setError(error.message || "Failed to initialize call");
    }
  };
  const cleanup = (emitEvent: boolean = true) => {
    console.log("🧹 Cleanup starting...");

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

  const handlePlayClick = async () => {
    try {
      console.log("🎬 Manual play triggered");

      // Play audio
      const audioEl = document.getElementById(
        "remote-audio-element"
      ) as HTMLAudioElement;
      if (audioEl) {
        await audioEl.play();
        console.log("✅ Audio resumed");
      }

      // Play video
      if (remoteVideoRef.current) {
        await remoteVideoRef.current.play();
        console.log("✅ Video resumed");
        setConnectionStatus("connected");
      }

      setShowPlayButton(false);
      setError(null);
    } catch (err) {
      console.error("❌ Manual play failed:", err);
      setError("Playback failed - please try again");
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
            onClick={() => setUserInteracted(true)}
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
      {/* Remote Video (Main) */}
      <video
        ref={remoteVideoRef}
        id="remote-video"
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover absolute inset-0"
        style={{
          backgroundColor: "#000",
          objectFit: "cover",
        }}
        onLoadedMetadata={async (e) => {
          console.log("✅ Video metadata loaded");
          try {
            await e.currentTarget.play();
            console.log("✅ Video playing after metadata");
          } catch (err) {
            console.warn("Autoplay blocked:", err);
            setShowPlayButton(true);
          }
        }}
        onCanPlay={async (e) => {
          console.log("✅ Video can play");
          try {
            await e.currentTarget.play();
          } catch (err) {
            console.warn("Play blocked:", err);
            setShowPlayButton(true);
          }
        }}
        onPlay={() => {
          console.log("✅ Video PLAYING");
          setConnectionStatus("connected");
          setError(null);
          setShowPlayButton(false);
        }}
        onPause={() => {
          console.warn("⚠️ Video PAUSED - attempting resume");
          remoteVideoRef.current?.play().catch(console.error);
        }}
        onError={(e) => {
          console.error("❌ Video error:", e);
          setError("Video playback error - tap play button");
          setShowPlayButton(true);
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

      {/* Local Video (PiP) */}
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