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

// Windows Audio Device Tester
// 🔥 COMPLETE FIX FOR MUTED TRACKS
// Replace the ensureAudioNotMuted function (around line 40-85)

// 🔥 REPLACE Lines 40-85 in VideoCall.tsx
const ensureAudioNotMuted = async (): Promise<MediaStream> => {
  console.log("🔧 Getting media with Windows audio fix...");

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

    // Step 3: Try USB microphone FIRST (your "USB Audio and HID")
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
            sampleRate: 48000, // Higher sample rate
            channelCount: 1,
          },
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        // Wait for track initialization
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const audioTrack = stream.getAudioTracks()[0];

        // Force enable and verify
        audioTrack.enabled = true;

        if (audioTrack.readyState === "live" && !audioTrack.muted) {
          console.log(`✅ SUCCESS! Using ${usbMic.label}`);
          return stream;
        }

        console.warn("USB mic not ready, trying next...");
        stream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        console.warn(`USB mic failed: ${err.message}`);
      }
    }

    // Step 4: Fallback to default
    console.log("📌 Trying default microphone...");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
      },
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));
    const audioTrack = stream.getAudioTracks()[0];
    audioTrack.enabled = true;

    if (audioTrack.readyState === "live" && !audioTrack.muted) {
      console.log("✅ Default mic working");
      return stream;
    }

    throw new Error("All microphones failed");
  } catch (err: any) {
    console.error("❌ Media access failed:", err);

    if (err.name === "NotAllowedError") {
      throw new Error("🚫 Camera/mic blocked! Click 🔒 in address bar → Allow");
    } else if (err.name === "NotReadableError") {
      throw new Error(
        "⚠️ Microphone in use. Close Zoom/Teams/Discord and refresh."
      );
    }

    throw err;
  }
};
// 🔥 NEW: Verify audio track is actually producing sound
const verifyAudioTrack = async (track: MediaStreamTrack): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(
        new MediaStream([track])
      );
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let checkCount = 0;
      const maxChecks = 5;

      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        console.log(
          `🎤 Audio level check ${
            checkCount + 1
          }/${maxChecks}: ${average.toFixed(2)}`
        );

        checkCount++;

        // Consider it working if we detect ANY sound level > 0
        // OR if track properties look good
        if (average > 0 || checkCount >= maxChecks) {
          const isWorking =
            average > 0 || (track.readyState === "live" && !track.muted);
          console.log(isWorking ? "✅ Audio verified" : "⚠️ No audio detected");
          audioContext.close();
          resolve(isWorking);
        } else {
          setTimeout(checkAudio, 200);
        }
      };

      setTimeout(checkAudio, 500);
    } catch (error) {
      console.error("❌ Audio verification failed:", error);
      resolve(true); // Assume working if we can't verify
    }
  });
};
// Helper to wait for track to be ready - ADD THIS BEFORE VideoCall component
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

  useEffect(() => {
    const resumeAudioContext = async () => {
      try {
        const AudioContext =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          if (ctx.state === "suspended") {
            await ctx.resume();
            console.log("✅ Audio context resumed");
          }
          ctx.close();
        }
      } catch (err) {
        console.warn("⚠️ Could not resume audio context:", err);
      }
    };

    resumeAudioContext();
  }, []);

  useEffect(() => {
    const enablePlayback = async () => {
      console.log("👆 User clicked - enabling playback");

      if (remoteVideoRef.current) {
        try {
          await remoteVideoRef.current.play();
          console.log("✅ Video resumed");
        } catch (err) {
          console.error("Still blocked:", err);
        }
      }
    };

    document.addEventListener("click", enablePlayback, { once: true });
    return () => document.removeEventListener("click", enablePlayback);
  }, []);

  useEffect(() => {
    const handleFirstClick = async () => {
      console.log("🎵 User clicked - forcing audio playback");
      const audioElements = document.querySelectorAll("audio");
      audioElements.forEach(async (audio) => {
        try {
          if (audio.paused) {
            await audio.play();
            console.log("✅ Audio resumed after click");
          }
        } catch (err) {
          console.error("❌ Could not play audio:", err);
        }
      });
    };

    document.addEventListener("click", handleFirstClick, { once: true });
    return () => document.removeEventListener("click", handleFirstClick);
  }, []);

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

  // REPLACE THIS ENTIRE useEffect (around line 270-290)
  // This is the one that calls initializeCall()

  useEffect(() => {
    console.log("🔄 Mount effect triggered, roomId:", roomId);

    if (!roomId) {
      console.error("❌ No roomId provided!");
      setError("Invalid room ID");
      return;
    }

    // Prevent double initialization
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

    // Small delay to ensure DOM is ready
    const timer = setTimeout(init, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      console.log("🧹 Unmounting...");
      if (initializedRef.current && !callEndedRef.current) {
        cleanup(false);
      }
    };
  }, [roomId]); // Add roomId as  roomId dependency to prevent re-init

  const initializeCall = async () => {
    try {
      setError(null);
      console.log("\n🎥 ===== INITIALIZING CALL =====");
      console.log("   Room ID:", roomId);
      console.log("   Is Initiator:", isInitiator);
      console.log("   User:", user?._id);

      let socket;
      try {
        socket = await waitForSocket(10000);
        console.log("✅ Socket ready:", socket.id);
      } catch (err) {
        setError("Connection failed. Please refresh the page.");
        return;
      }

      webrtcServiceRef.current = new WebRTCService();
      recordingServiceRef.current = new RecordingService();

      const pc = webrtcServiceRef.current.getPeerConnection();
      if (pc) {
        (window as any).peerConnection = pc;
        console.log(
          "✅ PeerConnection exposed globally as window.peerConnection"
        );
      }

      let localStream: MediaStream;
      try {
        console.log("🎤 Requesting media with Windows audio fix...");
        localStream = await ensureAudioNotMuted();

        console.log("✅ Local stream obtained");
        console.log("   Video tracks:", localStream.getVideoTracks().length);
        console.log("   Audio tracks:", localStream.getAudioTracks().length);

        const audioTrack = localStream.getAudioTracks()[0];

        if (!audioTrack) {
          throw new Error("Audio track missing!");
        }

        console.log("🎤 Final audio track:", {
          enabled: audioTrack.enabled,
          muted: audioTrack.muted,
          readyState: audioTrack.readyState,
          label: audioTrack.label,
        });

        if (audioTrack.muted) {
          throw new Error(
            "Audio track is muted. Microphone may be in use by another app."
          );
        }

        localStream.getTracks().forEach((track) => {
          track.enabled = true;
          console.log(`   ✅ Forced ${track.kind} enabled:`, track.enabled);
        });

        webrtcServiceRef.current.setLocalStream(localStream);
      } catch (error: any) {
        console.error("❌ Media access failed:", error);

        if (error.message.includes("No working microphone")) {
          setError(
            "All microphones are muted or in use. Please close other apps."
          );
        } else if (
          error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError"
        ) {
          setError(
            "Camera/microphone blocked! Click the camera icon in address bar."
          );
        } else if (error.name === "NotFoundError") {
          setError("No camera or microphone found.");
        } else if (error.name === "NotReadableError") {
          setError(
            "Camera/microphone in use by another app. Please close it and try again."
          );
        } else {
          setError("Failed to access camera/microphone: " + error.message);
        }
        return;
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.muted = true;
        console.log("✅ Local video element set");

        try {
          await localVideoRef.current.play();
        } catch (e) {
          console.warn("⚠️ Local video autoplay blocked");
        }
      }
      // 🔥 FIXED: Single attachment point for remote stream
      let remoteStreamAttached = false;
      const pendingTracks = { audio: false, video: false };

      webrtcServiceRef.current.setupEventListeners(
        async (remoteStream: MediaStream) => {
          console.log("\n🎬 ===== REMOTE STREAM CALLBACK =====");

          if (!remoteStream) {
            console.error("❌ Remote stream is null");
            return;
          }

          const audioTracks = remoteStream.getAudioTracks();
          const videoTracks = remoteStream.getVideoTracks();

          console.log("📊 Stream status:", {
            streamId: remoteStream.id,
            audioTracks: audioTracks.length,
            videoTracks: videoTracks.length,
            alreadyAttached: remoteStreamAttached,
          });

          // Update pending tracks
          if (audioTracks.length > 0) pendingTracks.audio = true;
          if (videoTracks.length > 0) pendingTracks.video = true;

          // 🔥 CRITICAL: Only attach once we have BOTH tracks
          if (
            pendingTracks.audio &&
            pendingTracks.video &&
            !remoteStreamAttached
          ) {
            remoteStreamAttached = true;

            console.log("✅ Both tracks ready, attaching stream...");

            // Force enable all tracks
            audioTracks[0].enabled = true;
            videoTracks[0].enabled = true;

            if (!remoteVideoRef.current) {
              console.error("❌ Remote video element not found");
              return;
            }

            // 🔥 Set srcObject only ONCE
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.autoplay = true;
            remoteVideoRef.current.playsInline = true;
            remoteVideoRef.current.muted = false;

            console.log("✅ Stream attached to video element");

            // 🔥 Attempt playback with retry
            let playAttempts = 0;
            const tryPlay = async () => {
              try {
                await remoteVideoRef.current!.play();
                console.log("✅ Remote video playing!");
                setConnectionStatus("connected");
                setError(null);
              } catch (err: any) {
                playAttempts++;
                console.error(
                  `❌ Play attempt ${playAttempts} failed:`,
                  err.name
                );

                if (err.name === "NotAllowedError" && playAttempts < 3) {
                  // Wait for user interaction
                  setError("🔊 Click anywhere to enable audio/video");

                  const handleInteraction = async () => {
                    try {
                      await remoteVideoRef.current?.play();
                      console.log("✅ Playback resumed after interaction");
                      setError(null);
                      document.removeEventListener("click", handleInteraction);
                      document.removeEventListener(
                        "touchstart",
                        handleInteraction
                      );
                    } catch (e) {
                      console.error("Still failed:", e);
                    }
                  };

                  document.addEventListener("click", handleInteraction, {
                    once: true,
                  });
                  document.addEventListener("touchstart", handleInteraction, {
                    once: true,
                  });
                } else if (playAttempts < 3) {
                  // Retry after delay
                  setTimeout(tryPlay, 500);
                }
              }
            };

            // Start playback attempt
            await tryPlay();

            // Monitor track health
            audioTracks[0].onended = () => console.error("🛑 AUDIO ENDED");
            videoTracks[0].onended = () => console.error("🛑 VIDEO ENDED");
            audioTracks[0].onmute = () => {
              console.warn("🔇 AUDIO MUTED");
              audioTracks[0].enabled = true;
            };
            videoTracks[0].onmute = () => {
              console.warn("🔇 VIDEO MUTED");
              videoTracks[0].enabled = true;
            };
          } else if (!remoteStreamAttached) {
            console.log("⏳ Waiting for both tracks...", pendingTracks);
          }
        },
        (candidate: RTCIceCandidate) => {
          const socket = getSocket();
          socket.emit("ice-candidate", roomId, candidate);
        }
      );

      // 🔥 HELPER: Attach remote stream to video element
      const attachRemoteStream = async (stream: MediaStream) => {
        console.log("🔗 Attaching stream to video element...");

        if (!remoteVideoRef.current) {
          console.error("❌ Remote video ref not available");
          return;
        }

        // 🔥 CRITICAL: Set srcObject ONCE
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.autoplay = true;
        remoteVideoRef.current.playsInline = true;
        remoteVideoRef.current.muted = false;

        console.log("✅ srcObject set, attempting playback...");

        try {
          await remoteVideoRef.current.play();
          console.log("✅ Remote video playing!");
          setConnectionStatus("connected");
          setError(null);
        } catch (err: any) {
          console.error("❌ Playback failed:", err.name);

          if (err.name === "NotAllowedError" || err.name === "AbortError") {
            setError("🔊 Click anywhere to start audio/video");

            // Try again on user click
            const resumePlayback = async () => {
              try {
                if (remoteVideoRef.current) {
                  await remoteVideoRef.current.play();
                  console.log("✅ Playback resumed after click");
                  setError(null);
                }
              } catch (e) {
                console.error("Still blocked:", e);
              }
            };

            document.addEventListener("click", resumePlayback, { once: true });
          }
        }

        // Monitor tracks
        stream.getAudioTracks()[0].onended = () =>
          console.error("🛑 AUDIO ended!");
        stream.getVideoTracks()[0].onended = () =>
          console.error("🛑 VIDEO ended!");

        console.log("✅ Remote stream fully attached\n");
      };
      webrtcServiceRef.current.addLocalStreamToPeer();

      console.log("📞 Joining room:", roomId);
      socket.emit("join-room", roomId, user?._id || socket.id);

      if (isInitiator) {
        console.log("⏳ Waiting for both users...");

        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.log("⚠️ Timeout, proceeding anyway");
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
        muted={false}
        controls={false}
        className="w-full h-full object-cover absolute inset-0"
        style={{ objectFit: "cover" }}
        onLoadedMetadata={(e) => {
          console.log("✅ Remote video metadata loaded");
          e.currentTarget
            .play()
            .catch((err) => console.error("Play failed:", err));
        }}
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

export default VideoCall;
