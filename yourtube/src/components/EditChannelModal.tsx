// src/components/EditChannelModal.tsx - PROFESSIONAL DESIGN
import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, Check, Image as ImageIcon } from 'lucide-react';
import axiosInstance from '@/lib/axiosinstance';
import { useUser } from '@/lib/AuthContext';
import { getImageUrl } from '@/lib/imageUtils';

interface EditChannelModalProps {
  channel: any;
  onClose: () => void;
  onUpdate: (type: 'avatar' | 'banner', newUrl: string) => void;
}

const EditChannelModal: React.FC<EditChannelModalProps> = ({ channel, onClose, onUpdate }) => {
  const { user, updateUser } = useUser();
  const [activeTab, setActiveTab] = useState<'avatar' | 'banner'>('avatar');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select an image first');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('imageType', activeTab === 'avatar' ? 'profile' : 'banner');

      console.log('📤 Uploading:', {
        type: activeTab,
        imageType: activeTab === 'avatar' ? 'profile' : 'banner',
        file: selectedFile.name,
        channelId: channel._id
      });

      const response = await axiosInstance.post(
        `/auth/channel/${channel._id}/upload-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('✅ Upload response:', response.data);

      if (response.data.success) {
        const newImageUrl = response.data.imageUrl;
        
        console.log('📸 New image URL from server:', newImageUrl);
        
        onUpdate(activeTab, newImageUrl);
        
        if (activeTab === 'avatar' && user) {
          const updatedUser = { ...user, image: newImageUrl };
          updateUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          console.log('👤 User context and localStorage updated with:', newImageUrl);
        }
        
        if (activeTab === 'banner' && user) {
          const updatedUser = { ...user, bannerImage: newImageUrl };
          updateUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          console.log('🖼️ Banner updated in localStorage:', newImageUrl);
        }

        alert(`${activeTab === 'avatar' ? 'Avatar' : 'Banner'} updated successfully!`);
        onClose();
        
        setTimeout(() => {
          window.dispatchEvent(new Event('avatarUpdated'));
        }, 100);
      }
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      console.error('   Response:', error.response?.data);
      alert(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getCurrentImage = () => {
    const imageUrl = activeTab === 'avatar' ? channel.image : channel.bannerImage;
    return getImageUrl(imageUrl, true);
  };

  const getRecommendedSize = () => {
    if (activeTab === 'avatar') {
      return '500x500px (Square)';
    }
    return '2560x1440px (16:9)';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Edit Channel Images
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Upload professional images for your channel
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={() => {
              setActiveTab('avatar');
              setPreviewUrl(null);
              setSelectedFile(null);
            }}
            className={`flex-1 py-4 px-6 font-semibold transition-all relative ${
              activeTab === 'avatar'
                ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Profile Picture
            </div>
            {activeTab === 'avatar' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('banner');
              setPreviewUrl(null);
              setSelectedFile(null);
            }}
            className={`flex-1 py-4 px-6 font-semibold transition-all relative ${
              activeTab === 'banner'
                ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Banner Image
            </div>
            {activeTab === 'banner' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
                <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  {activeTab === 'avatar' ? 'Profile Picture Guidelines' : 'Banner Guidelines'}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Recommended size: <span className="font-semibold">{getRecommendedSize()}</span>
                  <br />
                  Format: JPG, PNG, or WebP • Max size: 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Current Image */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Current {activeTab === 'avatar' ? 'Profile Picture' : 'Banner'}
            </label>
            <div className={`rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-md ${
              activeTab === 'avatar' ? 'w-32 h-32 mx-auto' : 'w-full aspect-[21/9]'
            }`}>
              <img
                src={getCurrentImage()}
                alt={activeTab}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('❌ Image load error');
                  e.currentTarget.src = 'https://github.com/shadcn.png';
                }}
              />
            </div>
          </div>

          {/* Upload Area */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Upload New {activeTab === 'avatar' ? 'Profile Picture' : 'Banner'}
            </label>
            
            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-all bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 group"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-gray-900 dark:text-white font-semibold text-lg mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activeTab === 'avatar' ? 'Square images work best' : 'Wide images (16:9) recommended'}
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className={`rounded-xl overflow-hidden border-2 border-blue-500 bg-gray-100 dark:bg-gray-800 shadow-lg ${
                  activeTab === 'avatar' ? 'w-32 h-32 mx-auto' : 'w-full aspect-[21/9]'
                }`}>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={handleRemove}
                  className="absolute -top-3 -right-3 bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-full shadow-lg transition-all ring-2 ring-white dark:ring-gray-900"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="mt-3 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-white">{selectedFile?.name}</span>
                    <br />
                    {(selectedFile!.size / 1024).toFixed(0)}KB
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:shadow-none disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditChannelModal;