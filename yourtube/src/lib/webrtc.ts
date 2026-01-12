// lib/webrtc.ts - COMPLETE MERGED FIXED VERSION

interface AudioDiagnostics {
  enabled: boolean;
  muted: boolean;
  readyState: MediaStreamTrackState;
  level: number;
}

interface ConnectionQuality {
  audio: boolean;
  video: boolean;
  quality: "good" | "poor" | "none";
  audioBytes: number;
  videoBytes: number;
  packetLoss: number;
}

interface TrackInfo {
  id: string;
  kind: string;
  enabled: boolean;
  muted: boolean;
  readyState: MediaStreamTrackState;
  label: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
  iceTransportPolicy: "all",
};
export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private originalVideoTrack: MediaStreamTrack | null = null;

  // ✅ CRITICAL: ICE candidate queue
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private remoteDescriptionSet = false;
  private isNegotiating = false;

  private callbackFired = false;
  private eventCleanupHandlers: (() => void)[] = [];

  constructor() {
    console.log("🔧 Creating WebRTCService (MERGED FIXED VERSION)");

    try {
      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
      this.remoteStream = new MediaStream();
      this.setupInternalListeners();
      console.log("✅ RTCPeerConnection created");
    } catch (error) {
      console.error("❌ Failed to create peer connection:", error);
      throw new Error("WebRTC initialization failed");
    }
  }

  private setupInternalListeners(): void {
    if (!this.peerConnection) return;

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log("🧊 ICE State:", this.peerConnection?.iceConnectionState);
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log("🔌 Connection State:", this.peerConnection?.connectionState);
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.log("📡 Signaling State:", this.peerConnection?.signalingState);
      this.isNegotiating = this.peerConnection?.signalingState !== "stable";
    };

    this.peerConnection.onicegatheringstatechange = () => {
      console.log("🧊 ICE Gathering:", this.peerConnection?.iceGatheringState);
    };
  }
  setLocalStream(stream: MediaStream): void {
    console.log("\n📹 Setting Local Stream");
    console.log("   Stream ID:", stream.id);
    console.log("   Active:", stream.active);

    this.localStream = stream;

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      this.originalVideoTrack = videoTracks[0];
    }

    // ✅ Force enable ALL tracks
    stream.getTracks().forEach((track) => {
      track.enabled = true;
      console.log(
        `   ✅ ${track.kind}: ${track.label} enabled=${track.enabled}`
      );
    });
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  async addLocalStreamToPeer(): Promise<void> {
    if (!this.localStream || !this.peerConnection) {
      throw new Error("Cannot add stream: missing stream or peer connection");
    }

    console.log("\n📤 Adding local stream to peer (FIXED)");

    const existingTransceivers = this.peerConnection.getTransceivers();
    console.log(`   Existing transceivers: ${existingTransceivers.length}`);

    // ✅ Add tracks if no transceivers exist
    if (existingTransceivers.length === 0) {
      for (const track of this.localStream.getTracks()) {
        track.enabled = true;
        console.log(`   Adding ${track.kind}: ${track.label}`);

        const sender = this.peerConnection.addTrack(track, this.localStream);

        // Find the transceiver and set direction
        const transceiver = this.peerConnection
          .getTransceivers()
          .find((t) => t.sender === sender);

        if (transceiver) {
          transceiver.direction = "sendrecv";
          console.log(`   ✅ ${track.kind} transceiver → sendrecv`);
        }
      }
    } else {
      // Replace tracks in existing transceivers
      const audioTrack = this.localStream.getAudioTracks()[0];
      const videoTrack = this.localStream.getVideoTracks()[0];

      for (const transceiver of existingTransceivers) {
        const kind =
          transceiver.receiver.track?.kind || transceiver.sender.track?.kind;

        if (kind === "audio" && audioTrack) {
          await transceiver.sender.replaceTrack(audioTrack);
          transceiver.direction = "sendrecv";
          console.log("   ✅ Replaced audio track");
        } else if (kind === "video" && videoTrack) {
          await transceiver.sender.replaceTrack(videoTrack);
          transceiver.direction = "sendrecv";
          console.log("   ✅ Replaced video track");
        }
      }
    }

    // ✅ Final verification
    console.log("\n   📊 Transceiver state:");
    this.peerConnection.getTransceivers().forEach((t, i) => {
      console.log(
        `   [${i}] ${t.sender.track?.kind || "?"}: dir=${
          t.direction
        }, current=${t.currentDirection || "none"}`
      );
    });

    console.log("✅ Local stream added\n");
  }
  setupEventListeners(
    onRemoteStream: (stream: MediaStream) => void,
    onIceCandidate: (candidate: RTCIceCandidate) => void
  ): void {
    if (!this.peerConnection) {
      console.error("❌ No peer connection");
      return;
    }

    console.log("\n🔧 Setting up event listeners (MERGED FIXED)");

    this.callbackFired = false;
    
    // ✅ CRITICAL: Create fresh remote stream
    this.remoteStream = new MediaStream();
    console.log("🔄 Created fresh remote stream:", this.remoteStream.id);

    // ✅ Track which tracks we've received
    let audioTrackReceived = false;
    let videoTrackReceived = false;

    // ✅ ICE candidate handler
    const iceHandler = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    this.peerConnection.addEventListener("icecandidate", iceHandler);
    this.eventCleanupHandlers.push(() => {
      this.peerConnection?.removeEventListener("icecandidate", iceHandler);
    });

    // ✅ CRITICAL: Track handler with MERGED fixes
    const trackHandler = async (event: RTCTrackEvent) => {
      console.log("\n📥 ===== TRACK RECEIVED =====");
      console.log("   Kind:", event.track.kind);
      console.log("   ID:", event.track.id);
      console.log("   Label:", event.track.label);
      console.log("   Enabled:", event.track.enabled);
      console.log("   Muted:", event.track.muted);
      console.log("   ReadyState:", event.track.readyState);
      console.log("   Streams in event:", event.streams.length);

      const track = event.track;
      track.enabled = true;

      // ✅ CRITICAL FIX: Use event.streams[0] OR create/use remoteStream
      let targetStream: MediaStream;

      if (event.streams && event.streams.length > 0) {
        targetStream = event.streams[0];
        // ✅ Update our reference to use the same stream
        if (!this.remoteStream || this.remoteStream.id !== targetStream.id) {
          console.log("   ✅ Using NEW stream from event:", targetStream.id);
          this.remoteStream = targetStream;
        }
      } else {
        // Fallback: add to our stream
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
          console.log("   ✅ Created new remote stream:", this.remoteStream.id);
        }

        const existing = this.remoteStream
          .getTracks()
          .find((t) => t.id === track.id);
        if (!existing) {
          this.remoteStream.addTrack(track);
          console.log("   ✅ Added track to remoteStream");
        }
        targetStream = this.remoteStream;
      }

      // ✅ Mark which tracks we've received
      if (track.kind === "audio") {
        audioTrackReceived = true;
        console.log("   ✅ Audio track marked as received");
      }
      if (track.kind === "video") {
        videoTrackReceived = true;
        console.log("   ✅ Video track marked as received");
      }

      // ✅ Monitor track state changes
      track.onmute = () => {
        console.warn(`⚠️ Remote ${track.kind} MUTED`);
        track.enabled = true;
      };

      const handleUnmute = () => {
        console.log(`✅ Track ${track.kind} unmuted`);
        track.removeEventListener("unmute", handleUnmute);
        checkAndFireCallback();
      };

      if (track.muted) {
        track.addEventListener("unmute", handleUnmute);
      }

      track.onended = () => {
        console.warn(`🛑 Remote ${track.kind} ENDED`);
      };

      // ✅ Function to check if we should fire callback
      const checkAndFireCallback = () => {
        if (this.callbackFired) return;

        const audioTracks = targetStream.getAudioTracks();
        const videoTracks = targetStream.getVideoTracks();

        console.log(`   📊 Stream ${targetStream.id} now has:`);
        console.log(`      Audio: ${audioTracks.length}`);
        console.log(`      Video: ${videoTracks.length}`);
        console.log(`   📊 Received flags: audio=${audioTrackReceived}, video=${videoTrackReceived}`);

        // ✅ CRITICAL: Fire callback when BOTH tracks are received
        if (audioTrackReceived && videoTrackReceived && !this.callbackFired) {
          this.callbackFired = true;

          console.log("\n🎉 ===== BOTH TRACKS READY =====");
          console.log("   Audio tracks:", audioTracks.length);
          console.log("   Video tracks:", videoTracks.length);
          console.log("   Stream ID:", targetStream.id);

          // Force enable ALL tracks
          targetStream.getTracks().forEach((t) => {
            t.enabled = true;
            console.log(`   ✅ Force enabled: ${t.kind} - ${t.label}`);
          });

          // ✅ Small delay for stability
          setTimeout(() => {
            console.log("   📤 Firing callback with stream:", targetStream.id);
            onRemoteStream(targetStream);
            console.log("✅ Callback complete\n");
          }, 300);
        } else {
          console.log(
            `   ⏳ Waiting for more tracks (audio=${audioTracks.length}, video=${videoTracks.length})`
          );
        }
      };

      // ✅ Check immediately and also after delays
      checkAndFireCallback();
      setTimeout(checkAndFireCallback, 500);
      setTimeout(checkAndFireCallback, 1000);
    };

    // ✅ Attach the track handler
    this.peerConnection.addEventListener("track", trackHandler);
    this.eventCleanupHandlers.push(() => {
      this.peerConnection?.removeEventListener("track", trackHandler);
    });

    // ✅ Connection state handler
    const connHandler = () => {
      const state = this.peerConnection?.connectionState;
      console.log(`🔌 Connection: ${state}`);
      if (state === "connected") {
        setTimeout(() => this.logConnectionStats(), 2000);
      }
    };

    this.peerConnection.addEventListener("connectionstatechange", connHandler);
    this.eventCleanupHandlers.push(() => {
      this.peerConnection?.removeEventListener(
        "connectionstatechange",
        connHandler
      );
    });

    console.log("✅ Event listeners ready\n");
  }
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error("No peer connection");
    }

    console.log("\n📝 Creating Offer (FIXED)");

    // Force all transceivers to sendrecv
    this.peerConnection.getTransceivers().forEach((t) => {
      if (t.direction !== "sendrecv") {
        t.direction = "sendrecv";
      }
    });

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    // ✅ Fix SDP if needed
    if (offer.sdp) {
      offer.sdp = offer.sdp.replace(/a=sendonly/g, "a=sendrecv");
      offer.sdp = offer.sdp.replace(/a=recvonly/g, "a=sendrecv");
    }

    await this.peerConnection.setLocalDescription(offer);

    console.log("✅ Offer created");
    console.log("   Has audio:", offer.sdp?.includes("m=audio"));
    console.log("   Has video:", offer.sdp?.includes("m=video"));

    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error("No peer connection");
    }

    console.log("\n📝 Creating Answer (FIXED)");

    // Force transceivers to sendrecv
    this.peerConnection.getTransceivers().forEach((t, i) => {
      if (t.sender.track) {
        t.direction = "sendrecv";
        console.log(`   Transceiver ${i}: ${t.sender.track.kind} → sendrecv`);
      }
    });

    const answer = await this.peerConnection.createAnswer();

    // ✅ Fix SDP
    if (answer.sdp) {
      answer.sdp = answer.sdp.replace(/a=sendonly/g, "a=sendrecv");
      answer.sdp = answer.sdp.replace(/a=recvonly/g, "a=sendrecv");
    }

    await this.peerConnection.setLocalDescription(answer);

    console.log("✅ Answer created");
    return answer;
  }
  async setRemoteDescription(
    description: RTCSessionDescriptionInit
  ): Promise<void> {
    if (!this.peerConnection) {
      throw new Error("No peer connection");
    }

    console.log("\n📥 Setting Remote Description");
    console.log("   Type:", description.type);

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(description)
    );

    this.remoteDescriptionSet = true;
    console.log("✅ Remote description set");

    // ✅ Process queued ICE candidates
    if (this.pendingIceCandidates.length > 0) {
      console.log(
        `📦 Processing ${this.pendingIceCandidates.length} queued ICE candidates`
      );

      for (const candidate of this.pendingIceCandidates) {
        try {
          await this.peerConnection.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
          console.log("   ✅ Added queued candidate");
        } catch (err) {
          console.error("   ❌ Failed to add candidate:", err);
        }
      }

      this.pendingIceCandidates = [];
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      console.warn("⚠️ No peer connection for ICE candidate");
      return;
    }

    if (!candidate.candidate) {
      console.log("📭 End of candidates");
      return;
    }

    // ✅ Queue if remote description not set
    if (!this.remoteDescriptionSet) {
      this.pendingIceCandidates.push(candidate);
      console.log(
        `📦 Queued ICE candidate (${this.pendingIceCandidates.length} total)`
      );
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("✅ ICE candidate added");
    } catch (error) {
      console.error("❌ ICE candidate error:", error);
    }
  }
  async logConnectionStats(): Promise<void> {
    if (!this.peerConnection) return;

    try {
      const stats = await this.peerConnection.getStats();

      console.log("\n📊 ===== CONNECTION STATS =====");

      stats.forEach((report) => {
        if (report.type === "inbound-rtp") {
          console.log(
            `${report.kind?.toUpperCase()} IN: ${
              report.bytesReceived || 0
            } bytes, ${report.packetsReceived || 0} pkts`
          );
        } else if (report.type === "outbound-rtp") {
          console.log(
            `${report.kind?.toUpperCase()} OUT: ${
              report.bytesSent || 0
            } bytes, ${report.packetsSent || 0} pkts`
          );
        }
      });

      console.log("==============================\n");
    } catch (err) {
      console.error("Stats error:", err);
    }
  }

  async getConnectionQuality(): Promise<ConnectionQuality> {
    if (!this.peerConnection) {
      return {
        audio: false,
        video: false,
        quality: "none",
        audioBytes: 0,
        videoBytes: 0,
        packetLoss: 0,
      };
    }

    try {
      const stats = await this.peerConnection.getStats();
      let audioBytes = 0,
        videoBytes = 0,
        totalLost = 0,
        totalReceived = 0;

      stats.forEach((report) => {
        if (report.type === "inbound-rtp") {
          if (report.kind === "audio") {
            audioBytes = report.bytesReceived || 0;
            totalLost += report.packetsLost || 0;
            totalReceived += report.packetsReceived || 0;
          } else if (report.kind === "video") {
            videoBytes = report.bytesReceived || 0;
            totalLost += report.packetsLost || 0;
            totalReceived += report.packetsReceived || 0;
          }
        }
      });

      const lossRate = totalReceived > 0 ? totalLost / totalReceived : 0;
      const hasAudio = audioBytes > 0;
      const hasVideo = videoBytes > 0;

      let quality: "good" | "poor" | "none" = "none";
      if (hasAudio || hasVideo) {
        quality = lossRate < 0.05 ? "good" : lossRate < 0.15 ? "poor" : "none";
      }

      return {
        audio: hasAudio,
        video: hasVideo,
        quality,
        audioBytes,
        videoBytes,
        packetLoss: lossRate,
      };
    } catch {
      return {
        audio: false,
        video: false,
        quality: "none",
        audioBytes: 0,
        videoBytes: 0,
        packetLoss: 0,
      };
    }
  }
  toggleAudio(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
    console.log(`🎤 Audio: ${enabled}`);
  }

  toggleVideo(enabled: boolean): void {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
    console.log(`📹 Video: ${enabled}`);
  }

  getTrackStates() {
    const audio = this.localStream?.getAudioTracks()[0];
    const video = this.localStream?.getVideoTracks()[0];
    return {
      audioEnabled: audio?.enabled || false,
      videoEnabled: video?.enabled || false,
      audioMuted: audio?.muted || true,
      videoMuted: video?.muted || true,
    };
  }
  async startScreenShare(preferCurrentTab = true): Promise<MediaStream> {
    const options: any = {
      video: {
        cursor: "always",
        displaySurface: preferCurrentTab ? "browser" : "monitor",
      },
      audio: false,
      preferCurrentTab,
    };

    this.screenStream = await navigator.mediaDevices.getDisplayMedia(options);
    const videoTrack = this.screenStream.getVideoTracks()[0];

    if (this.peerConnection && this.localStream) {
      const sender = this.peerConnection
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(videoTrack);
      }

      videoTrack.onended = () => this.stopScreenShare();
    }

    return this.screenStream;
  }

  async stopScreenShare(): Promise<void> {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }

    if (this.peerConnection && this.originalVideoTrack) {
      const sender = this.peerConnection
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender && this.originalVideoTrack.readyState === "live") {
        await sender.replaceTrack(this.originalVideoTrack);
      }
    }
  }

  isScreenSharing(): boolean {
    return this.screenStream !== null;
  }
  close(): void {
    console.log("\n🧹 Closing WebRTC Service");

    this.localStream?.getTracks().forEach((t) => t.stop());
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.eventCleanupHandlers.forEach((fn) => fn());

    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.onsignalingstatechange = null;
      this.peerConnection.close();
    }

    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.screenStream = null;
    this.originalVideoTrack = null;
    this.pendingIceCandidates = [];
    this.remoteDescriptionSet = false;
    this.callbackFired = false;
    this.eventCleanupHandlers = [];

    console.log("✅ WebRTC closed\n");
  }

  destroy(): void {
    this.close();
  }
}

export type { AudioDiagnostics, ConnectionQuality, TrackInfo };
