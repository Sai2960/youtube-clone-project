// src/pages/shorts/upload.tsx - MOBILE FIXED VERSION
import { useState, useRef, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Upload, X, Play, AlertCircle, CheckCircle, Loader, Sparkles, Loader2 } from 'lucide-react';
import axios from 'axios';

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://${"https://youtube-clone-project-q3pd.onrender.com"

}';

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
  const [channelName, setChannelName] = useState<string>('');
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: 'Entertainment',
    tags: ''
  });
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number>(0);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>('');
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
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/shorts/upload');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id = payload.userId || payload.id;
      const name = payload.channelname || payload.name || 'Your Channel';
      
      setUserId(id);
      setChannelName(name);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Error parsing token:', error);
      router.push('/login?redirect=/shorts/upload');
    }
  }, [router]);

  const autoGenerateContent = () => {
    if (!videoFile) {
      setError('Please select a video first');
      return;
    }

    setAutoGenerating(true);
    setError('');
    
    const fileName = videoFile.name.replace(/\.[^/.]+$/, '');
    const cleanName = fileName
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    const autoTitle = cleanName.substring(0, 80);
    const autoDescription = `Check out this amazing ${videoDuration}s short! 🎬
    
${cleanName}

Watch till the end! Don't forget to like and subscribe!

#shorts #viral #trending #fyp`;

    const commonTags = ['shorts', 'viral', 'trending', 'fyp'];
    const filenameTags = fileName
      .toLowerCase()
      .split(/[_\-\s]+/)
      .filter(tag => tag.length > 2 && tag.length < 20);
    
    const allTags = [...new Set([...commonTags, ...filenameTags])];
    const autoTags = allTags.slice(0, 10).join(', ');

    const categoryKeywords: { [key: string]: string[] } = {
      'Gaming': ['game', 'gaming', 'gameplay', 'play', 'gamer'],
      'Music': ['music', 'song', 'sing', 'dance', 'beat'],
      'Comedy': ['funny', 'comedy', 'laugh', 'joke', 'humor'],
      'Education': ['learn', 'tutorial', 'how', 'guide', 'tips'],
      'Sports': ['sport', 'fitness', 'workout', 'gym', 'exercise'],
      'Technology': ['tech', 'code', 'programming', 'ai', 'app'],
      'Lifestyle': ['life', 'vlog', 'daily', 'routine', 'lifestyle'],
    };

    let detectedCategory = 'Entertainment';
    const lowerFileName = fileName.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerFileName.includes(keyword))) {
        detectedCategory = category;
        break;
      }
    }

    setFormData({
      title: autoTitle,
      description: autoDescription.trim(),
      category: detectedCategory,
      tags: autoTags
    });

    setTimeout(() => {
      setAutoGenerating(false);
    }, 800);
  };

  const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError('Video file must be less than 100MB');
      return;
    }

    setError('');
    setVideoFile(file);
    
    const url = URL.createObjectURL(file);
    setVideoPreview(url);

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const duration = Math.floor(video.duration);
      
      if (duration > 60) {
        setError('Video must be 60 seconds or less for Shorts');
        setVideoFile(null);
        setVideoPreview('');
        return;
      }
      
      setVideoDuration(duration);
      
      if (!formData.title) {
        const filename = file.name.replace(/\.[^/.]+$/, '');
        setFormData(prev => ({ ...prev, title: filename }));
      }
    };
    video.src = url;
  };

  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Thumbnail size must be less than 5MB');
      return;
    }

    setThumbnailFile(file);
    setError('');

    const url = URL.createObjectURL(file);
    setThumbnailPreview(url);
  };

  const handleDrop = (e: React.DragEvent, type: 'video' | 'thumbnail') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    
    if (!file) return;

    if (type === 'video' && file.type.startsWith('video/')) {
      const fakeEvent = { target: { files: [file] } } as any;
      handleVideoChange(fakeEvent);
    } else if (type === 'thumbnail' && file.type.startsWith('image/')) {
      const fakeEvent = { target: { files: [file] } } as any;
      handleThumbnailChange(fakeEvent);
    } else {
      setError(`Please drop a valid ${type} file`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview('');
    setVideoDuration(0);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview('');
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = '';
    }
  };

  const handleUpload = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    if (!videoFile) {
      setError('Please select a video file');
      return;
    }

    if (!thumbnailFile) {
      setError('Please select a thumbnail image');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (!userId) {
      setError('User not authenticated');
      return;
    }

    if (videoDuration > 60) {
      setError('Video must be 60 seconds or less');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setUploadProgress(0);

      const uploadData = new FormData();
      uploadData.append('video', videoFile);
      uploadData.append('thumbnail', thumbnailFile);
      uploadData.append('title', formData.title.trim());
      uploadData.append('description', formData.description.trim());
      uploadData.append('category', formData.category);
      uploadData.append('duration', videoDuration.toString());
      uploadData.append('userId', userId);
      uploadData.append('channelName', channelName);

      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      uploadData.append('tags', JSON.stringify(tagsArray));

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const apiUrl = getApiUrl();

      const response = await axios.post(
        `${apiUrl}/api/shorts/upload`,
        uploadData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
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
          router.push('/shorts');
        }, 2000);
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      
      let errorMessage = 'Failed to upload short. Please try again.';
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
        
        if (error.response.status === 401) {
          errorMessage = 'Session expired. Please login again.';
          setTimeout(() => router.push('/login?redirect=/shorts/upload'), 2000);
        }
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Short Uploaded!</h2>
          <p className="text-gray-400 mb-4">Redirecting to Shorts...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Upload Short - YourTube</title>
      </Head>

      <div className="min-h-screen bg-black text-white pb-24 md:pb-20">
        <div className="max-w-6xl mx-auto px-3 py-4 md:px-4 md:py-8">
          {/* ✅ FIXED MOBILE HEADER */}
          <div className="mb-6 md:mb-8">
            <button
              onClick={() => router.push('/shorts')}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-3 md:mb-4 text-sm md:text-base"
            >
              <span>←</span>
              <span>Back</span>
            </button>
            
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold mb-1 md:text-3xl md:mb-2">Upload Short</h1>
                <p className="text-xs text-gray-400 md:text-base">Vertical video (9:16 ratio, max 60s)</p>
              </div>
              
              {/* ✅ FIXED AUTO-GENERATE BUTTON - FULL WIDTH ON MOBILE */}
              {videoFile && (
                <button
                  type="button"
                  onClick={autoGenerateContent}
                  disabled={autoGenerating}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg md:rounded-xl transition disabled:opacity-50 font-semibold shadow-lg text-sm md:text-base"
                >
                  {autoGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0 md:w-5 md:h-5" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 flex-shrink-0 md:w-5 md:h-5" />
                      <span>Auto-Generate</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-500/20 border border-red-500 rounded-lg p-3 flex items-start gap-2 md:mb-6 md:p-4 md:gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5 md:w-5 md:h-5" />
              <p className="text-red-500 text-xs md:text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleUpload}>
            <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-2">
              {/* Left Column - File Uploads */}
              <div className="space-y-4 md:space-y-6">
                {/* Video Upload */}
                <div>
                  <label className="block text-xs font-semibold mb-2 md:text-sm md:mb-3">
                    Video <span className="text-red-500">*</span>
                  </label>
                  
                  {!videoPreview ? (
                    <div
                      onClick={() => videoInputRef.current?.click()}
                      onDrop={(e) => handleDrop(e, 'video')}
                      onDragOver={handleDragOver}
                      className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-red-600 transition-colors bg-gray-900/50 md:p-12 md:rounded-2xl"
                    >
                      <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-3 md:w-20 md:h-20 md:mb-4">
                        <Upload className="w-6 h-6 text-red-600 md:w-10 md:h-10" />
                      </div>
                      <h3 className="text-sm font-semibold mb-1 md:text-lg md:mb-2">Upload Video</h3>
                      <p className="text-xs text-gray-400 mb-1 md:text-base md:mb-2">Drag and drop or click to browse</p>
                      <p className="text-[10px] text-gray-500 md:text-sm">
                        MP4, WebM, MOV • Max 60s • Max 100MB
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-900 rounded-xl overflow-hidden md:rounded-2xl">
                      <div className="aspect-[9/16] bg-black relative max-w-xs mx-auto md:max-w-sm">
                        <video
                          ref={videoPreviewRef}
                          src={videoPreview}
                          controls
                          className="w-full h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={removeVideo}
                          className="absolute top-3 right-3 w-8 h-8 bg-black/80 hover:bg-black rounded-full flex items-center justify-center transition md:top-4 md:right-4 md:w-10 md:h-10"
                        >
                          <X className="w-4 h-4 md:w-6 md:h-6" />
                        </button>
                      </div>
                      <div className="p-3 border-t border-gray-800 md:p-4">
                        <p className="text-[10px] text-gray-400 break-all md:text-sm">
                          {videoFile?.name} • {(videoFile!.size / (1024 * 1024)).toFixed(2)} MB
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

                {/* Thumbnail Upload */}
                <div>
                  <label className="block text-xs font-semibold mb-2 md:text-sm md:mb-3">
                    Thumbnail <span className="text-red-500">*</span>
                  </label>
                  
                  {!thumbnailPreview ? (
                    <div
                      onClick={() => thumbnailInputRef.current?.click()}
                      onDrop={(e) => handleDrop(e, 'thumbnail')}
                      onDragOver={handleDragOver}
                      className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-red-600 transition-colors bg-gray-900/50 md:p-8 md:rounded-xl"
                    >
                      <Upload className="mx-auto w-8 h-8 text-gray-400 mb-2 md:w-12 md:h-12 md:mb-3" />
                      <p className="text-xs text-gray-400 mb-1 md:text-sm">Upload Thumbnail</p>
                      <p className="text-[10px] text-gray-500 md:text-xs">JPG, PNG • Max 5MB</p>
                    </div>
                  ) : (
                    <div className="relative rounded-lg overflow-hidden md:rounded-xl">
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail preview"
                        className="w-full h-40 object-cover md:h-48"
                      />
                      <button
                        type="button"
                        onClick={removeThumbnail}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/80 hover:bg-black rounded-full flex items-center justify-center transition md:top-3 md:right-3 md:w-8 md:h-8"
                      >
                        <X className="w-4 h-4 md:w-5 md:h-5" />
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

              {/* Right Column - Details */}
              <div className="space-y-4 md:space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 md:text-sm md:mb-2">
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
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-red-600 focus:outline-none transition text-sm md:text-base md:px-4 md:py-3"
                  />
                  <p className="text-[10px] text-gray-500 mt-1 md:text-xs">{formData.title.length}/100</p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 md:text-sm md:mb-2">
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
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-red-600 focus:outline-none transition resize-none text-sm md:text-base md:px-4 md:py-3"
                  />
                  <p className="text-[10px] text-gray-500 mt-1 md:text-xs">{formData.description.length}/500</p>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 md:text-sm md:mb-2">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    disabled={uploading}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-red-600 focus:outline-none transition text-sm md:text-base md:px-4 md:py-3"
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
                  <label className="block text-xs font-semibold mb-1.5 md:text-sm md:mb-2">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="e.g. funny, viral, trending"
                    disabled={uploading}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-red-600 focus:outline-none transition text-sm md:text-base md:px-4 md:py-3"
                  />
                </div>

                {/* Tips */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 md:p-4">
                  <h4 className="font-semibold mb-1.5 flex items-center gap-2 text-sm md:text-base md:mb-2">
                    <Play className="w-4 h-4 text-blue-500 md:w-5 md:h-5" />
                    Tips for Shorts
                  </h4>
                  <ul className="text-xs text-gray-300 space-y-0.5 md:text-sm md:space-y-1">
                    <li>• Keep it under 60 seconds</li>
                    <li>• Use vertical format (9:16)</li>
                    <li>• Hook viewers in first 3 seconds</li>
                    <li>• Add captions for better reach</li>
                  </ul>
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5 md:mb-2">
                      <span className="text-xs font-semibold md:text-sm">Uploading...</span>
                      <span className="text-xs text-gray-400 md:text-sm">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden md:h-2">
                      <div
                        className="bg-red-600 h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ✅ FIXED SUBMIT BUTTONS - BETTER MOBILE LAYOUT */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-gray-800 p-3 z-50 md:p-4">
              <div className="max-w-6xl mx-auto flex gap-2 md:gap-4">
                <button
                  type="submit"
                  disabled={!videoFile || !thumbnailFile || !formData.title.trim() || uploading}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors inline-flex items-center justify-center gap-2 text-sm md:text-base md:py-4 md:rounded-xl"
                >
                  {uploading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin flex-shrink-0 md:w-5 md:h-5" />
                      <span className="truncate">{uploadProgress}%</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 flex-shrink-0 md:w-5 md:h-5" />
                      <span>Upload</span>
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => router.push('/shorts')}
                  disabled={uploading}
                  className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm md:text-base md:px-8 md:py-4 md:rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ShortsUploadPage;