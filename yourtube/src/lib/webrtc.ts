// lib/webrtc.ts - COMPLETE MERGED AND OPTIMIZED VERSION

/**
 * WebRTC Service with comprehensive audio/video support
 * Features:
 * - Dual track synchronization
 * - Audio diagnostics with AudioContext
 * - Screen sharing support
 * - Connection quality monitoring
 * - Automatic transceiver management
 */

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

// ICE Server Configuration with STUN and TURN fallback
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Google STUN servers
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Free TURN servers for NAT traversal
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
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};
export class WebRTCService {
  // Core WebRTC components
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private originalVideoTrack: MediaStreamTrack | null = null;

  // Track state management
  private receivedTracks = { audio: false, video: false };
  private callbackFired = false;
  private audioContext: AudioContext | null = null;
  private audioAnalyser: AnalyserNode | null = null;

  // Event listeners cleanup
  private eventCleanupHandlers: (() => void)[] = [];

  constructor() {
    console.log("🔧 Initializing WebRTC Service");
    console.log("   ICE Servers:", ICE_SERVERS.iceServers.length);
    console.log("   ICE Pool Size:", ICE_SERVERS.iceCandidatePoolSize);

    try {
      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
      console.log("✅ RTCPeerConnection created successfully");

      // Setup core event listeners
      this.setupCoreEventListeners();
    } catch (error) {
      console.error("❌ Failed to create peer connection:", error);
      throw new Error("WebRTC initialization failed");
    }
  }

  /**
   * Setup core peer connection event listeners
   * These run throughout the connection lifecycle
   */
  private setupCoreEventListeners(): void {
    if (!this.peerConnection) return;

    // ICE gathering state changes
    this.peerConnection.onicegatheringstatechange = () => {
      const state = this.peerConnection?.iceGatheringState;
      console.log("🧊 ICE Gathering State:", state);

      if (state === "complete") {
        console.log("✅ All ICE candidates gathered");
      }
    };

    // Signaling state changes
    this.peerConnection.onsignalingstatechange = () => {
      const state = this.peerConnection?.signalingState;
      console.log("📡 Signaling State:", state);

      if (state === "stable") {
        console.log("✅ Signaling stable - negotiation complete");
      }
    };

    // Negotiation needed (renegotiation required)
    this.peerConnection.onnegotiationneeded = () => {
      console.log("🔄 Negotiation needed - tracks may have changed");
    };

    console.log("✅ Core event listeners attached");
  }
  /**
   * Set and initialize local media stream
   * Includes comprehensive track diagnostics and verification
   */
  setLocalStream(stream: MediaStream): void {
    console.log("\n📹 Setting Local Stream");
    console.log("   Stream ID:", stream.id);
    console.log("   Active:", stream.active);

    this.localStream = stream;

    // Store original video track for screen share restoration
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length > 0) {
      this.originalVideoTrack = videoTracks[0];
      console.log(
        "   Stored original video track:",
        this.originalVideoTrack.label
      );
    }

    // Force enable and diagnose all tracks
    const trackInfo: TrackInfo[] = [];

    stream.getTracks().forEach((track) => {
      // Force enable immediately
      track.enabled = true;

      const info: TrackInfo = {
        id: track.id.substring(0, 8),
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        label: track.label,
      };

      trackInfo.push(info);

      console.log(`\n   📊 ${track.kind.toUpperCase()} Track:`, {
        id: info.id,
        label: info.label,
        enabled: info.enabled,
        muted: info.muted,
        readyState: info.readyState,
      });

      // Setup track health monitoring
      this.setupTrackHealthMonitoring(track, "local");

      // Run audio diagnostics if audio track
      if (track.kind === "audio") {
        this.scheduleAudioDiagnostics(track);
      }

      // Warn if track arrives muted
      if (track.muted) {
        console.warn(`   ⚠️ ${track.kind} track is MUTED on arrival`);
        this.attemptTrackRecovery(track);
      }
    });

    console.log("\n✅ Local stream configured");
    console.log("   Audio tracks:", stream.getAudioTracks().length);
    console.log("   Video tracks:", stream.getVideoTracks().length);
  }

  /**
   * Setup comprehensive track health monitoring
   * Monitors: ended, mute, unmute events
   */
  private setupTrackHealthMonitoring(
    track: MediaStreamTrack,
    source: "local" | "remote"
  ): void {
    const prefix = source === "local" ? "🎙️ LOCAL" : "📥 REMOTE";

    track.onended = () => {
      console.error(`🛑 ${prefix} ${track.kind} track ENDED unexpectedly!`);
      console.error("   Track ID:", track.id.substring(0, 8));
      console.error("   Label:", track.label);
      console.error("   ReadyState:", track.readyState);
    };

    track.onmute = () => {
      console.warn(`🔇 ${prefix} ${track.kind} track MUTED`);
      console.warn("   Timestamp:", new Date().toISOString());

      // Attempt recovery for local tracks
      if (source === "local") {
        this.attemptTrackRecovery(track);
      }
    };

    track.onunmute = () => {
      console.log(`🔊 ${prefix} ${track.kind} track UNMUTED`);
    };
  }

  /**
   * Attempt to recover a muted track
   * Uses toggle technique to force unmute
   */
  private attemptTrackRecovery(track: MediaStreamTrack): void {
    console.log(`🔧 Attempting ${track.kind} track recovery...`);

    setTimeout(() => {
      track.enabled = false;
      setTimeout(() => {
        track.enabled = true;
        console.log(`   ✅ ${track.kind} track toggled`);
        console.log(
          "   New state: enabled=",
          track.enabled,
          "muted=",
          track.muted
        );
      }, 100);
    }, 50);
  }
  /**
   * Schedule audio diagnostics after user interaction
   * Required due to browser autoplay policies
   */
  private scheduleAudioDiagnostics(track: MediaStreamTrack): void {
    console.log("🎤 Scheduling audio diagnostics...");

    const events = ["click", "touchstart", "keydown"];

    const handler = () => {
      this.runAudioDiagnostics(track);
      // Remove all event listeners after first interaction
      events.forEach((e) => document.removeEventListener(e, handler));
    };

    // Register listeners
    events.forEach((e) => {
      document.addEventListener(e, handler, { once: true });
    });

    // Store cleanup handler
    const cleanup = () => {
      events.forEach((e) => document.removeEventListener(e, handler));
    };
    this.eventCleanupHandlers.push(cleanup);

    console.log("   ⏳ Waiting for user interaction to verify audio...");
  }

  /**
   * Run comprehensive audio diagnostics
   * Uses Web Audio API to analyze audio levels
   */
  private async runAudioDiagnostics(track: MediaStreamTrack): Promise<void> {
    try {
      console.log("\n🔬 Running Audio Diagnostics");
      console.log("   Track:", track.label);
      console.log("   Enabled:", track.enabled);
      console.log("   Muted:", track.muted);
      console.log("   State:", track.readyState);

      // Create AudioContext if needed
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;

      if (!AudioContextClass) {
        console.warn("⚠️ Web Audio API not supported");
        return;
      }

      this.audioContext = new AudioContextClass();

      // Resume if suspended
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
        console.log("   ✅ AudioContext resumed");
      }

      // Create analyzer
      const source = this.audioContext.createMediaStreamSource(
        new MediaStream([track])
      );
      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 256;
      source.connect(this.audioAnalyser);

      console.log("   ✅ Audio analyzer connected");

      // Monitor audio levels
      this.monitorAudioLevels();
    } catch (error) {
      console.error("❌ Audio diagnostics failed:", error);
    }
  }

  /**
   * Monitor audio levels in real-time
   * Checks for actual audio data flowing through the track
   */
  private monitorAudioLevels(): void {
    if (!this.audioAnalyser) return;

    const dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
    let checkCount = 0;
    const maxChecks = 10;
    let totalLevel = 0;

    const checkAudio = () => {
      if (!this.audioAnalyser) return;

      this.audioAnalyser.getByteFrequencyData(dataArray);
      const average =
        dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

      checkCount++;
      totalLevel += average;

      console.log(
        `   🎤 Audio Level Check ${checkCount}/${maxChecks}: ${average.toFixed(
          2
        )}`
      );

      if (checkCount >= maxChecks) {
        const avgLevel = totalLevel / maxChecks;

        if (avgLevel > 0) {
          console.log(
            `✅ Audio verified! Average level: ${avgLevel.toFixed(2)}`
          );
        } else {
          console.warn("⚠️ No audio detected in monitoring period");
          console.warn("   Possible causes:");
          console.warn("   1. Microphone is muted in system settings");
          console.warn("   2. Wrong microphone selected");
          console.warn("   3. Microphone is being used by another application");
          console.warn("   4. User hasn't spoken yet");
        }

        // Cleanup
        if (this.audioContext && this.audioContext.state !== "closed") {
          this.audioContext.close();
          this.audioContext = null;
          this.audioAnalyser = null;
        }
      } else {
        // Continue checking
        setTimeout(checkAudio, 200);
      }
    };

    // Start monitoring after brief delay
    setTimeout(checkAudio, 500);
  }

  /**
   * Get current local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get current remote stream
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
  /**
   * Add local stream tracks to peer connection
   * CRITICAL: Forces all transceivers to sendrecv mode
   */
  addLocalStreamToPeer(): void {
    if (!this.localStream || !this.peerConnection) {
      console.error("❌ Cannot add stream to peer");
      console.error("   Local stream:", !!this.localStream);
      console.error("   Peer connection:", !!this.peerConnection);
      return;
    }

    console.log("\n📤 Adding Local Stream to Peer Connection");

    // Step 1: Remove existing senders to prevent duplicates
    const existingSenders = this.peerConnection.getSenders();
    console.log(`   Removing ${existingSenders.length} existing senders...`);

    existingSenders.forEach((sender, index) => {
      if (sender.track) {
        console.log(`   ❌ Removing sender ${index}: ${sender.track.kind}`);
        this.peerConnection?.removeTrack(sender);
      }
    });

    // Step 2: Force enable all tracks before adding
    console.log("\n   🔧 Force enabling all tracks...");
    this.localStream.getTracks().forEach((track) => {
      track.enabled = true;
      console.log(
        `   ✅ ${track.kind}: enabled=${track.enabled}, muted=${track.muted}`
      );
    });

    // Step 3: Add all tracks to peer connection
    console.log("\n   ➕ Adding tracks to peer...");
    this.localStream.getTracks().forEach((track, index) => {
      console.log(
        `\n   Track ${index + 1}/${this.localStream!.getTracks().length}:`
      );
      console.log(`      Kind: ${track.kind}`);
      console.log(`      ID: ${track.id.substring(0, 8)}`);
      console.log(`      Label: ${track.label}`);
      console.log(`      Enabled: ${track.enabled}`);
      console.log(`      Muted: ${track.muted}`);
      console.log(`      ReadyState: ${track.readyState}`);

      this.peerConnection?.addTrack(track, this.localStream!);
      console.log(`      ✅ Added to peer connection`);
    });

    // Step 4: CRITICAL FIX - Force all transceivers to sendrecv
    console.log("\n   🔧 Configuring transceivers...");
    const transceivers = this.peerConnection.getTransceivers();
    console.log(`   Found ${transceivers.length} transceivers`);

    let fixedCount = 0;
    transceivers.forEach((transceiver, index) => {
      const oldDirection = transceiver.direction;
      const trackKind = transceiver.sender.track?.kind || "unknown";
      const mid = transceiver.mid || "pending";

      console.log(`\n   Transceiver ${index}:`);
      console.log(`      MID: ${mid}`);
      console.log(`      Kind: ${trackKind}`);
      console.log(`      Direction: ${oldDirection}`);
      console.log(
        `      Current Direction: ${transceiver.currentDirection || "none"}`
      );

      // Force to sendrecv
      if (oldDirection !== "sendrecv") {
        transceiver.direction = "sendrecv";
        fixedCount++;
        console.log(`      ✅ FIXED: ${oldDirection} → sendrecv`);
      } else {
        console.log(`      ✅ Already sendrecv`);
      }

      // Log track state
      if (transceiver.sender.track) {
        console.log(`      Track enabled: ${transceiver.sender.track.enabled}`);
        console.log(`      Track muted: ${transceiver.sender.track.muted}`);
      }
    });

    console.log(`\n✅ Local stream added to peer connection`);
    console.log(`   Total tracks: ${this.localStream.getTracks().length}`);
    console.log(`   Total transceivers: ${transceivers.length}`);
    console.log(`   Fixed transceivers: ${fixedCount}`);
  }
  /**
   * Create SDP offer
   * Ensures transceivers are properly configured before offer creation
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized");
    }

    console.log("\n📝 Creating SDP Offer");

    // CRITICAL: Verify and fix transceivers BEFORE creating offer
    console.log("   🔧 Pre-offer transceiver check...");
    const transceivers = this.peerConnection.getTransceivers();
    console.log(`   Found ${transceivers.length} transceivers`);

    let preFixCount = 0;
    transceivers.forEach((t, i) => {
      const oldDir = t.direction;
      if (oldDir !== "sendrecv") {
        t.direction = "sendrecv";
        preFixCount++;
        console.log(
          `   ⚠️ Fixed transceiver ${i} (${t.sender.track?.kind}): ${oldDir} → sendrecv`
        );
      }
    });

    if (preFixCount > 0) {
      console.log(`   ✅ Fixed ${preFixCount} transceivers before offer`);
    } else {
      console.log(`   ✅ All transceivers already correct`);
    }

    // Create offer with explicit audio/video constraints
    console.log("\n   🔨 Creating offer...");
    const offerOptions: RTCOfferOptions = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
      iceRestart: false,
    };

    const offer = await this.peerConnection.createOffer(offerOptions);

    // Set local description
    await this.peerConnection.setLocalDescription(offer);
    console.log("   ✅ Local description set");

    // Analyze SDP
    console.log("\n   📊 SDP Analysis:");
    console.log(`   Type: ${offer.type}`);

    if (offer.sdp) {
      const hasAudio = offer.sdp.includes("m=audio");
      const hasVideo = offer.sdp.includes("m=video");
      const sendrecvMatches = offer.sdp.match(/a=sendrecv/g);
      const sendrecvCount = sendrecvMatches ? sendrecvMatches.length : 0;
      const sendonly = offer.sdp.includes("a=sendonly");
      const recvonly = offer.sdp.includes("a=recvonly");

      console.log(`   Audio section: ${hasAudio ? "✅" : "❌"}`);
      console.log(`   Video section: ${hasVideo ? "✅" : "❌"}`);
      console.log(`   Sendrecv count: ${sendrecvCount}`);
      console.log(`   Has sendonly: ${sendonly ? "⚠️ YES" : "✅ NO"}`);
      console.log(`   Has recvonly: ${recvonly ? "⚠️ YES" : "✅ NO"}`);

      // Warning checks
      if (!hasAudio || !hasVideo) {
        console.warn("   ⚠️ Missing media sections in SDP!");
      }
      if (sendrecvCount < 2) {
        console.warn(`   ⚠️ Expected 2 sendrecv, found ${sendrecvCount}`);
      }
      if (sendonly || recvonly) {
        console.warn("   ⚠️ One-way media detected in SDP!");
      }
    }

    // Post-offer transceiver state
    console.log("\n   📊 Post-offer transceiver state:");
    const postTransceivers = this.peerConnection.getTransceivers();
    postTransceivers.forEach((t, i) => {
      console.log(
        `   Transceiver ${i}: ${t.sender.track?.kind} - ${t.direction}`
      );
    });

    console.log("\n✅ Offer created successfully");
    return offer;
  }

  /**
   * Create SDP answer
   * Responds to received offer with proper transceiver configuration
   */
  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized");
    }

    console.log("\n📝 Creating SDP Answer");

    // CRITICAL: Fix transceivers before creating answer
    console.log("   🔧 Pre-answer transceiver check...");
    const transceivers = this.peerConnection.getTransceivers();
    console.log(`   Found ${transceivers.length} transceivers`);

    let preFixCount = 0;
    transceivers.forEach((t, i) => {
      const oldDir = t.direction;

      // If we have a local track and direction is recvonly, fix it
      if (oldDir === "recvonly" && t.sender.track) {
        t.direction = "sendrecv";
        preFixCount++;
        console.log(
          `   ⚠️ Fixed transceiver ${i} (${t.sender.track.kind}): recvonly → sendrecv`
        );
      } else if (oldDir !== "sendrecv" && oldDir !== "recvonly") {
        t.direction = "sendrecv";
        preFixCount++;
        console.log(`   ⚠️ Fixed transceiver ${i}: ${oldDir} → sendrecv`);
      }
    });

    if (preFixCount > 0) {
      console.log(`   ✅ Fixed ${preFixCount} transceivers before answer`);
    } else {
      console.log(`   ✅ All transceivers already correct`);
    }

    // Create answer
    console.log("\n   🔨 Creating answer...");
    const answer = await this.peerConnection.createAnswer();

    // Set local description
    await this.peerConnection.setLocalDescription(answer);
    console.log("   ✅ Local description set");

    // Analyze SDP
    console.log("\n   📊 SDP Analysis:");
    console.log(`   Type: ${answer.type}`);

    if (answer.sdp) {
      const hasAudio = answer.sdp.includes("m=audio");
      const hasVideo = answer.sdp.includes("m=video");
      const sendrecvMatches = answer.sdp.match(/a=sendrecv/g);
      const sendrecvCount = sendrecvMatches ? sendrecvMatches.length : 0;
      const sendonly = answer.sdp.includes("a=sendonly");
      const recvonly = answer.sdp.includes("a=recvonly");

      console.log(`   Audio section: ${hasAudio ? "✅" : "❌"}`);
      console.log(`   Video section: ${hasVideo ? "✅" : "❌"}`);
      console.log(`   Sendrecv count: ${sendrecvCount}`);
      console.log(`   Has sendonly: ${sendonly ? "⚠️ YES" : "✅ NO"}`);
      console.log(`   Has recvonly: ${recvonly ? "⚠️ YES" : "✅ NO"}`);

      // Warning checks
      if (!hasAudio || !hasVideo) {
        console.warn("   ⚠️ Missing media sections in SDP!");
      }
      if (sendrecvCount < 2) {
        console.warn(`   ⚠️ Expected 2 sendrecv, found ${sendrecvCount}`);
      }
    }

    // Post-answer transceiver state
    console.log("\n   📊 Post-answer transceiver state:");
    const postTransceivers = this.peerConnection.getTransceivers();
    postTransceivers.forEach((t, i) => {
      console.log(
        `   Transceiver ${i}: ${t.receiver.track?.kind} - ${t.direction}`
      );
    });

    console.log("\n✅ Answer created successfully");
    return answer;
  }

  /**
   * Set remote SDP description
   * Applies received offer or answer
   */
  async setRemoteDescription(
    description: RTCSessionDescriptionInit
  ): Promise<void> {
    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized");
    }

    console.log("\n📥 Setting Remote Description");
    console.log("   Type:", description.type);

    // Analyze incoming SDP
    if (description.sdp) {
      const hasAudio = description.sdp.includes("m=audio");
      const hasVideo = description.sdp.includes("m=video");
      const sendrecvMatches = description.sdp.match(/a=sendrecv/g);
      const sendrecvCount = sendrecvMatches ? sendrecvMatches.length : 0;

      console.log("   📊 Remote SDP Analysis:");
      console.log(`   Audio section: ${hasAudio ? "✅" : "❌"}`);
      console.log(`   Video section: ${hasVideo ? "✅" : "❌"}`);
      console.log(`   Sendrecv count: ${sendrecvCount}`);

      if (!hasAudio || !hasVideo) {
        console.error("   🚨 CRITICAL: Missing media sections!");
      }
    }

    // Set the remote description
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(description)
    );
    console.log("   ✅ Remote description applied");

    // Check transceivers after setting remote description
    console.log("\n   📊 Transceiver state after setRemoteDescription:");
    const transceivers = this.peerConnection.getTransceivers();
    console.log(`   Total transceivers: ${transceivers.length}`);

    transceivers.forEach((t, i) => {
      console.log(`\n   Transceiver ${i}:`);
      console.log(`      MID: ${t.mid || "pending"}`);
      console.log(`      Kind: ${t.receiver.track?.kind || "unknown"}`);
      console.log(`      Direction: ${t.direction}`);
      console.log(`      Current Direction: ${t.currentDirection || "none"}`);
      console.log(
        `      Sender track: ${t.sender.track ? t.sender.track.kind : "none"}`
      );
      console.log(
        `      Receiver track: ${
          t.receiver.track ? t.receiver.track.kind : "none"
        }`
      );
    });

    console.log("\n✅ Remote description set successfully");
  }
  /**
   * Add ICE candidate for connection establishment
   * Handles NAT traversal and connection optimization
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      console.warn("⚠️ Cannot add ICE candidate: no peer connection");
      return;
    }

    if (!candidate.candidate) {
      console.log("📭 Received empty ICE candidate (end-of-candidates)");
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));

      // Parse candidate details
      const candidateStr = candidate.candidate;
      let candidateType = "unknown";
      let protocol = "unknown";

      if (candidateStr.includes("typ host")) candidateType = "host";
      else if (candidateStr.includes("typ srflx")) candidateType = "srflx";
      else if (candidateStr.includes("typ relay")) candidateType = "relay";
      else if (candidateStr.includes("typ prflx")) candidateType = "prflx";

      if (candidateStr.includes("udp")) protocol = "UDP";
      else if (candidateStr.includes("tcp")) protocol = "TCP";

      console.log("✅ ICE candidate added:");
      console.log(`   Type: ${candidateType}`);
      console.log(`   Protocol: ${protocol}`);
      console.log(`   Preview: ${candidateStr.substring(0, 60)}...`);
    } catch (error) {
      console.error("❌ Failed to add ICE candidate:", error);
      console.error("   Candidate:", candidate.candidate?.substring(0, 100));
    }
  }
  /**
   * Setup comprehensive WebRTC event listeners
   * Handles track reception, ICE candidates, and connection states
   */
  setupEventListeners(
    onRemoteStream: (stream: MediaStream) => void,
    onIceCandidate: (candidate: RTCIceCandidate) => void
  ): void {
    if (!this.peerConnection) {
      console.error("❌ Cannot setup listeners: no peer connection");
      return;
    }

    console.log("\n🔧 Setting up WebRTC Event Listeners");

    // Reset track reception state
    this.receivedTracks = { audio: false, video: false };
    this.callbackFired = false;

    /**
     * CRITICAL: ontrack event handler
     * Fires when remote peer sends media tracks
     * Must wait for BOTH audio and video before firing callback
     */
    this.peerConnection.ontrack = (event) => {
      console.log("\n📥 ========== TRACK RECEIVED ==========");
      console.log("   Timestamp:", new Date().toISOString());
      console.log("   Track Kind:", event.track.kind);
      console.log("   Track ID:", event.track.id.substring(0, 12));
      console.log("   Track Label:", event.track.label);
      console.log("   Track Enabled:", event.track.enabled);
      console.log("   Track Muted:", event.track.muted);
      console.log("   Track ReadyState:", event.track.readyState);
      console.log("   Streams:", event.streams.length);

      // 🔥 CRITICAL: Force enable immediately
      event.track.enabled = true;

      // If track arrives muted, attempt recovery
      if (event.track.muted) {
        console.warn(`   ⚠️ Track arrived MUTED - attempting recovery...`);
        this.attemptTrackRecovery(event.track);
      }

      // Mark track as received
      if (event.track.kind === "audio") {
        this.receivedTracks.audio = true;
        console.log("   ✅ Audio track marked as received");
      } else if (event.track.kind === "video") {
        this.receivedTracks.video = true;
        console.log("   ✅ Video track marked as received");
      }

      // Get or create remote stream
      if (event.streams && event.streams.length > 0) {
        this.remoteStream = event.streams[0];
        console.log("   ✅ Using stream from event:", this.remoteStream.id);
      } else {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
          console.log("   ✅ Created new remote stream:", this.remoteStream.id);
        }
      }

      // Add track to remote stream if not already present
      const existingTracks = this.remoteStream.getTracks();
      const trackExists = existingTracks.some((t) => t.id === event.track.id);

      if (!trackExists) {
        this.remoteStream.addTrack(event.track);
        console.log(`   ✅ Added ${event.track.kind} track to remote stream`);
      } else {
        console.log(`   ℹ️ Track already in remote stream`);
      }

      // Log transceiver info
      if (event.transceiver) {
        console.log("\n   📊 Transceiver Info:");
        console.log("      MID:", event.transceiver.mid);
        console.log("      Direction:", event.transceiver.direction);
        console.log(
          "      Current Direction:",
          event.transceiver.currentDirection
        );
      }

      // Setup track health monitoring for remote track
      this.setupTrackHealthMonitoring(event.track, "remote");

      // 🔥 CRITICAL: Check if we have BOTH tracks before firing callback
      console.log("\n   📊 Track Reception Status:");
      console.log(`      Audio: ${this.receivedTracks.audio ? "✅" : "⏳"}`);
      console.log(`      Video: ${this.receivedTracks.video ? "✅" : "⏳"}`);
      console.log(`      Callback fired: ${this.callbackFired ? "YES" : "NO"}`);

      if (
        this.receivedTracks.audio &&
        this.receivedTracks.video &&
        !this.callbackFired
      ) {
        this.callbackFired = true;

        console.log("\n🎉 ========== BOTH TRACKS READY ==========");
        console.log(
          "   Total tracks in remote stream:",
          this.remoteStream.getTracks().length
        );

        // Final verification and force enable
        console.log("\n   🔧 Final track verification:");
        this.remoteStream.getTracks().forEach((t) => {
          t.enabled = true;
          console.log(
            `      ${t.kind}: enabled=${t.enabled}, muted=${t.muted}, state=${t.readyState}`
          );
        });

        // Small delay for stability, then fire callback
        console.log("\n   ⏳ Waiting 200ms for stability...");
        setTimeout(() => {
          console.log("   🚀 FIRING REMOTE STREAM CALLBACK");
          console.log("   Stream ID:", this.remoteStream!.id);
          console.log("   Stream active:", this.remoteStream!.active);
          console.log(
            "   Audio tracks:",
            this.remoteStream!.getAudioTracks().length
          );
          console.log(
            "   Video tracks:",
            this.remoteStream!.getVideoTracks().length
          );

          onRemoteStream(this.remoteStream!);

          console.log("   ✅ Callback executed");
          console.log("========================================\n");
        }, 200);
      } else if (!this.callbackFired) {
        console.log("   ⏳ Waiting for remaining tracks...");
        console.log("======================================\n");
      }
    };

    /**
     * ICE candidate event handler
     * Fires when local ICE candidates are generated
     */
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate;
        let candidateType = "unknown";

        if (candidate.candidate.includes("typ host")) candidateType = "host";
        else if (candidate.candidate.includes("typ srflx"))
          candidateType = "srflx";
        else if (candidate.candidate.includes("typ relay"))
          candidateType = "relay";

        console.log("❄️ Local ICE Candidate Generated:");
        console.log(`   Type: ${candidateType}`);
        console.log(`   Protocol: ${candidate.protocol || "unknown"}`);
        console.log(`   Address: ${candidate.address || "unknown"}`);
        console.log(`   Port: ${candidate.port || "unknown"}`);

        onIceCandidate(candidate);
      } else {
        console.log("❄️ ICE candidate gathering complete (null candidate)");
      }
    };

    /**
     * ICE connection state change handler
     * Monitors the ICE connection lifecycle
     */
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log(`\n🧊 ICE Connection State: ${state}`);

      switch (state) {
        case "new":
          console.log("   ℹ️ ICE agent is gathering candidates");
          break;
        case "checking":
          console.log("   🔄 ICE agent is checking candidates");
          break;
        case "connected":
          console.log("   ✅ ICE agent has found a valid connection");
          console.log("   🎉 Peer-to-peer connection established!");

          // Log connection stats after connection
          setTimeout(() => {
            this.logConnectionStats();
          }, 2000);
          break;
        case "completed":
          console.log("   ✅ ICE agent has finished gathering candidates");
          break;
        case "failed":
          console.error("   ❌ ICE connection failed!");
          console.error("   Possible causes:");
          console.error("   1. Network firewall blocking connection");
          console.error("   2. TURN server not working");
          console.error("   3. Both peers behind symmetric NAT");
          break;
        case "disconnected":
          console.warn("   ⚠️ ICE connection temporarily disconnected");
          break;
        case "closed":
          console.log("   ℹ️ ICE connection closed");
          break;
      }
    };

    /**
     * Overall connection state change handler
     * High-level connection status
     */
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log(`\n🔌 Peer Connection State: ${state}`);

      switch (state) {
        case "new":
          console.log("   ℹ️ Connection is new");
          break;
        case "connecting":
          console.log("   🔄 Connection is being established");
          break;
        case "connected":
          console.log("   ✅ Peer connection fully established!");
          console.log("   🎉 Media should now be flowing");
          break;
        case "disconnected":
          console.warn("   ⚠️ Connection temporarily lost");
          break;
        case "failed":
          console.error("   ❌ Connection failed!");
          break;
        case "closed":
          console.log("   ℹ️ Connection closed");
          break;
      }
    };

    console.log("✅ All event listeners registered");
    console.log("   - ontrack (remote media)");
    console.log("   - onicecandidate (ICE gathering)");
    console.log("   - oniceconnectionstatechange (ICE status)");
    console.log("   - onconnectionstatechange (overall status)");
  }
  /**
   * Log comprehensive connection statistics
   * Diagnoses audio/video data flow and connection quality
   */
  async logConnectionStats(): Promise<void> {
    if (!this.peerConnection) {
      console.warn("⚠️ No peer connection for stats");
      return;
    }

    try {
      console.log("\n📊 ========== CONNECTION STATISTICS ==========");
      console.log("   Timestamp:", new Date().toISOString());

      const stats = await this.peerConnection.getStats();

      let audioInbound = false;
      let videoInbound = false;
      let audioOutbound = false;
      let videoOutbound = false;
      let audioBytes = 0;
      let videoBytes = 0;
      let audioPackets = 0;
      let videoPackets = 0;
      let audioLost = 0;
      let videoLost = 0;

      stats.forEach((report) => {
        // Inbound RTP (receiving)
        if (report.type === "inbound-rtp") {
          if (report.kind === "audio") {
            audioInbound = true;
            audioBytes = report.bytesReceived || 0;
            audioPackets = report.packetsReceived || 0;
            audioLost = report.packetsLost || 0;

            console.log("\n   🎤 INBOUND AUDIO:");
            console.log(`      Bytes received: ${audioBytes.toLocaleString()}`);
            console.log(
              `      Packets received: ${audioPackets.toLocaleString()}`
            );
            console.log(`      Packets lost: ${audioLost}`);
            console.log(`      Jitter: ${report.jitter?.toFixed(3) || "N/A"}s`);

            if (report.audioLevel !== undefined) {
              console.log(`      Audio level: ${report.audioLevel.toFixed(3)}`);
            }
          } else if (report.kind === "video") {
            videoInbound = true;
            videoBytes = report.bytesReceived || 0;
            videoPackets = report.packetsReceived || 0;
            videoLost = report.packetsLost || 0;

            console.log("\n   📹 INBOUND VIDEO:");
            console.log(`      Bytes received: ${videoBytes.toLocaleString()}`);
            console.log(
              `      Packets received: ${videoPackets.toLocaleString()}`
            );
            console.log(`      Packets lost: ${videoLost}`);
            console.log(`      Frames received: ${report.framesReceived || 0}`);
            console.log(`      Frames decoded: ${report.framesDecoded || 0}`);
            console.log(`      Frames dropped: ${report.framesDropped || 0}`);

            if (report.frameWidth && report.frameHeight) {
              console.log(
                `      Resolution: ${report.frameWidth}x${report.frameHeight}`
              );
            }
          }
        }

        // Outbound RTP (sending)
        if (report.type === "outbound-rtp") {
          if (report.kind === "audio") {
            audioOutbound = true;
            console.log("\n   🎤 OUTBOUND AUDIO:");
            console.log(
              `      Bytes sent: ${(report.bytesSent || 0).toLocaleString()}`
            );
            console.log(
              `      Packets sent: ${(
                report.packetsSent || 0
              ).toLocaleString()}`
            );
          } else if (report.kind === "video") {
            videoOutbound = true;
            console.log("\n   📹 OUTBOUND VIDEO:");
            console.log(
              `      Bytes sent: ${(report.bytesSent || 0).toLocaleString()}`
            );
            console.log(
              `      Packets sent: ${(
                report.packetsSent || 0
              ).toLocaleString()}`
            );
            console.log(`      Frames encoded: ${report.framesEncoded || 0}`);
          }
        }

        // Active candidate pair
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          console.log("\n   ✅ ACTIVE CONNECTION:");
          console.log(
            `      Local candidate: ${report.localCandidateType || "unknown"}`
          );
          console.log(
            `      Remote candidate: ${report.remoteCandidateType || "unknown"}`
          );
          console.log(
            `      Bytes received: ${(
              report.bytesReceived || 0
            ).toLocaleString()}`
          );
          console.log(
            `      Bytes sent: ${(report.bytesSent || 0).toLocaleString()}`
          );
          console.log(
            `      Round trip time: ${
              report.currentRoundTripTime
                ? (report.currentRoundTripTime * 1000).toFixed(2) + "ms"
                : "N/A"
            }`
          );
        }
      });

      // 🔥 CRITICAL DIAGNOSTICS
      console.log("\n   🔍 DIAGNOSTIC SUMMARY:");

      // Audio diagnostics
      if (!audioInbound) {
        console.error("   🚨 NO INBOUND AUDIO STATISTICS!");
        console.error("      Remote peer may not be sending audio");
      } else if (audioBytes === 0) {
        console.error("   🚨 ZERO AUDIO BYTES RECEIVED!");
        console.error("      Audio track exists but no data flowing");
        console.error("      Possible causes:");
        console.error("      - Remote microphone muted in system");
        console.error("      - Remote browser has no mic permission");
        console.error("      - Remote mic in use by another app");
        console.error("      - Remote audio track disabled");
      } else {
        console.log(
          `   ✅ Audio data flowing: ${audioBytes.toLocaleString()} bytes`
        );

        const audioLossRate =
          audioPackets > 0 ? (audioLost / audioPackets) * 100 : 0;
        if (audioLossRate > 5) {
          console.warn(
            `   ⚠️ High audio packet loss: ${audioLossRate.toFixed(2)}%`
          );
        }
      }

      // Video diagnostics
      if (!videoInbound) {
        console.error("   🚨 NO INBOUND VIDEO STATISTICS!");
      } else if (videoBytes === 0) {
        console.error("   🚨 ZERO VIDEO BYTES RECEIVED!");
      } else {
        console.log(
          `   ✅ Video data flowing: ${videoBytes.toLocaleString()} bytes`
        );

        const videoLossRate =
          videoPackets > 0 ? (videoLost / videoPackets) * 100 : 0;
        if (videoLossRate > 5) {
          console.warn(
            `   ⚠️ High video packet loss: ${videoLossRate.toFixed(2)}%`
          );
        }
      }

      // Outbound diagnostics
      if (!audioOutbound) {
        console.warn("   ⚠️ Not sending audio");
      }
      if (!videoOutbound) {
        console.warn("   ⚠️ Not sending video");
      }

      console.log("============================================\n");
    } catch (error) {
      console.error("❌ Error getting connection stats:", error);
    }
  }
  /**
   * Start screen sharing
   * Replaces video track with screen capture
   */
  async startScreenShare(
    preferCurrentTab: boolean = true
  ): Promise<MediaStream> {
    try {
      console.log("\n🖥️ Starting Screen Share");
      console.log("   Prefer current tab:", preferCurrentTab);

      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: {
          cursor: "always" as any,
          displaySurface: preferCurrentTab ? "browser" : "monitor",
        } as any,
        audio: false, // Screen audio can be enabled if needed
        preferCurrentTab: preferCurrentTab,
      } as any;

      this.screenStream = await navigator.mediaDevices.getDisplayMedia(
        displayMediaOptions
      );

      console.log("   ✅ Screen stream acquired");
      console.log("   Stream ID:", this.screenStream.id);
      console.log(
        "   Video tracks:",
        this.screenStream.getVideoTracks().length
      );

      const videoTrack = this.screenStream.getVideoTracks()[0];
      console.log("   Video track:", videoTrack.label);
      console.log("   Video settings:", videoTrack.getSettings());

      // Replace video track in peer connection
      if (this.peerConnection && this.localStream) {
        const sender = this.peerConnection
          .getSenders()
          .find((s) => s.track?.kind === "video");

        if (sender) {
          await sender.replaceTrack(videoTrack);
          console.log("   ✅ Video track replaced with screen");
        } else {
          console.error("   ❌ No video sender found");
        }

        // Handle screen share stop
        videoTrack.onended = () => {
          console.log("🛑 Screen share ended by user");
          this.stopScreenShare();
        };
      }

      return this.screenStream;
    } catch (error: any) {
      console.error("❌ Screen share error:", error);

      if (error.name === "NotAllowedError") {
        console.error("   User denied screen share permission");
      } else if (error.name === "NotFoundError") {
        console.error("   No screen share source available");
      }

      throw error;
    }
  }

  /**
   * Stop screen sharing and restore camera
   */
  async stopScreenShare(): Promise<void> {
    console.log("\n🛑 Stopping Screen Share");

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => {
        track.stop();
        console.log("   ✅ Stopped screen track:", track.label);
      });
      this.screenStream = null;
    }

    // Restore original camera track
    if (this.peerConnection && this.originalVideoTrack) {
      const sender = this.peerConnection
        .getSenders()
        .find((s) => s.track?.kind === "video");

      if (sender) {
        // Check if original track is still live
        if (this.originalVideoTrack.readyState === "live") {
          await sender.replaceTrack(this.originalVideoTrack);
          console.log("   ✅ Restored camera track");
        } else {
          console.warn("   ⚠️ Original camera track is not live");

          // Try to get a new camera track
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
            });
            const newVideoTrack = stream.getVideoTracks()[0];
            await sender.replaceTrack(newVideoTrack);
            this.originalVideoTrack = newVideoTrack;

            // Update local stream
            if (this.localStream) {
              const oldTrack = this.localStream.getVideoTracks()[0];
              if (oldTrack) {
                this.localStream.removeTrack(oldTrack);
                oldTrack.stop();
              }
              this.localStream.addTrack(newVideoTrack);
            }

            console.log("   ✅ Acquired new camera track");
          } catch (error) {
            console.error("   ❌ Failed to restore camera:", error);
          }
        }
      }
    }

    console.log("✅ Screen share stopped");
  }
  /**
   * Toggle local audio on/off
   */
  toggleAudio(enabled: boolean): void {
    if (!this.localStream) {
      console.warn("⚠️ Cannot toggle audio: no local stream");
      return;
    }

    console.log(`\n🎤 ${enabled ? "Enabling" : "Disabling"} Local Audio`);

    const audioTracks = this.localStream.getAudioTracks();
    console.log(`   Found ${audioTracks.length} audio track(s)`);

    audioTracks.forEach((track, index) => {
      const oldState = track.enabled;
      track.enabled = enabled;

      console.log(`   Track ${index}:`);
      console.log(`      Label: ${track.label}`);
      console.log(`      State: ${oldState} → ${track.enabled}`);
      console.log(`      Muted: ${track.muted}`);
      console.log(`      ReadyState: ${track.readyState}`);
    });

    console.log(`✅ Local audio ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Toggle local video on/off
   */
  toggleVideo(enabled: boolean): void {
    if (!this.localStream) {
      console.warn("⚠️ Cannot toggle video: no local stream");
      return;
    }

    console.log(`\n📹 ${enabled ? "Enabling" : "Disabling"} Local Video`);

    const videoTracks = this.localStream.getVideoTracks();
    console.log(`   Found ${videoTracks.length} video track(s)`);

    videoTracks.forEach((track, index) => {
      const oldState = track.enabled;
      track.enabled = enabled;

      console.log(`   Track ${index}:`);
      console.log(`      Label: ${track.label}`);
      console.log(`      State: ${oldState} → ${track.enabled}`);
      console.log(`      ReadyState: ${track.readyState}`);
    });

    console.log(`✅ Local video ${enabled ? "enabled" : "disabled"}`);
  }
  /**
   * Get current connection quality metrics
   * Returns detailed quality assessment
   */
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

      let hasAudio = false;
      let hasVideo = false;
      let audioBytes = 0;
      let videoBytes = 0;
      let totalPacketsLost = 0;
      let totalPacketsReceived = 0;

      stats.forEach((report) => {
        if (report.type === "inbound-rtp") {
          if (report.kind === "audio") {
            const bytes = report.bytesReceived || 0;
            if (bytes > 0) {
              hasAudio = true;
              audioBytes = bytes;
            }
            totalPacketsLost += report.packetsLost || 0;
            totalPacketsReceived += report.packetsReceived || 0;
          } else if (report.kind === "video") {
            const bytes = report.bytesReceived || 0;
            if (bytes > 0) {
              hasVideo = true;
              videoBytes = bytes;
            }
            totalPacketsLost += report.packetsLost || 0;
            totalPacketsReceived += report.packetsReceived || 0;
          }
        }
      });

      // Calculate packet loss rate
      const lossRate =
        totalPacketsReceived > 0 ? totalPacketsLost / totalPacketsReceived : 0;

      // Determine quality based on loss rate
      let quality: "good" | "poor" | "none";
      if (!hasAudio && !hasVideo) {
        quality = "none";
      } else if (lossRate < 0.05) {
        quality = "good"; // Less than 5% loss
      } else if (lossRate < 0.15) {
        quality = "poor"; // 5-15% loss
      } else {
        quality = "none"; // More than 15% loss
      }

      return {
        audio: hasAudio,
        video: hasVideo,
        quality,
        audioBytes,
        videoBytes,
        packetLoss: lossRate,
      };
    } catch (error) {
      console.error("Error getting connection quality:", error);
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

  /**
   * Get peer connection instance
   * For advanced use cases
   */
  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  /**
   * Check if currently screen sharing
   */
  isScreenSharing(): boolean {
    return this.screenStream !== null;
  }

  /**
   * Get current audio/video track states
   */
  getTrackStates(): {
    audioEnabled: boolean;
    videoEnabled: boolean;
    audioMuted: boolean;
    videoMuted: boolean;
  } {
    if (!this.localStream) {
      return {
        audioEnabled: false,
        videoEnabled: false,
        audioMuted: true,
        videoMuted: true,
      };
    }

    const audioTrack = this.localStream.getAudioTracks()[0];
    const videoTrack = this.localStream.getVideoTracks()[0];

    return {
      audioEnabled: audioTrack?.enabled || false,
      videoEnabled: videoTrack?.enabled || false,
      audioMuted: audioTrack?.muted || true,
      videoMuted: videoTrack?.muted || true,
    };
  }
  /**
   * Clean up all WebRTC resources
   * Must be called when done with connection
   */
  close(): void {
    console.log("\n🧹 Closing WebRTC Service");

    // Stop local stream tracks
    if (this.localStream) {
      console.log("   Stopping local stream tracks...");
      this.localStream.getTracks().forEach((track) => {
        track.stop();
        console.log(`      ✅ Stopped ${track.kind}: ${track.label}`);
      });
      this.localStream = null;
    }

    // Stop screen stream tracks
    if (this.screenStream) {
      console.log("   Stopping screen stream tracks...");
      this.screenStream.getTracks().forEach((track) => {
        track.stop();
        console.log(`      ✅ Stopped ${track.kind}: ${track.label}`);
      });
      this.screenStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      console.log("   Closing peer connection...");

      // Remove all event listeners
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.onsignalingstatechange = null;
      this.peerConnection.onnegotiationneeded = null;
      this.peerConnection.onicegatheringstatechange = null;

      this.peerConnection.close();
      this.peerConnection = null;
      console.log("      ✅ Peer connection closed");
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== "closed") {
      console.log("   Closing audio context...");
      this.audioContext.close();
      this.audioContext = null;
      this.audioAnalyser = null;
      console.log("      ✅ Audio context closed");
    }

    // Clean up event listeners
    console.log("   Cleaning up event listeners...");
    this.eventCleanupHandlers.forEach((cleanup) => cleanup());
    this.eventCleanupHandlers = [];

    // Reset state
    this.remoteStream = null;
    this.originalVideoTrack = null;
    this.receivedTracks = { audio: false, video: false };
    this.callbackFired = false;

    console.log("✅ WebRTC Service closed completely");
    console.log("   All resources released\n");
  }

  /**
   * Destructor-like method
   * Ensures cleanup happens
   */
  destroy(): void {
    this.close();
  }
}

// Export types for external use
export type { AudioDiagnostics, ConnectionQuality, TrackInfo };
