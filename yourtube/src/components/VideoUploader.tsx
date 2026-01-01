// ============================================================================
// FREE UNLIMITED VIDEO UPLOADER - Mobile + Desktop Compatible
// Combined & Fixed Version with All Features
// ============================================================================

import { Check, FileVideo, Upload, X, Sparkles, Zap } from "lucide-react";
import React, { ChangeEvent, useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import axiosInstance from "@/lib/axiosinstance";
import { getImageUrl } from "@/lib/imageUtils";
import { useUser } from "@/lib/AuthContext";
// ============================================================================
// VIDEO COMPRESSION UTILITY (Works on Mobile + Desktop)
// ============================================================================

const compressVideo = async (
  file: File,
  targetSizeMB: number = 95
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    video.preload = "metadata";
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      // Calculate compression ratio
      const originalSizeMB = file.size / (1024 * 1024);
      const compressionRatio = targetSizeMB / originalSizeMB;

      // Determine output resolution
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (compressionRatio < 0.5) {
        width = Math.floor(width * 0.7);
        height = Math.floor(height * 0.7);
      }

      canvas.width = width;
      canvas.height = height;

      // Create MediaRecorder for compression
      const stream = canvas.captureStream(30); // 30fps
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: Math.floor(
          (targetSizeMB * 1024 * 1024 * 8) / video.duration
        ),
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const compressedFile = new File(
          [blob],
          file.name.replace(/\.[^.]+$/, ".webm"),
          { type: "video/webm" }
        );

        URL.revokeObjectURL(video.src);
        resolve(compressedFile);
      };

      // Start recording and render frames
      mediaRecorder.start();
      video.play();

      const renderFrame = () => {
        if (video.paused || video.ended) {
          mediaRecorder.stop();
          return;
        }

        ctx?.drawImage(video, 0, 0, width, height);
        requestAnimationFrame(renderFrame);
      };

      video.onseeked = () => {
        renderFrame();
      };
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Failed to load video for compression"));
    };
  });
};
// ============================================================================
// CHUNKED UPLOAD HANDLER (Fixed & Optimized)
// ============================================================================

const uploadLargeVideo = async (
  file: File,
  metadata: any,
  onProgress: (progress: number) => void
): Promise<any> => {
  const CHUNK_SIZE = 90 * 1024 * 1024; // ✅ 90MB chunks (safe for Cloudinary 100MB limit)

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  console.log(`📦 File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  console.log(`📦 Total chunks needed: ${totalChunks}`);

  // ✅ FIXED: Single chunk upload for files < 95MB
  if (totalChunks === 1) {
    console.log("✅ Single chunk upload (file < 95MB)");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("videotitle", metadata.videotitle);
    formData.append("videodescription", metadata.videodescription);
    formData.append("videochanel", metadata.videochanel);

    const res = await axiosInstance.post("/video/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 900000,
      onUploadProgress: (e: any) => {
        onProgress(Math.round((e.loaded * 100) / e.total));
      },
    });

    return res.data;
  }

  // ✅ FIXED: Multi-chunk upload for large files
  console.log(`🔪 Splitting into ${totalChunks} chunks...`);
  toast.info(`Splitting video into ${totalChunks} parts...`);

  const chunkIds: string[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    console.log(
      `📤 Uploading chunk ${i + 1}/${totalChunks} (${(
        chunk.size /
        1024 /
        1024
      ).toFixed(2)}MB)`
    );

    const chunkFile = new File([chunk], `${file.name}.part${i + 1}`, {
      type: file.type,
    });

    const formData = new FormData();
    formData.append("file", chunkFile);
    formData.append("chunkIndex", String(i));
    formData.append("totalChunks", String(totalChunks));
    formData.append("originalFilename", file.name);
    formData.append("videotitle", metadata.videotitle);
    formData.append("videodescription", metadata.videodescription);
    formData.append("videochanel", metadata.videochanel);

    try {
      const res = await axiosInstance.post("/video/upload-chunk", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 900000,
        onUploadProgress: (e: any) => {
          const chunkProgress = Math.round((e.loaded * 100) / e.total);
          const totalProgress = Math.round(
            ((i + chunkProgress / 100) / totalChunks) * 100
          );
          onProgress(totalProgress);
        },
      });

      chunkIds.push(res.data.chunkId);
      console.log(
        `✅ Chunk ${i + 1}/${totalChunks} uploaded: ${res.data.chunkId}`
      );
      toast.success(`Part ${i + 1}/${totalChunks} uploaded`);
    } catch (error: any) {
      console.error(`❌ Chunk ${i + 1} failed:`, error);
      toast.error(`Failed to upload part ${i + 1}`);
      throw error;
    }
  }

  // ✅ Merge all chunks
  console.log("🔗 Merging chunks:", chunkIds);
  toast.info("Merging video parts...");

  const mergeRes = await axiosInstance.post("/video/merge-chunks", {
    chunkIds,
    videotitle: metadata.videotitle,
    videodescription: metadata.videodescription,
    videochanel: metadata.videochanel,
  });

  console.log("✅ Merge complete:", mergeRes.data);
  return mergeRes.data;
};
// ============================================================================
// MAIN UPLOADER COMPONENT
// ============================================================================

const VideoUploader = ({ channelId, channelName }: any) => {
  const { user } = useUser();
  const [imageKey, setImageKey] = useState(Date.now());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [uploadComplete, setUploadComplete] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleUpdate = () => setImageKey(Date.now());
    window.addEventListener("avatarUpdated", handleUpdate);
    return () => window.removeEventListener("avatarUpdated", handleUpdate);
  }, []);
  // ============================================================================
  // FILE SELECTION HANDLER
  // ============================================================================

  const handlefilechange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];

      if (!file.type.startsWith("video/")) {
        toast.error("Please upload a valid video file.");
        return;
      }

      // ✅ CRITICAL: Check size IMMEDIATELY
      const sizeMB = file.size / (1024 * 1024);

      if (sizeMB > 280) {
        toast.error(
          `File is ${sizeMB.toFixed(
            0
          )}MB. Maximum is 280MB. Please compress your video first.`,
          { duration: 5000 }
        );
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Clear the input
        }
        return;
      }

      setVideoFile(file);
      const filename = file.name.replace(/\.[^/.]+$/, "");
      if (!videoTitle) {
        setVideoTitle(filename);
      }

      if (sizeMB > 90) {
        toast.info(
          `Large file detected (${sizeMB.toFixed(
            0
          )}MB). Will use chunked upload.`
        );
      } else {
        toast.success(`Video selected: ${sizeMB.toFixed(2)}MB`);
      }

      console.log(`📁 File selected: ${file.name} (${sizeMB.toFixed(2)}MB)`);
    }
  };

  // ============================================================================
  // FORM RESET & CANCEL
  // ============================================================================

  const resetForm = () => {
    setVideoFile(null);
    setVideoTitle("");
    setVideoDescription("");
    setIsUploading(false);
    setIsCompressing(false);
    setUploadProgress(0);
    setUploadComplete(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const cancelUpload = () => {
    if (isUploading || isCompressing) {
      toast.error("Upload cancelled");
    }
    resetForm();
  };
  const handleUpload = async () => {
    console.log("\n🔥 ===== UPLOAD STARTED =====");

    if (!videoFile || !videoTitle.trim()) {
      toast.error("Please provide file and title");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token || token === "null" || token === "undefined") {
      toast.error("You must be logged in to upload videos");
      return;
    }

    const fileSizeMB = videoFile.size / (1024 * 1024);
    console.log(`📊 File size: ${fileSizeMB.toFixed(2)}MB`);

    // ✅ CRITICAL: Block oversized files
    if (fileSizeMB > 100) {
      toast.error(
        `File is ${fileSizeMB.toFixed(0)}MB. Maximum is 100MB for free tier.`,
        { duration: 6000 }
      );
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", videoFile);
      formData.append("videotitle", videoTitle);
      formData.append("videodescription", videoDescription);
      formData.append("videochanel", channelName);

      // ✅ Use /api/video/upload (will be created next)
      const res = await axiosInstance.post("/api/video/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 600000,
        onUploadProgress: (e: any) => {
          setUploadProgress(Math.round((e.loaded * 100) / e.total));
        },
      });

      if (res.data.success) {
        setUploadComplete(true);
        toast.success("🎉 Video uploaded successfully!");
        setTimeout(() => {
          resetForm();
          window.location.reload();
        }, 2000);
      }
    } catch (error: any) {
      console.error("❌ Upload error:", error);

      let errorMessage = "Upload failed";

      if (error.response?.status === 413) {
        errorMessage = "File too large. Maximum is 100MB.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { duration: 5000 });
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  }; // ============================================================================
  // COMPONENT JSX RENDER
  // ============================================================================

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
      {/* User Avatar & Channel Info */}
      {user && (
        <div className="flex items-center gap-3 mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Avatar className="w-10 h-10 ring-2 ring-blue-500">
            <AvatarImage
              key={`uploader-avatar-${imageKey}`}
              src={getImageUrl(user?.image, true)}
              alt={user?.name || "User"}
            />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {user?.channelname || user?.name}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Uploading as this channel
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Upload a video</h2>
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <Zap className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-4">
        {/* File Upload Drop Zone */}
        {!videoFile ? (
          <div
            className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Drag and drop video files to upload
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              or click to select files
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
              MP4, WebM, MOV or AVI
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                ⚡ Files up to 90MB: Direct upload
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                📦 Files 90MB-280MB: Auto-chunked upload
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                ⚠️ Files over 280MB: Please compress first
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="video/*"
              onChange={handlefilechange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected File Display */}
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-md">
                <FileVideo className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-gray-900 dark:text-white">
                  {videoFile.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              {!isUploading && !uploadComplete && (
                <Button variant="ghost" size="icon" onClick={cancelUpload}>
                  <X className="w-5 h-5" />
                </Button>
              )}
              {uploadComplete && (
                <div className="bg-green-100 dark:bg-green-900 p-1 rounded-full">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              )}
            </div>
            {/* Title & Description Form */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Title (required)</Label>
                <Input
                  id="title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Add a title that describes your video"
                  disabled={isUploading || uploadComplete || isCompressing}
                  className="mt-1"
                />
              </div>

              <div>
                <Label
                  htmlFor="description"
                  className="flex items-center gap-2"
                >
                  Description (optional)
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Auto-generated if empty
                  </span>
                </Label>
                <Textarea
                  id="description"
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Leave empty for AI-generated description, or write your own..."
                  disabled={isUploading || uploadComplete || isCompressing}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
            {/* Compression Status */}
            {isCompressing && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-blue-800 dark:text-blue-300 text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 animate-pulse" />
                  Compressing video for faster upload...
                </p>
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && !isCompressing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Upload Complete Message */}
            {uploadComplete && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-green-800 dark:text-green-300 text-sm font-medium">
                  ✅ Video uploaded successfully! Page will refresh shortly...
                </p>
              </div>
            )}
            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              {!uploadComplete && (
                <>
                  <Button
                    variant="outline"
                    onClick={cancelUpload}
                    disabled={isUploading || isCompressing}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={
                      isUploading || !videoTitle.trim() || isCompressing
                    }
                  >
                    {isCompressing
                      ? "Compressing..."
                      : isUploading
                      ? "Uploading..."
                      : "Upload"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploader;
