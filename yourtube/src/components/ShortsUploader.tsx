// src/components/ShortsUploader.tsx - FIXED TO MATCH VideoUploader
import { useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/router';
import { Upload, X, Play, AlertCircle, Loader, Sparkles, Loader2 } from 'lucide-react';
import axios from 'axios';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "https://youtube-clone-project-q3pd.onrender.com"


}';

interface ShortsUploaderProps {
  channelId: string;
  channelName: string;
  channelImage?: string;
  onUploadSuccess?: (short: any) => void;
}

interface FormData {
  title: string;
  description: string;
  category: string;
  tags: string;
}

const ShortsUploader = ({ channelId, channelName, channelImage, onUploadSuccess }: ShortsUploaderProps) => {
  const router = useRouter();
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

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const autoGenerateContent = () => {
    if (!videoFile) {
      setError('Please select a video first');
      return;
    }

    setAutoGenerating(true);
    setError('');

    const fileName = videoFile.name.replace(/\.[^/.]+$/, '');
    const cleanName = fileName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const autoTitle = cleanName.substring(0, 80);
    const autoDescription = `Check out this amazing ${videoDuration}s short! 🎬\n\n${cleanName}\n\nWatch till the end! Don't forget to like and subscribe!\n\n#shorts #viral #trending #fyp`;

    const commonTags = ['shorts', 'viral', 'trending', 'fyp'];
    const filenameTags = fileName.toLowerCase().split(/[_\-\s]+/).filter(tag => tag.length > 2 && tag.length < 20);
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

    setTimeout(() => setAutoGenerating(false), 800);
  };

  const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError('Video must be less than 100MB');
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
        setError('Video must be 60 seconds or less');
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
      setError('Thumbnail must be less than 5MB');
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
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview('');
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoFile || !thumbnailFile || !formData.title.trim()) {
      setError('Please fill all required fields');
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
      uploadData.append('userId', channelId);
      uploadData.append('channelName', channelName);

      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
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
        if (onUploadSuccess) onUploadSuccess(response.data.data);

        setTimeout(() => {
          setVideoFile(null);
          setThumbnailFile(null);
          setVideoPreview('');
          setThumbnailPreview('');
          setFormData({ title: '', description: '', category: 'Entertainment', tags: '' });
          setSuccess(false);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Play className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Short Uploaded Successfully!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Your short is now live on your channel
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleUpload}>
        {/* ✅ FIXED CHANNEL INFO HEADER - NOW MATCHES VideoUploader EXACTLY */}
        <div className="flex items-center gap-3 mb-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <Avatar className="w-10 h-10 ring-2 ring-blue-500">
            <AvatarImage 
              src={channelImage}
              alt={channelName}
            />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              {channelName?.[0]?.toUpperCase() || 'C'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {channelName}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Uploading as this channel
            </p>
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-4">Upload Shorts</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: File Uploads */}
          <div className="space-y-4">
            {/* Video Upload */}
            <div>
              {!videoPreview ? (
                <div
                  onClick={() => videoInputRef.current?.click()}
                  onDrop={(e) => handleDrop(e, 'video')}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-red-500 dark:hover:border-red-500 transition-colors bg-gray-50 dark:bg-gray-800"
                >
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Drag and drop video files to upload
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    or click to select files
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    MP4, WebM, MOV or AVI • Up to 100MB • Max 60 seconds
                  </p>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-xl overflow-hidden">
                  <div className="aspect-[9/16] bg-black relative max-w-sm mx-auto">
                    <video src={videoPreview} controls className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="absolute top-3 right-3 w-8 h-8 bg-black/80 hover:bg-black rounded-full flex items-center justify-center"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  <div className="p-3 bg-gray-800 text-xs text-gray-300">
                    {videoFile?.name} • {videoDuration}s • {(videoFile!.size / (1024 * 1024)).toFixed(2)} MB
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
            {videoFile && (
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                  Thumbnail
                </label>
                {!thumbnailPreview ? (
                  <div
                    onClick={() => thumbnailInputRef.current?.click()}
                    onDrop={(e) => handleDrop(e, 'thumbnail')}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-red-500 transition-colors bg-gray-50 dark:bg-gray-800"
                  >
                    <Upload className="mx-auto w-10 h-10 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Upload Thumbnail</p>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG • Max 5MB</p>
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden">
                    <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-40 object-cover" />
                    <button
                      type="button"
                      onClick={removeThumbnail}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/80 rounded-full flex items-center justify-center"
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
            )}
          </div>

          {/* Right: Details Form */}
          {videoFile && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={autoGenerateContent}
                disabled={autoGenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition disabled:opacity-50 text-white font-semibold"
              >
                {autoGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Auto-Generate Details
                  </>
                )}
              </button>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Add a catchy title"
                  maxLength={100}
                  required
                  disabled={uploading}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Tell viewers about your short"
                  rows={3}
                  maxLength={500}
                  disabled={uploading}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  disabled={uploading}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
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

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
                  Tags
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="e.g. funny, viral, trending"
                  disabled={uploading}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              {uploading && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700 dark:text-gray-300">Uploading...</span>
                    <span className="text-gray-500">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-red-600 h-full rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!videoFile || !thumbnailFile || !formData.title.trim() || uploading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Uploading {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload Short
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default ShortsUploader;