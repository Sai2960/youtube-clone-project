// lib/webrtc.ts - COMPLETE FIXED VERSION WITH AUDIO DIAGNOSTICS
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private originalVideoTrack: MediaStreamTrack | null = null;

  constructor() {
    console.log("🔧 Creating WebRTC peer connection with TURN servers");
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    this.peerConnection.onicegatheringstatechange = () => {
      console.log(
        "🧊 ICE gathering state:",
        this.peerConnection?.iceGatheringState
      );
    };
  }

  s; // 🔥 REPLACE Lines 40-95 in webrtc.ts
  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;

    if (stream.getVideoTracks().length > 0) {
      this.originalVideoTrack = stream.getVideoTracks()[0];
    }

    console.log("✅ Local stream stored");

    // 🔥 CRITICAL: Force enable ALL tracks IMMEDIATELY
    stream.getTracks().forEach((track) => {
      track.enabled = true;

      console.log(`   ${track.kind} track:`, {
        id: track.id,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        label: track.label,
      });

      // 🔥 NEW: Add track event listeners
      track.onended = () => {
        console.error(`🚨 LOCAL ${track.kind} track ENDED unexpectedly!`);
      };

      track.onmute = () => {
        console.warn(`🔇 LOCAL ${track.kind} track MUTED!`);
        // Force unmute
        track.enabled = true;
      };

      // 🔥 CRITICAL: Verify audio track
      if (track.kind === "audio") {
        this.verifyAudioTrack(track);
      }
    });
  }

  // 🔥 NEW: Verify audio track is producing data
  private verifyAudioTrack(track: MediaStreamTrack): void {
    try {
      const AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(
        new MediaStream([track])
      );
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Check audio level multiple times
      let checkCount = 0;
      const maxChecks = 10;

      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        console.log(
          `🎤 Local audio level check ${checkCount + 1}/${maxChecks}:`,
          average.toFixed(2)
        );

        checkCount++;

        if (average > 0) {
          console.log(
            "✅ Local audio is WORKING - detected sound level:",
            average.toFixed(2)
          );
          audioContext.close();
        } else if (checkCount < maxChecks) {
          setTimeout(checkAudio, 300);
        } else {
          console.error(
            "❌ LOCAL AUDIO NOT WORKING - No sound detected after",
            maxChecks,
            "checks"
          );
          console.error("   Possible issues:");
          console.error("   1. Microphone is muted in system settings");
          console.error("   2. Another app is using the microphone");
          console.error("   3. Microphone permissions not granted");
          console.error("   4. Physical microphone issue");
          audioContext.close();
        }
      };

      // Start checking after a small delay
      setTimeout(checkAudio, 500);
    } catch (error) {
      console.error("❌ Audio verification failed:", error);
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  addLocalStreamToPeer(): void {
    if (!this.localStream || !this.peerConnection) {
      console.error("❌ Cannot add stream: missing stream or peer");
      return;
    }

    const senders = this.peerConnection.getSenders();
    console.log(`📊 Current senders: ${senders.length}`);

    senders.forEach((sender) => {
      if (sender.track) {
        this.peerConnection?.removeTrack(sender);
        console.log(`   Removed ${sender.track.kind} sender`);
      }
    });

    // 🔥 CRITICAL: Force enable all tracks before adding
    this.localStream.getTracks().forEach((track) => {
      track.enabled = true;

      console.log(`➕ Adding ${track.kind} track:`, {
        id: track.id,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        label: track.label,
      });

      this.peerConnection?.addTrack(track, this.localStream!);
    });

    const transceivers = this.peerConnection.getTransceivers();
    console.log(`✅ Total transceivers after addTrack: ${transceivers.length}`);
    transceivers.forEach((t, i) => {
      console.log(
        `   Transceiver ${i}: ${t.mid} ${t.direction} ${t.sender.track?.kind}`
      );

      // 🔥 Force sendrecv for all transceivers
      if (t.direction !== "sendrecv") {
        t.direction = "sendrecv";
        console.log(`   ✅ Fixed transceiver ${i} to sendrecv`);
      }
    });

    console.log("✅ Local stream added to peer");
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection)
      throw new Error("Peer connection not initialized");

    const transceivers = this.peerConnection.getTransceivers();
    console.log(`📊 Transceivers before offer: ${transceivers.length}`);

    transceivers.forEach((t, i) => {
      console.log(`   Transceiver ${i}:`, {
        kind: t.sender.track?.kind,
        direction: t.direction,
        mid: t.mid,
        trackEnabled: t.sender.track?.enabled,
        trackMuted: t.sender.track?.muted,
      });

      if (t.direction !== "sendrecv") {
        t.direction = "sendrecv";
        console.log(`   ✅ Fixed transceiver ${i} to sendrecv`);
      }
    });

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.peerConnection.setLocalDescription(offer);
    console.log("✅ Offer created");
    console.log("   Type:", offer.type);
    console.log("   Has audio:", offer.sdp?.includes("m=audio"));
    console.log("   Has video:", offer.sdp?.includes("m=video"));

    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection)
      throw new Error("Peer connection not initialized");

    const transceivers = this.peerConnection.getTransceivers();
    console.log(`📊 Transceivers before answer: ${transceivers.length}`);

    transceivers.forEach((t, i) => {
      console.log(`   Transceiver ${i}:`, {
        kind: t.receiver.track?.kind,
        direction: t.direction,
        mid: t.mid,
      });

      if (t.direction === "recvonly" && t.sender.track) {
        t.direction = "sendrecv";
        console.log(`   ✅ Fixed transceiver ${i} to sendrecv`);
      }
    });

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    console.log("✅ Answer created");
    console.log("   Type:", answer.type);
    console.log("   Has audio:", answer.sdp?.includes("m=audio"));
    console.log("   Has video:", answer.sdp?.includes("m=video"));

    return answer;
  }

  async setRemoteDescription(
    description: RTCSessionDescriptionInit
  ): Promise<void> {
    if (!this.peerConnection)
      throw new Error("Peer connection not initialized");

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(description)
    );
    console.log("✅ Remote description set");
    console.log("   Type:", description.type);

    const transceivers = this.peerConnection.getTransceivers();
    console.log(
      `📊 Transceivers after setRemoteDescription: ${transceivers.length}`
    );
    transceivers.forEach((transceiver, index) => {
      console.log(`   Transceiver ${index}:`, {
        kind: transceiver.receiver.track?.kind,
        direction: transceiver.direction,
        currentDirection: transceiver.currentDirection,
        mid: transceiver.mid,
      });
    });
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection || !candidate.candidate) return;

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log(
        "✅ ICE candidate added:",
        candidate.candidate.substring(0, 50) + "..."
      );
    } catch (error) {
      console.error("❌ ICE candidate error:", error);
    }
  }

  // 🔥 REPLACE Lines 335-430 in src/lib/webrtc.ts
setupEventListeners(
  onRemoteStream: (stream: MediaStream) => void,
  onIceCandidate: (candidate: RTCIceCandidate) => void
): void {
  if (!this.peerConnection) return;

  this.peerConnection.ontrack = (event) => {
    console.log("📥 Remote track received:", event.track.kind);
    console.log("   Track ID:", event.track.id);
    console.log("   Enabled:", event.track.enabled);
    console.log("   Muted:", event.track.muted);
    console.log("   Ready state:", event.track.readyState);
    console.log("   Label:", event.track.label);

    // 🔥 CRITICAL FIX 1: Force enable BEFORE any processing
    event.track.enabled = true;

    // 🔥 CRITICAL FIX 2: Prevent track from being stopped
    const originalStop = event.track.stop.bind(event.track);
    event.track.stop = () => {
      console.warn(`⚠️ Prevented premature stop of ${event.track.kind} track`);
      // Don't actually stop the track
    };

    // 🔥 CRITICAL FIX 3: Handle stream IMMEDIATELY
    if (event.streams && event.streams.length > 0) {
      this.remoteStream = event.streams[0];
      console.log("✅ Using event.streams[0] directly");
      
      // Force enable all tracks in stream
      this.remoteStream.getTracks().forEach((track) => {
        track.enabled = true;
        console.log(`   Force enabled ${track.kind}: ${track.enabled}`);
      });

      // Call callback immediately
      onRemoteStream(this.remoteStream);
    } else {
      // Fallback: create new stream
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        console.log("   Created new MediaStream");
      }
      
      this.remoteStream.addTrack(event.track);
      event.track.enabled = true;
      
      onRemoteStream(this.remoteStream);
    }

    // 🔥 CRITICAL FIX 4: Monitor track health WITHOUT aggressive unmute
    let hasLoggedUnmute = false;
    
    event.track.onmute = () => {
      if (!hasLoggedUnmute) {
        console.warn(`🔇 REMOTE ${event.track.kind} muted`);
        hasLoggedUnmute = true;
      }
      
      // Try to unmute once
      setTimeout(() => {
        event.track.enabled = true;
        console.log(`   Attempted to re-enable ${event.track.kind}`);
      }, 100);
    };

    event.track.onunmute = () => {
      console.log(`✅ REMOTE ${event.track.kind} unmuted`);
      hasLoggedUnmute = false;
    };

    event.track.onended = () => {
      console.error(`🛑 REMOTE ${event.track.kind} track ended`);
      console.error(`   This should NOT happen during active call`);
      console.error(`   Check if remote peer is calling track.stop() somewhere`);
    };

    if (event.transceiver) {
      console.log("   Transceiver direction:", event.transceiver.direction);
      console.log("   Current direction:", event.transceiver.currentDirection);
    }
  };

  // Rest of setupEventListeners stays the same...
  this.peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("❄️ ICE candidate generated:", {
        type: event.candidate.type,
        protocol: event.candidate.protocol,
        address: event.candidate.address || "hidden",
      });
      onIceCandidate(event.candidate);
    } else {
      console.log("✅ ICE gathering complete");
    }
  };

  this.peerConnection.oniceconnectionstatechange = () => {
    const state = this.peerConnection?.iceConnectionState;
    console.log("🧊 ICE connection state:", state);

    if (state === "failed" || state === "disconnected") {
      console.error(
        "❌ ICE connection issue! May need to restart ICE or check TURN servers"
      );
    }
  };

  this.peerConnection.onconnectionstatechange = () => {
    const state = this.peerConnection?.connectionState;
    console.log("🔌 Connection state:", state);

    if (state === "connected") {
      console.log("✅ Peer connection established successfully!");
      setTimeout(() => this.logConnectionStats(), 1000);
    } else if (state === "failed") {
      console.error("❌ Peer connection failed!");
    }
  };

  this.peerConnection.onsignalingstatechange = () => {
    console.log("📡 Signaling state:", this.peerConnection?.signalingState);
  };

  this.peerConnection.onnegotiationneeded = () => {
    console.log("🔄 Negotiation needed event fired");
  };
}

  async logConnectionStats(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const stats = await this.peerConnection.getStats();
      let audioInbound = false;
      let videoInbound = false;
      let audioBytes = 0;
      let videoBytes = 0;

      stats.forEach((report) => {
        if (report.type === "inbound-rtp") {
          if (report.kind === "audio") {
            audioInbound = true;
            audioBytes = report.bytesReceived;
            console.log("🎤 Audio stats:", {
              bytesReceived: report.bytesReceived,
              packetsReceived: report.packetsReceived,
              packetsLost: report.packetsLost,
              jitter: report.jitter,
            });
          } else if (report.kind === "video") {
            videoInbound = true;
            videoBytes = report.bytesReceived;
            console.log("📹 Video stats:", {
              bytesReceived: report.bytesReceived,
              packetsReceived: report.packetsReceived,
              packetsLost: report.packetsLost,
              framesReceived: report.framesReceived,
            });
          }
        }

        if (report.type === "candidate-pair" && report.state === "succeeded") {
          console.log("✅ Active candidate pair:", {
            localCandidateType: report.localCandidateType,
            remoteCandidateType: report.remoteCandidateType,
            bytesReceived: report.bytesReceived,
            bytesSent: report.bytesSent,
          });
        }
      });

      // 🔥 CRITICAL DIAGNOSTIC
      if (!audioInbound || audioBytes === 0) {
        console.error("🚨 NO AUDIO DATA RECEIVED!");
        console.error("   This confirms remote peer is NOT sending audio");
        console.error("   Remote peer needs to check:");
        console.error("   1. System microphone is not muted");
        console.error("   2. Browser has microphone permission");
        console.error("   3. No other app is using microphone");
        console.error("   4. Microphone is properly connected");
      } else {
        console.log("✅ Audio data flowing:", audioBytes, "bytes received");
      }

      if (!videoInbound) {
        console.warn("⚠️ NO VIDEO DATA RECEIVED!");
      }
    } catch (error) {
      console.error("Error getting stats:", error);
    }
  }

  async startScreenShare(
    preferCurrentTab: boolean = true
  ): Promise<MediaStream> {
    try {
      console.log("🖥️ Starting screen share...");

      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: {
          cursor: "always" as any,
          displaySurface: preferCurrentTab ? "browser" : "monitor",
        } as any,
        audio: false,
        preferCurrentTab: preferCurrentTab,
      } as any;

      this.screenStream = await navigator.mediaDevices.getDisplayMedia(
        displayMediaOptions
      );

      if (this.peerConnection && this.localStream) {
        const videoTrack = this.screenStream.getVideoTracks()[0];
        const sender = this.peerConnection
          .getSenders()
          .find((s) => s.track?.kind === "video");

        if (sender) {
          await sender.replaceTrack(videoTrack);
          console.log("✅ Video track replaced with screen");
        }

        videoTrack.onended = () => {
          console.log("🛑 Screen share ended");
          this.stopScreenShare();
        };
      }

      return this.screenStream;
    } catch (error) {
      console.error("❌ Screen share error:", error);
      throw error;
    }
  }

  async stopScreenShare(): Promise<void> {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    if (this.peerConnection && this.originalVideoTrack) {
      const sender = this.peerConnection
        .getSenders()
        .find((s) => s.track?.kind === "video");

      if (sender) {
        await sender.replaceTrack(this.originalVideoTrack);
        console.log("✅ Switched back to camera");
      }
    }
  }

  toggleAudio(enabled: boolean): void {
    if (!this.localStream) {
      console.warn("⚠️ No local stream");
      return;
    }

    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
      console.log(`🎤 Local audio ${enabled ? "enabled" : "disabled"}`);
      console.log("   Track enabled:", track.enabled);
      console.log("   Track muted:", track.muted);
      console.log("   Track state:", track.readyState);
    });
  }

  toggleVideo(enabled: boolean): void {
    if (!this.localStream) {
      console.warn("⚠️ No local stream");
      return;
    }

    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
      console.log(`📹 Local video ${enabled ? "enabled" : "disabled"}`);
      console.log("   Track enabled:", track.enabled);
      console.log("   Track state:", track.readyState);
    });
  }

  close(): void {
    console.log("🧹 Closing WebRTC");

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
        console.log(`   Stopped ${track.kind} track`);
      });
      this.localStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.originalVideoTrack = null;

    console.log("✅ WebRTC closed completely");
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  async getConnectionQuality(): Promise<{
    audio: boolean;
    video: boolean;
    quality: "good" | "poor" | "none";
  }> {
    if (!this.peerConnection) {
      return { audio: false, video: false, quality: "none" };
    }

    try {
      const stats = await this.peerConnection.getStats();
      let hasAudio = false;
      let hasVideo = false;
      let totalPacketsLost = 0;
      let totalPacketsReceived = 0;

      stats.forEach((report) => {
        if (report.type === "inbound-rtp") {
          if (report.kind === "audio" && report.bytesReceived > 0) {
            hasAudio = true;
          }
          if (report.kind === "video" && report.bytesReceived > 0) {
            hasVideo = true;
          }
          totalPacketsLost += report.packetsLost || 0;
          totalPacketsReceived += report.packetsReceived || 0;
        }
      });

      const lossRate =
        totalPacketsReceived > 0 ? totalPacketsLost / totalPacketsReceived : 0;

      const quality =
        lossRate < 0.05 ? "good" : lossRate < 0.15 ? "poor" : "none";

      return { audio: hasAudio, video: hasVideo, quality };
    } catch (error) {
      console.error("Error getting connection quality:", error);
      return { audio: false, video: false, quality: "none" };
    }
  }
}
