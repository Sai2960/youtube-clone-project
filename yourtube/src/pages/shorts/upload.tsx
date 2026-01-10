// src/pages/shorts/upload.tsx - PREMIUM FIXED VERSION
import { useState, useRef, useEffect, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import {
  Upload,
  X,
  Play,
  AlertCircle,
  CheckCircle,
  Loader,
  Sparkles,
  Loader2,
  ArrowLeft,
  Image as ImageIcon,
  Video,
  Info,
} from "lucide-react";
import axios from "axios";
import { GetServerSideProps } from "next";

const getApiUrl = () =>
  process.env.NEXT_PUBLIC_API_URL ||
  "https://youtube-clone-project-production.up.railway.app";

interface FormData {
  title: string;
  description: string;
  category: string;
  tags: string;
}

const ShortsUploadPage = () => {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [channelName, setChannelName] = useState<string>("");

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    category: "Entertainment",
    tags: "",
  });

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [videoDuration, setVideoDuration] = useState<number>(0);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      router.push("/login?redirect=/shorts/upload");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const id = payload.userId || payload.id;
      const name = payload.channelname || payload.name || "Your Channel";

      setUserId(id);
      setChannelName(name);
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Error parsing token:", error);
      router.push("/login?redirect=/shorts/upload");
    }
  }, [router]);

  const autoGenerateContent = () => {
    if (!videoFile) {
      setError("Please select a video first");
      return;
    }

    setAutoGenerating(true);
    setError("");

    const fileName = videoFile.name.replace(/\.[^/.]+$/, "");
    const cleanName = fileName
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    const autoTitle = cleanName.substring(0, 95);
    const autoDescription = `Check out this amazing ${videoDuration}s short! 🎬
    
${cleanName}

Watch till the end! Don't forget to like and subscribe!

#shorts #viral #trending #fyp`;

    const commonTags = ["shorts", "viral", "trending", "fyp"];
    const filenameTags = fileName
      .toLowerCase()
      .split(/[_\-\s]+/)
      .filter((tag) => tag.length > 2 && tag.length < 20);

    const allTags = [...new Set([...commonTags, ...filenameTags])];
    const autoTags = allTags.slice(0, 10).join(", ");

    const categoryKeywords: { [key: string]: string[] } = {
      Gaming: ["game", "gaming", "gameplay", "play", "gamer"],
      Music: ["music", "song", "sing", "dance", "beat"],
      Comedy: ["funny", "comedy", "laugh", "joke", "humor"],
      Education: ["learn", "tutorial", "how", "guide", "tips"],
      Sports: ["sport", "fitness", "workout", "gym", "exercise"],
      Technology: ["tech", "code", "programming", "ai", "app"],
      Lifestyle: ["life", "vlog", "daily", "routine", "lifestyle"],
    };

    let detectedCategory = "Entertainment";
    const lowerFileName = fileName.toLowerCase();

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => lowerFileName.includes(keyword))) {
        detectedCategory = category;
        break;
      }
    }

    setFormData({
      title: autoTitle,
      description: autoDescription.trim(),
      category: detectedCategory,
      tags: autoTags,
    });

    setTimeout(() => {
      setAutoGenerating(false);
    }, 800);
  };

  const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError("Video file must be less than 100MB");
      return;
    }

    setError("");
    setVideoFile(file);

    const url = URL.createObjectURL(file);
    setVideoPreview(url);

    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const duration = Math.floor(video.duration);

      if (duration > 60) {
        setError("Video must be 60 seconds or less for Shorts");
        setVideoFile(null);
        setVideoPreview("");
        return;
      }

      setVideoDuration(duration);
    };
    video.src = url;
  };

  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Thumbnail size must be less than 5MB");
      return;
    }

    setThumbnailFile(file);
    setError("");

    const url = URL.createObjectURL(file);
    setThumbnailPreview(url);
  };

  const handleDrop = (e: React.DragEvent, type: "video" | "thumbnail") => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];

    if (!file) return;

    if (type === "video" && file.type.startsWith("video/")) {
      const fakeEvent = { target: { files: [file] } } as any;
      handleVideoChange(fakeEvent);
    } else if (type === "thumbnail" && file.type.startsWith("image/")) {
      const fakeEvent = { target: { files: [file] } } as any;
      handleThumbnailChange(fakeEvent);
    } else {
      setError(`Please drop a valid ${type} file`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview("");
    setVideoDuration(0);
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview("");
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = "";
    }
  };

  const handleUpload = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    if (!videoFile) {
      setError("Please select a video file");
      return;
    }

    if (!thumbnailFile) {
      setError("Please select a thumbnail image");
      return;
    }

    if (!formData.title.trim()) {
      setError("Please enter a title");
      return;
    }

    if (!userId) {
      setError("User not authenticated");
      return;
    }

    if (videoDuration > 60) {
      setError("Video must be 60 seconds or less");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setUploadProgress(0);

      const uploadData = new FormData();
      uploadData.append("video", videoFile);
      uploadData.append("thumbnail", thumbnailFile);
      const safeTitle = formData.title.trim().substring(0, 100);
      uploadData.append("title", safeTitle);
      uploadData.append("description", formData.description.trim());
      uploadData.append("category", formData.category);
      uploadData.append("duration", videoDuration.toString());
      uploadData.append("userId", userId);
      uploadData.append("channelName", channelName);

      const tagsArray = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      uploadData.append("tags", JSON.stringify(tagsArray));

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");
      const apiUrl = getApiUrl();

      const response = await axios.post(
        `${apiUrl}/api/shorts/upload`,
        uploadData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setUploadProgress(progress);
          },
        }
      );

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/shorts");
        }, 2000);
      } else {
        throw new Error(response.data.message || "Upload failed");
      }
    } catch (error: any) {
      console.error("❌ Upload error:", error);

      let errorMessage = "Failed to upload short. Please try again.";

      if (error.response) {
        const responseData = error.response.data;
        errorMessage = responseData?.message || errorMessage;

        if (error.response.status === 401) {
          errorMessage = "Session expired. Please login again.";
          setTimeout(() => router.push("/login?redirect=/shorts/upload"), 2000);
        } else if (errorMessage.includes("Title")) {
          const titleLength =
            responseData?.titleLength || formData.title.length;
          const maxLength = responseData?.maxLength || 200;
          errorMessage = `Title too long (${titleLength} chars). Please shorten to ${maxLength} characters or less.`;

          setFormData((prev) => ({
            ...prev,
            title: prev.title.substring(0, maxLength - 5),
          }));
        }
      } else if (error.request) {
        errorMessage = "Network error. Please check your connection.";
      } else {
        errorMessage = error.message || errorMessage;
      }

      setError(errorMessage);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Short Uploaded!
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Redirecting to Shorts...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Upload Short - YourTube</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200">
        {/* Scrollable Content Container */}
        <div className="min-h-screen overflow-y-auto pb-24 md:pb-28">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 md:py-6">
            {/* Header Section */}
            <div className="mb-6 md:mb-8">
              <button
                onClick={() => router.push("/shorts")}
                className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Back to Shorts</span>
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                    Upload Short
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Vertical video (9:16 ratio, max 60s)
                  </p>
                </div>

                {/* Auto-Generate Button */}
                {videoFile && (
                  <button
                    type="button"
                    onClick={autoGenerateContent}
                    disabled={autoGenerating}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all disabled:opacity-50 font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {autoGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Auto-Generate</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleUpload}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Left Column - File Uploads */}
                <div className="space-y-6">
                  {/* Video Upload Card */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                      <Video className="w-4 h-4 text-red-500" />
                      <label className="text-sm font-semibold">
                        Video <span className="text-red-500">*</span>
                      </label>
                    </div>

                    <div className="p-4">
                      {!videoPreview ? (
                        <div
                          onClick={() => videoInputRef.current?.click()}
                          onDrop={(e) => handleDrop(e, "video")}
                          onDragOver={handleDragOver}
                          className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 md:p-12 text-center cursor-pointer hover:border-red-400 dark:hover:border-red-500 hover:bg-red-50/50 dark:hover:bg-red-500/5 transition-all duration-200 group"
                        >
                          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-red-500" />
                          </div>
                          <h3 className="text-base font-semibold mb-2">
                            Upload Video
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            Drag and drop or click to browse
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            MP4, WebM, MOV • Max 60s • Max 100MB
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden relative max-w-[280px] mx-auto shadow-lg">
                            <video
                              ref={videoPreviewRef}
                              src={videoPreview}
                              controls
                              className="w-full h-full object-contain"
                            />
                            <button
                              type="button"
                              onClick={removeVideo}
                              className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
                            >
                              <X className="w-4 h-4 text-white" />
                            </button>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {videoFile?.name}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {(videoFile!.size / (1024 * 1024)).toFixed(2)} MB
                              {videoDuration > 0 && ` • ${videoDuration}s`}
                            </p>
                          </div>
                        </div>
                      )}

                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleVideoChange}
                        className="hidden"
                        disabled={uploading}
                      />
                    </div>
                  </div>

                  {/* Thumbnail Upload Card */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-blue-500" />
                      <label className="text-sm font-semibold">
                        Thumbnail <span className="text-red-500">*</span>
                      </label>
                    </div>

                    <div className="p-4">
                      {!thumbnailPreview ? (
                        <div
                          onClick={() => thumbnailInputRef.current?.click()}
                          onDrop={(e) => handleDrop(e, "thumbnail")}
                          onDragOver={handleDragOver}
                          className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 md:p-8 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all duration-200 group"
                        >
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <ImageIcon className="w-6 h-6 text-blue-500" />
                          </div>
                          <p className="text-sm font-medium mb-1">
                            Upload Thumbnail
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            JPG, PNG • Max 5MB • 9:16 recommended
                          </p>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="aspect-[9/16] max-w-[200px] mx-auto rounded-xl overflow-hidden shadow-lg">
                            <img
                              src={thumbnailPreview}
                              alt="Thumbnail preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={removeThumbnail}
                            className="absolute top-2 right-2 md:top-auto md:right-auto md:left-1/2 md:-translate-x-1/2 md:-bottom-3 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      )}

                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailChange}
                        className="hidden"
                        disabled={uploading}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column - Details */}
                <div className="space-y-6">
                  {/* Details Card */}
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                      <h3 className="text-sm font-semibold">Details</h3>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Title */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                          Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          placeholder="Give your short a catchy title"
                          maxLength={100}
                          required
                          disabled={uploading}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all text-sm"
                        />
                        <p className="text-[10px] text-gray-400 mt-1.5 text-right">
                          {formData.title.length}/100
                        </p>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                          Description (Optional)
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          placeholder="Tell viewers about your short"
                          rows={4}
                          maxLength={500}
                          disabled={uploading}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all resize-none text-sm"
                        />
                        <p className="text-[10px] text-gray-400 mt-1.5 text-right">
                          {formData.description.length}/500
                        </p>
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                          Category
                        </label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          disabled={uploading}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all text-sm appearance-none cursor-pointer"
                        >
                          <option value="Entertainment">Entertainment</option>
                          <option value="Music">Music</option>
                          <option value="Gaming">Gaming</option>
                          <option value="Education">Education</option>
                          <option value="Comedy">Comedy</option>
                          <option value="Sports">Sports</option>
                          <option value="Technology">Technology</option>
                          <option value="Lifestyle">Lifestyle</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Tags */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                          Tags (comma separated)
                        </label>
                        <input
                          type="text"
                          name="tags"
                          value={formData.tags}
                          onChange={handleInputChange}
                          placeholder="e.g. funny, viral, trending"
                          disabled={uploading}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tips Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4 md:p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm">
                        Tips for Shorts
                      </h4>
                    </div>
                    <ul className="space-y-2">
                      {[
                        "Keep it under 60 seconds",
                        "Use vertical format (9:16)",
                        "Hook viewers in first 3 seconds",
                        "Add captions for better reach",
                      ].map((tip, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300/80"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Upload Progress */}
                  {uploading && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold flex items-center gap-2">
                          <Loader className="w-4 h-4 animate-spin text-red-500" />
                          Uploading...
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-red-500 to-pink-500 h-full transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Fixed Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 md:py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/shorts")}
                disabled={uploading}
                className="px-5 py-2.5 md:px-6 md:py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={() => handleUpload()}
                disabled={
                  !videoFile ||
                  !thumbnailFile ||
                  !formData.title.trim() ||
                  uploading
                }
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 disabled:cursor-not-allowed text-white font-semibold py-2.5 md:py-3 rounded-xl transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40 disabled:shadow-none inline-flex items-center justify-center gap-2 text-sm hover:scale-[1.01] active:scale-[0.99]"
              >
                {uploading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Uploading {uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload Short</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {},
  };
};

export default ShortsUploadPage;
