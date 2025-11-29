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
  const defaultDevice = audioInputs.find(d => 
    d.deviceId === "default" || 
    d.label.toLowerCase().includes("default")
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
          video: videoDevices.length > 0 ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          } : false,
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
    
    console.log(`   Testing device ${i + 1}/${audioInputs.length}: ${device.label}`);

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
          const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
          const audioContext = new AudioContext();
          const source = audioContext.createMediaStreamSource(testStream);
          const analyser = audioContext.createAnalyser();
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let checks = 0;

          const check = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
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
        video: videoDevices.length > 0 ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } : false,
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
        (audio.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      audio.pause();
      audio.srcObject = null;
      audio.remove();
    });
    
    if (localVideoRef.current?.srcObject) {
      (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      localVideoRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current?.srcObject) {
      (remoteVideoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
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
  }, [roomId]);

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

      // 🔥 MAIN FIX: Remote stream handler with track waiting
      webrtcServiceRef.current.setupEventListeners(
        async (remoteStream: MediaStream) => {
          console.log("\n🎬 ===== REMOTE STREAM RECEIVED =====");

          if (!remoteStream || !remoteVideoRef.current) {
            console.error("❌ Missing remote stream or video ref");
            return;
          }

          // 🔥 Remove any old audio elements
          document
            .querySelectorAll("#remote-audio-element")
            .forEach((el) => el.remove());

          const remoteAudio = remoteStream.getAudioTracks()[0];
          const remoteVideo = remoteStream.getVideoTracks()[0];

          if (!remoteAudio) {
            console.error("❌ No remote audio track!");
            setError("No audio track received");
            return;
          }

          console.log("🎤 Remote audio track:", {
            id: remoteAudio.id,
            label: remoteAudio.label,
            enabled: remoteAudio.enabled,
            muted: remoteAudio.muted,
            readyState: remoteAudio.readyState,
          });

          // ===== Wait for track to be ready =====
          await new Promise<void>((resolve) => {
            if (remoteAudio.readyState === "live" && !remoteAudio.muted) {
              console.log("✅ Track ready immediately");
              resolve();
            } else {
              console.log("⏳ Waiting for track...");

              let resolved = false;
              const checkReady = () => {
                if (remoteAudio.readyState === "live" && !resolved) {
                  resolved = true;
                  console.log("✅ Track became ready");
                  resolve();
                }
              };

              remoteAudio.addEventListener(
                "unmute",
                () => {
                  console.log("📢 Track unmuted");
                  checkReady();
                },
                { once: true }
              );

              const interval = setInterval(checkReady, 100);

              setTimeout(() => {
                if (!resolved) {
                  resolved = true;
                  clearInterval(interval);
                  console.log("⏰ Timeout - proceeding anyway");
                  resolve();
                }
              }, 5000);
            }
          });

          remoteAudio.enabled = true;

          // ===== VIDEO ELEMENT (muted, for video only) =====
          const videoElement = remoteVideoRef.current;
          videoElement.srcObject = remoteStream;
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.muted = true; // Video element is MUTED
          videoElement.volume = 0;

          // ===== AUDIO ELEMENT (unmuted, for audio only) =====
          const audioElement = document.createElement("audio");
          audioElement.id = "remote-audio-element";
          audioElement.autoplay = true;
          audioElement.muted = false;
          audioElement.volume = 1.0;
          audioElement.style.display = "none";

          // 🔥 CRITICAL: Create NEW MediaStream with ONLY audio track
          const audioOnlyStream = new MediaStream([remoteAudio]);
          audioElement.srcObject = audioOnlyStream;

          console.log("🔊 Created audio element with audio-only stream");

          // ===== Set output device to VG240Y S (your monitor) =====
        if ("setSinkId" in audioElement) {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioOutputs = devices.filter((d) => d.kind === "audiooutput");

    console.log("🔊 Available outputs:");
    audioOutputs.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.label} | ID: ${d.deviceId}`);
    });

    // 🔥 CRITICAL: Find the REAL VG240Y (not the 'default' alias)
    let targetDevice = audioOutputs.find(d => {
      const label = d.label.toLowerCase();
      const isVG240Y = label.includes("vg240y") || label.includes("nvidia high definition audio");
      const isNotAlias = d.deviceId !== "default" && d.deviceId !== "communications";
      return isVG240Y && isNotAlias;
    });

    // Fallback: USB Speakers
    if (!targetDevice) {
      targetDevice = audioOutputs.find(d => 
        d.label.includes("USB Audio") && 
        d.label.includes("Speakers")
      );
    }

    // Last resort: First non-alias device
    if (!targetDevice) {
      targetDevice = audioOutputs.find(d => 
        d.deviceId !== "default" && 
        d.deviceId !== "communications"
      );
    }

    if (targetDevice) {
      console.log("🎯 Attempting to set audio to:", targetDevice.label);
      console.log("   Device ID:", targetDevice.deviceId);
      
      // Set the sink
      await (audioElement as any).setSinkId(targetDevice.deviceId);
      
      const actualSinkId = (audioElement as any).sinkId;
      console.log("✅ Audio routed to:", targetDevice.label);
      console.log("✅ Verified sinkId:", actualSinkId);
      
      // 🔥 VERIFY it's not 'default'
      if (actualSinkId === "default" || actualSinkId === "communications") {
        console.error("❌ FAILED! Still using alias device:", actualSinkId);
        setError("⚠️ Audio routing failed - using wrong device");
      } else {
        console.log("🎉 SUCCESS! Using actual device ID");
        setError(`🔊 AUDIO: ${targetDevice.label}`);
        setTimeout(() => setError(null), 3000);
      }
    } else {
      console.error("❌ No suitable audio output device found!");
      setError("⚠️ No audio device found");
    }
  } catch (err: any) {
    console.error("❌ setSinkId failed:", err.name, err.message);
    setError(`⚠️ Audio routing failed: ${err.message}`);
  }
}

          // Add to DOM
          document.body.appendChild(audioElement);
          console.log("✅ Audio element added to DOM");

          // ===== FORCE PLAY WITH RETRIES =====
          const playAudio = async (attempt: number = 1): Promise<void> => {
            if (attempt > 10) {
              console.error("❌ Failed to play audio after 10 attempts");
              setError("⚠️ Click anywhere to enable audio");
              return;
            }

            try {
              const delay = 100 * attempt;
              console.log(
                `⏳ Play attempt ${attempt}/10 (waiting ${delay}ms)...`
              );

              await new Promise((r) => setTimeout(r, delay));

              // Resume audio context if suspended
              const AudioCtx =
                (window as any).AudioContext ||
                (window as any).webkitAudioContext;
              if (AudioCtx) {
                const ctx = new AudioCtx();
                if (ctx.state === "suspended") {
                  await ctx.resume();
                  console.log("✅ Audio context resumed");
                }
                ctx.close();
              }

              await audioElement.play();

              console.log("✅ AUDIO PLAYING!", {
                paused: audioElement.paused,
                volume: audioElement.volume,
                muted: audioElement.muted,
                currentTime: audioElement.currentTime,
                readyState: audioElement.readyState,
                trackEnabled: remoteAudio.enabled,
                trackMuted: remoteAudio.muted,
              });

              setRemoteAudioStatus("active");
              setError(null);
            } catch (err: any) {
              console.error(`❌ Play attempt ${attempt} failed:`, err.name);

              if (err.name === "NotAllowedError" && attempt >= 3) {
                console.log("🖱️ Waiting for user click...");
                setError("🔊 CLICK ANYWHERE to enable audio");

                const enableAudio = async () => {
                  try {
                    await audioElement.play();
                    console.log("✅ Audio started after click!");
                    setError(null);
                    setRemoteAudioStatus("active");
                  } catch (e) {
                    console.error("❌ Still failed:", e);
                    setError("⚠️ Audio error - check Windows sound settings");
                  }
                };

                document.addEventListener("click", enableAudio, { once: true });
                document.addEventListener(
                  "keydown",
                  (e) => {
                    if (e.code === "Space" || e.code === "Enter") {
                      enableAudio();
                    }
                  },
                  { once: true }
                );
              } else {
                return playAudio(attempt + 1);
              }
            }
          };

          await playAudio();

          // ===== Monitor track state =====
          remoteAudio.onmute = () => {
            console.warn("🔇 Remote muted");
            setRemoteAudioStatus("muted");
          };

          remoteAudio.onunmute = () => {
            console.log("🔊 Remote unmuted");
            setRemoteAudioStatus("active");
            if (audioElement.paused) {
              audioElement.play().catch(console.error);
            }
          };

          remoteAudio.onended = () => {
            console.warn("⏹️ Remote audio ended");
            setRemoteAudioStatus("ended");
            audioElement.remove();
          };

          // ===== Play video =====
          try {
            await videoElement.play();
            console.log("✅ Video playing");
            setConnectionStatus("connected");
          } catch (err: any) {
            console.error("❌ Video play failed:", err);
            if (err.name === "NotAllowedError") {
              document.addEventListener(
                "click",
                async () => {
                  await videoElement.play().catch(console.error);
                },
                { once: true }
              );
            }
          }

          // ===== Keep audio alive =====
          const keepAlive = setInterval(() => {
            if (
              audioElement.paused &&
              remoteAudio.readyState === "live" &&
              !remoteAudio.muted
            ) {
              console.warn("⚠️ Audio paused, restarting...");
              audioElement.play().catch(console.error);
            }
          }, 2000);

          (audioElement as any)._keepAlive = keepAlive;
        },
        (candidate: RTCIceCandidate) => {
          const socket = getSocket();
          console.log("❄️ Sending ICE candidate");
          socket.emit("ice-candidate", roomId, candidate);
        }
      );

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
      await axiosInstance.put(`/call/${callId}/status`, {
        status: "ended",
        duration: Math.floor(recordingTime),
      }).catch(err => console.error("Failed to update call status:", err));
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