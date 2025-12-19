// lib/webrtc.ts - COMPLETE FIXED VERSION

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
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
    console.log("🔧 Creating WebRTC peer connection");
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
  }

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;

    if (stream.getVideoTracks().length > 0) {
      this.originalVideoTrack = stream.getVideoTracks()[0];
    }

    console.log("✅ Local stream set");

    // Force enable all tracks
    stream.getTracks().forEach((track) => {
      track.enabled = true;
      console.log(`   ${track.kind}: ${track.label}`);
      console.log(`      enabled=${track.enabled}, muted=${track.muted}`);
    });
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  addLocalStreamToPeer(): void {
    if (!this.localStream || !this.peerConnection) {
      console.error("❌ Cannot add stream");
      return;
    }

    // Remove existing senders
    this.peerConnection.getSenders().forEach((sender) => {
      if (sender.track) {
        this.peerConnection?.removeTrack(sender);
      }
    });

    // Add all tracks
    this.localStream.getTracks().forEach((track) => {
      track.enabled = true;
      console.log(`➕ Adding ${track.kind} track: ${track.id}`);
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    // ✅ CRITICAL FIX: Force all transceivers to sendrecv
    const transceivers = this.peerConnection.getTransceivers();
    console.log(`📊 Transceivers: ${transceivers.length}`);

    transceivers.forEach((t, i) => {
      if (t.direction !== "sendrecv") {
        t.direction = "sendrecv";
        console.log(`   ✅ Fixed transceiver ${i} to sendrecv`);
      }
    });

    console.log("✅ Local stream added to peer");
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error("Peer not initialized");

    // ✅ Ensure all transceivers are sendrecv
    this.peerConnection.getTransceivers().forEach((t) => {
      if (t.direction !== "sendrecv") {
        t.direction = "sendrecv";
      }
    });

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.peerConnection.setLocalDescription(offer);
    console.log("✅ Offer created");
    console.log("   Audio:", offer.sdp?.includes("m=audio"));
    console.log("   Video:", offer.sdp?.includes("m=video"));

    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error("Peer not initialized");

    // ✅ Ensure all transceivers are sendrecv
    this.peerConnection.getTransceivers().forEach((t) => {
      if (t.direction === "recvonly" && t.sender.track) {
        t.direction = "sendrecv";
      }
    });

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    console.log("✅ Answer created");

    return answer;
  }

  async setRemoteDescription(
    description: RTCSessionDescriptionInit
  ): Promise<void> {
    if (!this.peerConnection) throw new Error("Peer not initialized");

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(description)
    );
    console.log("✅ Remote description set");
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection || !candidate.candidate) return;

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("✅ ICE candidate added");
    } catch (error) {
      console.error("❌ ICE candidate error:", error);
    }
  }

  // ✅ COMPLETELY REWRITTEN: Simplified and fixed
  setupEventListeners(
    onRemoteStream: (stream: MediaStream) => void,
    onIceCandidate: (candidate: RTCIceCandidate) => void
  ): void {
    if (!this.peerConnection) return;

    console.log("🔧 Setting up event listeners");

    let tracksReceived = { audio: false, video: false };
    let callbackFired = false;

    // ✅ FIXED: Immediate track handling
    this.peerConnection.ontrack = (event) => {
      console.log(`\n📥 TRACK RECEIVED: ${event.track.kind}`);
      console.log("   Track ID:", event.track.id);
      console.log("   Enabled:", event.track.enabled);
      console.log("   Muted:", event.track.muted);
      console.log("   Ready:", event.track.readyState);

      // ✅ CRITICAL: Force enable immediately
      event.track.enabled = true;

      // Track received
      if (event.track.kind === "audio") tracksReceived.audio = true;
      if (event.track.kind === "video") tracksReceived.video = true;

      // Get or create remote stream
      if (event.streams && event.streams.length > 0) {
        this.remoteStream = event.streams[0];
      } else if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }

      // Add track if not already present
      if (!this.remoteStream.getTracks().includes(event.track)) {
        this.remoteStream.addTrack(event.track);
        console.log(`   ✅ Added ${event.track.kind} to remote stream`);
      }

      // ✅ FIXED: Fire callback immediately when FIRST track arrives
      // Don't wait for both - the video element can handle progressive loading
      if (!callbackFired) {
        callbackFired = true;
        console.log("✅ FIRING REMOTE STREAM CALLBACK");

        // Force enable all tracks
        this.remoteStream.getTracks().forEach((t) => {
          t.enabled = true;
        });

        // ✅ Small delay to ensure tracks are stable
        setTimeout(() => {
          onRemoteStream(this.remoteStream!);
        }, 100);
      }

      // Monitor track health
      event.track.onended = () => {
        console.error(`🛑 ${event.track.kind} ENDED`);
      };

      event.track.onmute = () => {
        console.warn(`🔇 ${event.track.kind} MUTED`);
      };

      event.track.onunmute = () => {
        console.log(`🔊 ${event.track.kind} UNMUTED`);
      };
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("❄️ ICE candidate:", event.candidate.type);
        onIceCandidate(event.candidate);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log("🧊 ICE state:", state);

      if (state === "connected") {
        console.log("✅ ICE connected");
        setTimeout(() => this.logConnectionStats(), 2000);
      } else if (state === "failed") {
        console.error("❌ ICE connection failed");
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log("🔌 Connection state:", state);
    };

    console.log("✅ Event listeners registered");
  }

  async logConnectionStats(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const stats = await this.peerConnection.getStats();
      let audioBytes = 0;
      let videoBytes = 0;

      stats.forEach((report) => {
        if (report.type === "inbound-rtp") {
          if (report.kind === "audio") {
            audioBytes = report.bytesReceived || 0;
            console.log("🎤 Audio stats:", {
              bytes: report.bytesReceived,
              packets: report.packetsReceived,
              lost: report.packetsLost,
            });
          } else if (report.kind === "video") {
            videoBytes = report.bytesReceived || 0;
            console.log("📹 Video stats:", {
              bytes: report.bytesReceived,
              packets: report.packetsReceived,
              lost: report.packetsLost,
            });
          }
        }
      });

      if (audioBytes === 0) {
        console.error("🚨 NO AUDIO DATA - Check remote peer's microphone!");
      }

      if (videoBytes === 0) {
        console.error("🚨 NO VIDEO DATA - Check remote peer's camera!");
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

      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" as any },
        audio: false,
      } as any);

      if (this.peerConnection && this.localStream) {
        const videoTrack = this.screenStream.getVideoTracks()[0];
        const sender = this.peerConnection
          .getSenders()
          .find((s) => s.track?.kind === "video");

        if (sender) {
          await sender.replaceTrack(videoTrack);
          console.log("✅ Switched to screen share");
        }

        videoTrack.onended = () => {
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
    if (!this.localStream) return;

    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
      console.log(`🎤 Audio ${enabled ? "enabled" : "disabled"}`);
    });
  }

  toggleVideo(enabled: boolean): void {
    if (!this.localStream) return;

    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
      console.log(`📹 Video ${enabled ? "enabled" : "disabled"}`);
    });
  }

  close(): void {
    console.log("🧹 Closing WebRTC");

    [this.localStream, this.screenStream].forEach((stream) => {
      stream?.getTracks().forEach((track) => track.stop());
    });

    this.peerConnection?.close();

    this.localStream = null;
    this.remoteStream = null;
    this.screenStream = null;
    this.peerConnection = null;

    console.log("✅ WebRTC closed");
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
      let lossRate = 0;

      stats.forEach((report) => {
        if (report.type === "inbound-rtp") {
          if (report.kind === "audio" && report.bytesReceived > 0) {
            hasAudio = true;
          }
          if (report.kind === "video" && report.bytesReceived > 0) {
            hasVideo = true;
          }
          const lost = report.packetsLost || 0;
          const received = report.packetsReceived || 0;
          if (received > 0) {
            lossRate = lost / received;
          }
        }
      });

      const quality =
        lossRate < 0.05 ? "good" : lossRate < 0.15 ? "poor" : "none";

      return { audio: hasAudio, video: hasVideo, quality };
    } catch (error) {
      return { audio: false, video: false, quality: "none" };
    }
  }
}