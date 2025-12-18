/* eslint-disable react-hooks/exhaustive-deps */
// src/components/ui/VideoCall.tsx
// COMPLETE FIXED VERSION - Replace your entire file with this

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
const resumeAudioContext = async (): Promise<void> => {
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        await ctx.resume();
        console.log("✅ AudioContext resumed");
      }
      ctx.close();
    }
  } catch (err) {
    console.warn("⚠️ Could not resume AudioContext:", err);
  }
};
// Windows Audio Device Tester
const ensureAudioNotMuted = async (): Promise<MediaStream> => {
  console.log("🔧 Windows Audio Fix: Ensuring microphone is not muted...");

  const devices = await navigator.mediaDevices.enumerateDevices();
  const audioInputs = devices.filter((d) => d.kind === "audioinput");

  if (audioInputs.length === 0) {
    throw new Error("No microphone found");
  }

  console.log(
    `   Found ${audioInputs.length} audio inputs:`,
    audioInputs.map((d) => d.label || d.deviceId)
  );

  // 🔥 TRY DEFAULT DEVICE FIRST (respects Windows settings)
  const defaultDevice = audioInputs.find(
    (d) => d.deviceId === "default" || d.label.toLowerCase().includes("default")
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
        },
        video: false,
      });

      const audioTrack = testStream.getAudioTracks()[0];

      if (!audioTrack.muted) {
        console.log("✅ Default device works! Using:", defaultDevice.label);

        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        const fullStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: defaultDevice.deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video:
            videoDevices.length > 0
              ? {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                }
              : false,
        });

        audioTrack.stop();
        return fullStream;
      }

      audioTrack.stop();
    } catch (err) {
      console.warn("⚠️ Default device failed, trying others...");
    }
  }

  // 🔥 FALLBACK: Test devices in order (old behavior)
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
        },
        video: false,
      });

      const audioTrack = testStream.getAudioTracks()[0];

      if (audioTrack.muted) {
        console.warn(`   ❌ Device ${i + 1} is MUTED`);
        audioTrack.stop();
        continue;
      }

      const isProducingAudio = await new Promise<boolean>((resolve) => {
        try {
          const AudioContext =
            (window as any).AudioContext || (window as any).webkitAudioContext;
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

      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      const fullStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: device.deviceId ? { exact: device.deviceId } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          videoDevices.length > 0
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : false,
      });

      return fullStream;
    } catch (err: any) {
      console.error(`   ❌ Device ${i + 1} error:`, err.message);
      continue;
    }
  }

  throw new Error("No working microphone found");
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
  const [remoteAudioStatus, setRemoteAudioStatus] = useState<string>("waiting");

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
  const [needsInteraction, setNeedsInteraction] = useState(true);
  const [readyToStart, setReadyToStart] = useState(false);

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

          // Cleanup without emitting (remote already ended)
          if (isRecording && recordingServiceRef.current) {
            recordingServiceRef.current.stopRecording();
          }

          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
          }

          // Stop all media
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
  }, [roomId, webrtcServiceRef.current]);

  useEffect(() => {
    if (initializingRef.current || initializedRef.current) {
      console.log("⚠️ Skipping duplicate initialization");
      return;
    }

    // 🔥 WAIT for user interaction
    if (!readyToStart) {
      console.log("⏳ Waiting for user to click 'Start Call'");
      return;
    }

    initializingRef.current = true;

    const init = async () => {
      await initializeCall();
      initializedRef.current = true;
      initializingRef.current = false;
    };

    init();

    return () => {
      if (initializedRef.current && !callEndedRef.current) {
        cleanup(false);
      }
      initializedRef.current = false;
      initializingRef.current = false;
    };
  }, [roomId, readyToStart]); // 🔥 Add readyToStart dependency

  const initializeCall = async () => {
    try {
      setError(null);
      setConnectionStatus("connecting");
      console.log("\n🎥 ===== INITIALIZING CALL =====");
      console.log("   Room ID:", roomId);
      console.log("   Is Initiator:", isInitiator);
      console.log("   User:", user?._id);

      let socket;
      try {
        socket = await waitForSocket(10000);
        console.log("✅ Socket ready:", socket.id);
      } catch (err) {
        console.error("❌ Socket connection failed:", err);
        setError("Connection failed. Please refresh the page.");
        setConnectionStatus("failed");
        return;
      }

      webrtcServiceRef.current = new WebRTCService();
      recordingServiceRef.current = new RecordingService();

      const pc = webrtcServiceRef.current.getPeerConnection();
      if (pc) {
        (window as any).peerConnection = pc;
        console.log("✅ PeerConnection created");

        // ✅ CRITICAL: Log connection state changes
        pc.onconnectionstatechange = () => {
          console.log("🔗 Connection state:", pc.connectionState);
          if (pc.connectionState === "connected") {
            setConnectionStatus("connected");
            setError(null);
          } else if (pc.connectionState === "failed") {
            setConnectionStatus("failed");
            setError("Connection failed. Please try again.");
          } else if (pc.connectionState === "disconnected") {
            setConnectionStatus("disconnected");
          }
        };

        // ✅ CRITICAL: Log ICE connection state
        pc.oniceconnectionstatechange = () => {
          console.log("❄️ ICE state:", pc.iceConnectionState);
        };
      }

      let localStream: MediaStream;
      try {
        console.log("🎤 Requesting media...");

        // ✅ FIX: Resume AudioContext BEFORE requesting media
        await resumeAudioContext();

        localStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            facingMode: "user",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        console.log("✅ Media stream obtained");
        console.log("   Video tracks:", localStream.getVideoTracks().length);
        console.log("   Audio tracks:", localStream.getAudioTracks().length);

        localStream.getTracks().forEach((track) => {
          // ✅ FIX: Force enable all tracks
          track.enabled = true;
          console.log(`   ${track.kind} track:`, {
            id: track.id,
            label: track.label,
            enabled: track.enabled,
            readyState: track.readyState,
            muted: track.muted,
          });
        });

        webrtcServiceRef.current.setLocalStream(localStream);
      } catch (error: any) {
        console.error("❌ Media access failed:", error);
        let errorMessage = "Failed to access camera/microphone";
        if (
          error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError"
        ) {
          errorMessage =
            "Camera/microphone access denied. Please allow permissions.";
        } else if (error.name === "NotFoundError") {
          errorMessage = "No camera or microphone found.";
        } else if (error.name === "NotReadableError") {
          errorMessage = "Camera/microphone in use by another app.";
        }
        setError(errorMessage);
        setConnectionStatus("failed");
        return;
      }

      if (localVideoRef.current && localStream) {
        console.log("🎬 Setting up local video element");

        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.muted = true;
        localVideoRef.current.playsInline = true;
        localVideoRef.current.autoplay = true;

        try {
          await localVideoRef.current.play();
          console.log("✅ Local video playing");
        } catch (e: any) {
          console.warn("⚠️ Local video autoplay blocked:", e.message);

          // Set up click handler to start video
          const startVideo = async () => {
            try {
              await localVideoRef.current?.play();
              console.log("✅ Local video started after interaction");
            } catch (err) {
              console.error("❌ Failed to start local video:", err);
            }
          };
          document.addEventListener("click", startVideo, { once: true });
        }
      }
      webrtcServiceRef.current.setupEventListeners(
        async (remoteStream: MediaStream) => {
          console.log("\n🎬 ===== REMOTE STREAM RECEIVED =====");
          console.log("   Audio tracks:", remoteStream.getAudioTracks().length);
          console.log("   Video tracks:", remoteStream.getVideoTracks().length);

          await new Promise((resolve) => setTimeout(resolve, 100));

          if (!remoteVideoRef.current) {
            console.error("❌ Remote video ref not available");
            return;
          }

          // 🔥 CRITICAL: Clear old streams and elements
          await resumeAudioContext();

          // Clear old streams
          if (remoteVideoRef.current.srcObject) {
            const oldStream = remoteVideoRef.current.srcObject as MediaStream;
            oldStream.getTracks().forEach((t) => t.stop());
          }

          const remoteAudio = remoteStream.getAudioTracks()[0];
          const remoteVideo = remoteStream.getVideoTracks()[0];

          if (!remoteAudio) {
            console.error("❌ No remote audio track!");
            setError("No audio from remote user");
          }

          if (!remoteVideo) {
            console.error("❌ No remote video track!");
            setError("No video from remote user");
          }

          // Enable tracks
          remoteAudio?.addEventListener("unmute", () => {
            console.log("🔊 Remote audio unmuted");
            setRemoteAudioStatus("active");
          });

          if (remoteAudio) {
            remoteAudio.enabled = true;
            remoteAudio.addEventListener("unmute", () => {
              console.log("🔊 Remote audio unmuted");
              setRemoteAudioStatus("active");
            });
          }
          if (remoteVideo) remoteVideo.enabled = true;

          const videoElement = remoteVideoRef.current;
          videoElement.srcObject = remoteStream;
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.muted = false;
          videoElement.volume = 1.0;

          console.log("✅ Remote video element configured");

          if ("setSinkId" in videoElement) {
            try {
              const devices = await navigator.mediaDevices.enumerateDevices();
              const audioOutputs = devices.filter(
                (d) => d.kind === "audiooutput"
              );
              console.log(
                "🔊 Available outputs:",
                audioOutputs.map((d) => d.label)
              );

              let targetDevice = audioOutputs.find(
                (d) =>
                  d.deviceId !== "default" &&
                  d.deviceId !== "communications" &&
                  !d.label.toLowerCase().includes("communications")
              );

              if (!targetDevice) {
                targetDevice = audioOutputs.find(
                  (d) => d.deviceId === "default"
                );
              }

              if (targetDevice) {
                console.log("🎯 Setting audio output to:", targetDevice.label);
                await (videoElement as any).setSinkId(targetDevice.deviceId);
                console.log("✅ Audio output device set");
              }
            } catch (err: any) {
              console.error("❌ setSinkId failed:", err);
            }
          }
          // Play video with retries
          const playWithRetries = async (
            attempt: number = 1
          ): Promise<void> => {
            if (attempt > 3) {
              console.warn("⚠️ Autoplay blocked - need user interaction");
              setError("Click anywhere to start audio/video");
              setNeedsInteraction(true);
              return;
            }

            try {
              await new Promise((r) => setTimeout(r, 100 * attempt));
              await resumeAudioContext();
              await videoElement.play();

              console.log("✅ REMOTE VIDEO+AUDIO PLAYING!", {
                paused: videoElement.paused,
                volume: videoElement.volume,
                muted: videoElement.muted,
              });

              setRemoteAudioStatus("active");
              setConnectionStatus("connected");
              setError(null);
              setNeedsInteraction(false);
            } catch (err: any) {
              console.error(`❌ Play attempt ${attempt} failed:`, err.name);
              return playWithRetries(attempt + 1);
            }
          };

          await playWithRetries();

          // Monitor tracks
          remoteStream.getTracks().forEach((track) => {
            track.onended = () => {
              console.warn(`⏹️ Remote ${track.kind} track ended`);
              if (track.kind === "audio") setRemoteAudioStatus("ended");
            };
            track.onmute = () => {
              console.warn(`🔇 Remote ${track.kind} muted`);
              if (track.kind === "audio") setRemoteAudioStatus("muted");
            };
            track.onunmute = () => {
              console.log(`🔊 Remote ${track.kind} unmuted`);
              if (track.kind === "audio") {
                setRemoteAudioStatus("active");
                if (videoElement.paused) {
                  videoElement.play().catch(console.error);
                }
              }
            };
          });

          console.log("✅ Remote stream setup complete");
        },
        (candidate: RTCIceCandidate) => {
          const socket = getSocket();
          console.log("❄️ Sending ICE candidate");
          socket.emit("ice-candidate", roomId, candidate);
        }
      );

      // ✅ CRITICAL: Add local stream to peer connection
      webrtcServiceRef.current.addLocalStreamToPeer();
      console.log("✅ Local stream added to peer connection");

      // ✅ Join room
      console.log("📞 Joining room:", roomId);
      socket.emit("join-room", roomId, user?._id || socket.id);

      if (isInitiator) {
        console.log("⏳ Waiting for both users...");

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.log("⏰ Timeout, proceeding with offer");
            resolve();
          }, 5000);

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
          console.error("❌ Offer creation failed:", error);
          setError("Failed to create call offer");
        }
      } else {
        console.log("⏳ Waiting for offer...");
      }

      console.log("===== INITIALIZATION COMPLETE =====\n");
    } catch (error: any) {
      console.error("❌ Initialization error:", error);
      setError(error.message || "Failed to initialize call");
      setConnectionStatus("failed");
    }
  };

  // 🔥 IMPROVED CLEANUP FUNCTION
  const cleanup = (emitEvent: boolean = true) => {
    console.log("🧹 Cleanup starting...");

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

    if (isRecording && recordingServiceRef.current) {
      recordingServiceRef.current.stopRecording();
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

    // Stop local video
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => {
        track.stop();
        console.log(`Stopped local ${track.kind} track`);
      });
      localVideoRef.current.srcObject = null;
    }

    // Stop remote video
    if (remoteVideoRef.current?.srcObject) {
      const stream = remoteVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => {
        track.stop();
        console.log(`Stopped remote ${track.kind} track`);
      });
      remoteVideoRef.current.srcObject = null;
    }

    // Close WebRTC
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.close();
      webrtcServiceRef.current = null;
    }

    delete (window as any).peerConnection;

    // Only emit if explicitly requested and not already ended
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
    }
  };

  const toggleScreenShare = async () => {
    try {
      const socket = getSocket();
      if (!isScreenSharing) {
        await webrtcServiceRef.current?.startScreenShare(true);
        socket.emit("start-screen-share", roomId);
        setIsScreenSharing(true);
      } else {
        await webrtcServiceRef.current?.stopScreenShare();
        socket.emit("stop-screen-share", roomId);
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error("Screen share error:", error);
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
    } catch (error: any) {
      console.error("Recording error:", error);
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

    try {
      if (isRecording) {
        stopRecording();
      }

      // Emit end-call BEFORE cleanup
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

      cleanup(false); // Don't emit again
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
      } else {
        await document.exitFullscreen();
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
      <video
        ref={remoteVideoRef}
        id="remote-video"
        autoPlay
        playsInline
        className="w-full h-full object-cover absolute inset-0"
      />

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
      {needsInteraction && (
        <div
          className="absolute inset-0 bg-black/95 flex items-center justify-center z-50 cursor-pointer"
          onClick={async () => {
            console.log("👆 User clicked - starting media");

            // ✅ FIX: Resume AudioContext on interaction
            await resumeAudioContext();

            // ✅ FIX: Try to play all video elements
            try {
              if (localVideoRef.current && localVideoRef.current.srcObject) {
                await localVideoRef.current.play();
                console.log("✅ Local video started");
              }

              if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
                await remoteVideoRef.current.play();
                console.log("✅ Remote video started");
              }
            } catch (err) {
              console.error("❌ Failed to start videos:", err);
            }

            setNeedsInteraction(false);
            setReadyToStart(true);
          }}
        >
          <div className="text-center px-4">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <svg
                className="w-10 h-10 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <h2 className="text-white text-2xl font-bold mb-3">
              Click to Start Call
            </h2>
            <p className="text-gray-300 text-base mb-2">
              with {remotePeerName}
            </p>
            <p className="text-gray-500 text-sm">
              Click anywhere to enable camera and microphone
            </p>
          </div>
        </div>
      )}

      {/* Local Video Preview - Mobile Optimized */}
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

      {/* Header - Mobile Optimized */}
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

          {/* Recording Indicator - Mobile Optimized */}
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

      {/* Error Message - Mobile Optimized */}
      {error && (
        <div className="absolute top-14 sm:top-24 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-red-600/95 text-white px-3 py-2 sm:px-6 sm:py-4 rounded-lg z-30 sm:max-w-md text-center shadow-2xl text-xs sm:text-base">
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {/* Bottom Controls - Mobile Optimized - KEEP ALL BUTTONS */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent px-2 py-3 sm:p-8 z-20 safe-area-bottom">
        <div className="flex items-center justify-center gap-1.5 xs:gap-2 sm:gap-3 md:gap-4">
          {/* Audio Button */}
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

          {/* Video Button */}
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

          {/* Screen Share Button - KEPT */}
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

          {/* Recording Button - KEPT */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={connectionStatus !== "connected"}
            className={`p-2.5 xs:p-3 sm:p-4 md:p-5 rounded-full transition-all shadow-lg disabled:opacity-50 touch-manipulation ${
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

          {/* Fullscreen Button - KEPT */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 xs:p-3 sm:p-4 md:p-5 rounded-full bg-gray-700 hover:bg-gray-600 active:bg-gray-500 transition-all shadow-lg touch-manipulation"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            <Maximize className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
          </button>

          {/* End Call Button - Slightly Larger */}
          <button
            onClick={handleEndCall}
            disabled={isEndingCallRef.current}
            className="p-3 xs:p-3.5 sm:p-5 md:p-6 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-gray-600 transition-all shadow-xl ml-1 sm:ml-4 touch-manipulation"
            aria-label="End call"
          >
            <PhoneOff className="w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
<style jsx global>{`
  #remote-video,
  #local-video,
  video {
    background: #000;
    object-fit: cover;
  }

  /* Ensure video elements are always visible */
  video::-webkit-media-controls {
    display: none !important;
  }

  /* Force hardware acceleration */
  video {
    transform: translateZ(0);
    -webkit-transform: translateZ(0);
    will-change: transform;
  }

  /* Prevent video from being optimized away */
  video {
    min-width: 1px;
    min-height: 1px;
  }
`}</style>;

export default VideoCall;
