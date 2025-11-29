// lib/recordingService.ts - COMPLETE FIXED VERSION
export class RecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording: boolean = false;
  private canvas: HTMLCanvasElement | null = null;
  private canvasStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private audioContext: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;

  /**
   * Start recording with mixed audio and picture-in-picture video
   */
  async startRecording(
    localVideo: HTMLVideoElement,
    remoteVideo: HTMLVideoElement,
    localStream: MediaStream,
    remoteStream: MediaStream
  ): Promise<void> {
    try {
      console.log('🔴 Starting recording...');
      console.log('   Local tracks:', localStream.getTracks().length);
      console.log('   Remote tracks:', remoteStream.getTracks().length);

      // Create canvas for video composition
      this.canvas = document.createElement('canvas');
      this.canvas.width = 1920;
      this.canvas.height = 1080;
      const ctx = this.canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Setup audio mixing
      this.setupAudioMixing(localStream, remoteStream);

      // Start drawing frames
      let isDrawing = true;
      const drawFrame = () => {
        if (!ctx || !isDrawing || !this.canvas) return;

        try {
          // Draw remote video (full screen background)
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          
          if (remoteVideo.videoWidth > 0 && remoteVideo.videoHeight > 0) {
            ctx.drawImage(remoteVideo, 0, 0, this.canvas.width, this.canvas.height);
          }

          // Draw local video (picture-in-picture)
          if (localVideo.videoWidth > 0 && localVideo.videoHeight > 0) {
            const pipWidth = 384; // 20% of 1920
            const pipHeight = 216; // 20% of 1080
            const pipX = this.canvas.width - pipWidth - 30;
            const pipY = this.canvas.height - pipHeight - 30;

            // PiP border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.strokeRect(pipX - 2, pipY - 2, pipWidth + 4, pipHeight + 4);

            // PiP video
            ctx.drawImage(localVideo, pipX, pipY, pipWidth, pipHeight);
          }

          this.animationFrameId = requestAnimationFrame(drawFrame);
        } catch (error) {
          console.error('Frame draw error:', error);
        }
      };

      drawFrame();

      // Capture canvas stream at 30fps
      this.canvasStream = this.canvas.captureStream(30);
      console.log('✅ Canvas stream created');

      // Combine video from canvas with mixed audio
      const tracks: MediaStreamTrack[] = [
        ...this.canvasStream.getVideoTracks()
      ];

      if (this.audioDestination && this.audioDestination.stream.getTracks().length > 0) {
        tracks.push(...this.audioDestination.stream.getTracks());
        console.log('✅ Audio track added to recording');
      } else {
        console.warn('⚠️ No audio track available for recording');
      }

      const combinedStream = new MediaStream(tracks);
      console.log('✅ Combined stream created with', tracks.length, 'tracks');

      // Create MediaRecorder with best available codec
      const mimeType = this.getSupportedMimeType();
      const options: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: 5000000, // 5 Mbps
      };

      // Only add audioBitsPerSecond if audio track exists
      if (this.audioDestination) {
        options.audioBitsPerSecond = 128000; // 128 kbps
      }

      this.mediaRecorder = new MediaRecorder(combinedStream, options);
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
          console.log(`📦 Chunk recorded: ${(event.data.size / 1024).toFixed(2)} KB`);
        }
      };

      this.mediaRecorder.onstop = () => {
        isDrawing = false;
        console.log('⏹️ Recording stopped, total chunks:', this.recordedChunks.length);
        this.downloadRecording();
      };

      this.mediaRecorder.onerror = (event: any) => {
        console.error('❌ MediaRecorder error:', event.error);
        this.stopRecording();
      };

      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;

      console.log('✅ Recording started successfully');
      console.log('   MIME type:', mimeType);
      console.log('   Video bitrate: 5 Mbps');
      console.log('   Audio bitrate:', this.audioDestination ? '128 kbps' : 'None');

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Mix audio from both local and remote streams
   */
  private setupAudioMixing(localStream: MediaStream, remoteStream: MediaStream): void {
    try {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContext();
      this.audioDestination = this.audioContext.createMediaStreamDestination();

      let audioSourcesConnected = 0;

      // Add local audio
      const localAudioTracks = localStream.getAudioTracks();
      if (localAudioTracks.length > 0 && localAudioTracks[0].enabled) {
        try {
          const localSource = this.audioContext.createMediaStreamSource(
            new MediaStream([localAudioTracks[0]])
          );
          
          // Add gain control for local audio
          const localGain = this.audioContext.createGain();
          localGain.gain.value = 0.7; // Slightly reduce local audio to prevent echo
          
          localSource.connect(localGain);
          localGain.connect(this.audioDestination);
          
          audioSourcesConnected++;
          console.log('✅ Local audio connected (gain: 0.7)');
        } catch (error) {
          console.error('❌ Failed to connect local audio:', error);
        }
      } else {
        console.warn('⚠️ No local audio track available');
      }

      // Add remote audio
      const remoteAudioTracks = remoteStream.getAudioTracks();
      if (remoteAudioTracks.length > 0 && remoteAudioTracks[0].enabled) {
        try {
          const remoteSource = this.audioContext.createMediaStreamSource(
            new MediaStream([remoteAudioTracks[0]])
          );
          
          // Add gain control for remote audio
          const remoteGain = this.audioContext.createGain();
          remoteGain.gain.value = 1.0; // Full volume for remote audio
          
          remoteSource.connect(remoteGain);
          remoteGain.connect(this.audioDestination);
          
          audioSourcesConnected++;
          console.log('✅ Remote audio connected (gain: 1.0)');
        } catch (error) {
          console.error('❌ Failed to connect remote audio:', error);
        }
      } else {
        console.warn('⚠️ No remote audio track available');
      }

      if (audioSourcesConnected === 0) {
        console.warn('⚠️ No audio sources connected - recording will have no audio');
        this.audioContext.close();
        this.audioContext = null;
        this.audioDestination = null;
      } else {
        console.log(`✅ Audio mixing setup complete (${audioSourcesConnected} sources)`);
      }

    } catch (error) {
      console.error('❌ Audio mixing setup failed:', error);
      this.audioContext = null;
      this.audioDestination = null;
    }
  }

  /**
   * Get supported MIME type for recording
   */
  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('✅ Selected MIME type:', type);
        return type;
      }
    }

    console.warn('⚠️ No ideal MIME type supported, using default');
    return '';
  }

  /**
   * Stop recording and trigger download
   */
  stopRecording(): void {
    console.log('⏹️ Stopping recording...');

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.isRecording = false;
  }

  /**
   * Download the recorded video
   */
  private downloadRecording(): void {
    if (this.recordedChunks.length === 0) {
      console.warn('⚠️ No recording data to download');
      return;
    }

    try {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
      
      console.log(`📥 Preparing download: ${sizeMB} MB`);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `call-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
      
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      console.log(`✅ Recording downloaded: ${sizeMB} MB`);
      
      // Cleanup resources after download
      this.cleanup();
      this.recordedChunks = [];

    } catch (error) {
      console.error('❌ Failed to download recording:', error);
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    console.log('🧹 Cleaning up recording service...');

    if (this.canvasStream) {
      this.canvasStream.getTracks().forEach(track => {
        track.stop();
        console.log('   Stopped canvas track');
      });
      this.canvasStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(err => 
        console.warn('Audio context close error:', err)
      );
      this.audioContext = null;
    }

    this.audioDestination = null;
    this.canvas = null;
    
    console.log('✅ Cleanup complete');
  }

  /**
   * Check if currently recording
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get recording duration in seconds
   */
  getRecordingSize(): string {
    const totalBytes = this.recordedChunks.reduce((acc, chunk) => acc + chunk.size, 0);
    return `${(totalBytes / 1024 / 1024).toFixed(2)} MB`;
  }
}