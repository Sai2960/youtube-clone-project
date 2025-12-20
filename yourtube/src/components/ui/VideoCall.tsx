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

// ✅ SIMPLIFIED: No AudioContext before user interaction
const getMediaStream = async (): Promise<MediaStream> => {
  console.log("🔧 Requesting media...");

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
  });

  const audioTrack = stream.getAudioTracks()[0];
  const videoTrack = stream.getVideoTracks()[0];

  console.log("✅ Media obtained:");
  console.log(`   🎤 ${audioTrack.label}`);
  console.log(`   📹 ${videoTrack.label}`);

  audioTrack.enabled = true;
  videoTrack.enabled = true;

  return stream;
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

  useEffect(() => {
    if (!webrtcServiceRef.current) return;

    let socket: any;

    const setupHandlers = async () => {
      try {
        socket = await waitForSocket(15000);
        console.log("✅ Socket ready:", socket.id);
      } catch (err) {
        console.error("❌ Socket timeout");
        setError("Connection timeout. Refresh page.");
        return;
      }

      const handleOffer = async (data: { offer: RTCSessionDescriptionInit; from: string }) => {
        console.log("📥 Received offer");
        if (!webrtcServiceRef.current) return;

        try {
          await webrtcServiceRef.current.setRemoteDescription(data.offer);
          const answer = await webrtcServiceRef.current.createAnswer();
          socket.emit("answer", roomId, answer);
          console.log("📤 Answer sent");
        } catch (error) {
          console.error("❌ Offer error:", error);
        }
      };

      const handleAnswer = async (data: { answer: RTCSessionDescriptionInit; from: string }) => {
        console.log("📥 Received answer");
        if (!webrtcServiceRef.current) return;

        try {
          await webrtcServiceRef.current.setRemoteDescription(data.answer);
        } catch (error) {
          console.error("❌ Answer error:", error);
        }
      };

      const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit; from: string }) => {
        if (!webrtcServiceRef.current || !data.candidate?.candidate) return;

        try {
          await webrtcServiceRef.current.addIceCandidate(data.candidate);
        } catch (error) {
          console.error("❌ ICE error:", error);
        }
      };

      const handleCallEnded = () => {
        if (!callEndedRef.current) {
          callEndedRef.current = true;
          cleanup(false);
          onEndCall();
          router.push("/");
        }
      };

      socket.on("offer", handleOffer);
      socket.on("answer", handleAnswer);
      socket.on("ice-candidate", handleIceCandidate);
      socket.on("call-ended", handleCallEnded);

      return () => {
        socket.off("offer");
        socket.off("answer");
        socket.off("ice-candidate");
        socket.off("call-ended");
      };
    };

    const cleanupPromise = setupHandlers();
    return () => {
      cleanupPromise.then((fn) => fn && fn());
    };
  }, [roomId, onEndCall, router]);

  useEffect(() => {
    if (!roomId || !userInteracted || initializingRef.current || initializedRef.current) {
      return;
    }

    initializingRef.current = true;
    let mounted = true;

    const init = async () => {
      try {
        await initializeCall();
        if (mounted) initializedRef.current = true;
      } catch (error: any) {
        if (mounted) setError(error.message);
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

  const initializeCall = async () => {
    try {
      console.log("🎥 Initializing call...");

      const socket = await waitForSocket(15000);

      webrtcServiceRef.current = new WebRTCService();
      recordingServiceRef.current = new RecordingService();

      const localStream = await getMediaStream();
      webrtcServiceRef.current.setLocalStream(localStream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.muted = true;
        await localVideoRef.current.play().catch(() => {});
      }

      webrtcServiceRef.current.setupEventListeners(
        async (remoteStream: MediaStream) => {
          console.log("🎬 Remote stream received");

          if (!remoteVideoRef.current) return;

          const audioTracks = remoteStream.getAudioTracks();
          const videoTracks = remoteStream.getVideoTracks();

          remoteStream.getTracks().forEach((t) => (t.enabled = true));

          // Audio element
          document.querySelectorAll("#remote-audio").forEach((el) => el.remove());
          const audioEl = document.createElement("audio");
          audioEl.id = "remote-audio";
          audioEl.autoplay = true;
          audioEl.muted = false;
          audioEl.volume = 1.0;
          audioEl.srcObject = new MediaStream(audioTracks);
          document.body.appendChild(audioEl);

          await audioEl.play().catch(() => setShowPlayButton(true));

          // Video element
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.autoplay = true;
          remoteVideoRef.current.muted = false;

          await remoteVideoRef.current.play()
            .then(() => {
              setConnectionStatus("connected");
              setError(null);
            })
            .catch(() => setShowPlayButton(true));
        },
        (candidate: RTCIceCandidate) => {
          socket.emit("ice-candidate", roomId, candidate);
        }
      );

      webrtcServiceRef.current.addLocalStreamToPeer();

      socket.emit("join-room", roomId, user?._id || socket.id);

      if (isInitiator) {
        await new Promise((r) => setTimeout(r, 2000));
        const offer = await webrtcServiceRef.current.createOffer();
        socket.emit("offer", roomId, offer);
      }

      console.log("✅ Call initialized");
    } catch (error: any) {
      console.error("❌ Init error:", error);
      setError(error.message);
    }
  };

  const cleanup = (emitEvent: boolean = true) => {
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    if (isRecording && recordingServiceRef.current) recordingServiceRef.current.stopRecording();

    document.querySelectorAll("audio").forEach((audio) => {
      if (audio.srcObject) {
        (audio.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
      audio.pause();
      audio.srcObject = null;
      audio.remove();
    });

    if (localVideoRef.current?.srcObject) {
      (localVideoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current?.srcObject) {
      (remoteVideoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      remoteVideoRef.current.srcObject = null;
    }

    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.close();
      webrtcServiceRef.current = null;
    }

    if (emitEvent) {
      try {
        const socket = getSocket();
        socket.emit("end-call", roomId, { endedBy: user?._id });
      } catch (error) {}
    }
  };

  const toggleAudio = () => {
    if (webrtcServiceRef.current) {
      const newState = !isAudioEnabled;
      webrtcServiceRef.current.toggleAudio(newState);
      setIsAudioEnabled(newState);
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
      setError("Screen sharing failed");
    }
  };

  const startRecording = async () => {
    try {
      const localVideo = localVideoRef.current;
      const remoteVideo = remoteVideoRef.current;
      const localStream = webrtcServiceRef.current?.getLocalStream();
      const remoteStream = webrtcServiceRef.current?.getRemoteStream();

      if (!localVideo || !remoteVideo || !localStream || !remoteStream) return;

      await recordingServiceRef.current?.startRecording(localVideo, remoteVideo, localStream, remoteStream);

      setIsRecording(true);
      setRecordingTime(0);

      const socket = getSocket();
      socket.emit("recording-started", roomId, user?._id);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      setError("Recording failed");
    }
  };

  const stopRecording = () => {
    if (recordingServiceRef.current) recordingServiceRef.current.stopRecording();
    setIsRecording(false);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);

    try {
      const socket = getSocket();
      socket.emit("recording-stopped", roomId, user?._id);
    } catch (error) {}
  };

  const handleEndCall = async () => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;
    isEndingCallRef.current = true;

    if (isRecording) stopRecording();

    try {
      const socket = getSocket();
      socket.emit("end-call", roomId, { endedBy: user?._id });
    } catch (error) {}

    if (callId) {
      await axiosInstance.put(`/call/${callId}/status`, {
        status: "ended",
        duration: Math.floor(recordingTime),
      }).catch(() => {});
    }

    cleanup(false);
    onEndCall();
    router.push("/");
  };

  const handlePlayClick = async () => {
    try {
      const audioEl = document.getElementById("remote-audio") as HTMLAudioElement;
      if (audioEl) await audioEl.play();
      if (remoteVideoRef.current) {
        await remoteVideoRef.current.play();
        setConnectionStatus("connected");
      }
      setShowPlayButton(false);
      setError(null);
    } catch (err) {
      setError("Playback failed");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!userInteracted) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Video className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-white text-3xl font-bold mb-2">Ready to join?</h1>
          <p className="text-gray-400 text-lg mb-8">Tap to start your call</p>
          <button
            onClick={() => setUserInteracted(true)}
            className="px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold rounded-lg shadow-2xl transition"
          >
            🎥 START CALL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black relative overflow-hidden">
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover absolute inset-0"
      />

      {connectionStatus === "connecting" && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-xl">Connecting to {remotePeerName}...</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-28 right-6 w-64 h-48 rounded-xl overflow-hidden border-4 border-white shadow-2xl bg-black z-20">
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        {!isVideoEnabled && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <VideoOff className="w-12 h-12 text-gray-400" />
          </div>
        )}
      </div>

      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent p-6 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white text-2xl font-bold">{remotePeerName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${connectionStatus === "connected" ? "bg-green-500" : "bg-yellow-500 animate-pulse"}`} />
              <p className="text-gray-300 text-sm capitalize">{connectionStatus}</p>
            </div>
          </div>

          {isRecording && (
            <div className="flex items-center gap-3 bg-red-600/90 px-6 py-3 rounded-full animate-pulse">
              <Circle className="w-4 h-4 fill-white text-white" />
              <span className="text-white text-lg font-bold">{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>
      </div>

      {showPlayButton && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50">
          <button onClick={handlePlayClick} className="p-12 rounded-full bg-green-600 hover:bg-green-700 shadow-2xl">
            <Play className="w-16 h-16 text-white" fill="currentColor" />
          </button>
        </div>
      )}

      {error && !showPlayButton && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-600/95 text-white px-6 py-4 rounded-lg z-30 max-w-md text-center shadow-2xl">
          <p className="font-semibold">{error}</p>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-8 z-20">
        <div className="flex items-center justify-center gap-4">
          <button onClick={toggleAudio} className={`p-4 rounded-full ${isAudioEnabled ? "bg-gray-700" : "bg-red-600"}`}>
            {isAudioEnabled ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
          </button>

          <button onClick={toggleVideo} className={`p-4 rounded-full ${isVideoEnabled ? "bg-gray-700" : "bg-red-600"}`}>
            {isVideoEnabled ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
          </button>

          <button onClick={toggleScreenShare} className={`p-4 rounded-full ${isScreenSharing ? "bg-blue-600" : "bg-gray-700"}`}>
            <MonitorUp className="w-6 h-6 text-white" />
          </button>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={connectionStatus !== "connected"}
            className={`p-4 rounded-full disabled:opacity-50 ${isRecording ? "bg-red-600" : "bg-gray-700"}`}
          >
            <Circle className={`w-6 h-6 text-white ${isRecording ? "fill-white" : ""}`} />
          </button>

          <button onClick={handleEndCall} disabled={isEndingCallRef.current} className="p-5 rounded-full bg-red-600 hover:bg-red-700 shadow-xl ml-4">
            <PhoneOff className="w-8 h-8 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;