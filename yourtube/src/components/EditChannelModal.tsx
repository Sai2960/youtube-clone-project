// src/components/EditChannelModal.tsx - PREMIUM DELUXE VERSION

import React, { useState, useRef } from "react";
import {
  X,
  Camera,
  Upload,
  Loader2,
  Check,
  Image as ImageIcon,
  Edit2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";
import { getImageUrl } from "@/lib/imageUtils";

interface EditChannelModalProps {
  channel: any;
  onClose: () => void;
  onUpdate: (type: "avatar" | "banner" | "info", data: any) => void;
}

const EditChannelModal: React.FC<EditChannelModalProps> = ({
  channel,
  onClose,
  onUpdate,
}) => {
  const { user, updateUser } = useUser();
  const [activeTab, setActiveTab] = useState<"avatar" | "banner" | "info">("avatar");
  
  // Image upload states
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Info edit states
  const [channelName, setChannelName] = useState(channel?.channelname || channel?.name || "");
  const [description, setDescription] = useState(channel?.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ============================================================================
  // IMAGE UPLOAD HANDLERS
  // ============================================================================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select an image first");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("imageType", activeTab === "avatar" ? "profile" : "banner");

      const response = await axiosInstance.post(
        `/auth/channel/${channel._id}/upload-image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        const newImageUrl = response.data.imageUrl;

        onUpdate(activeTab, newImageUrl);

        if (activeTab === "avatar" && user) {
          const updatedUser = { ...user, image: newImageUrl };
          updateUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }

        if (activeTab === "banner" && user) {
          const updatedUser = { ...user, bannerImage: newImageUrl };
          updateUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }

        window.dispatchEvent(new Event("avatarUpdated"));

        toast.success(`${activeTab === "avatar" ? "Profile picture" : "Banner"} updated successfully!`);

        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ============================================================================
  // INFO UPDATE HANDLER
  // ============================================================================
  const handleInfoSubmit = async () => {
    if (!channelName.trim()) {
      setError("Channel name is required");
      return;
    }

    if (channelName.trim().length < 3) {
      setError("Channel name must be at least 3 characters");
      return;
    }

    if (channelName.trim().length > 50) {
      setError("Channel name must be less than 50 characters");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await axiosInstance.patch(`/auth/update/${user._id}`, {
        channelname: channelName.trim(),
        description: description.trim(),
      });

      if (response.data.success) {
        onUpdate("info", {
          channelname: channelName.trim(),
          description: description.trim(),
        });

        const updatedUser = {
          ...user,
          channelname: channelName.trim(),
          description: description.trim(),
        };
        updateUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        window.dispatchEvent(new Event("channelUpdated"));
        window.dispatchEvent(new Event("avatarUpdated"));
        window.dispatchEvent(new Event("storage"));

        toast.success("Channel information updated successfully!");
        onClose();
      }
    } catch (error: any) {
      console.error("Update error:", error);
      setError(error.response?.data?.message || "Failed to update channel information");
      toast.error("Failed to update channel information");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  const getRecommendedSize = () => {
    if (activeTab === "avatar") {
      return "500x500px (Square)";
    }
    return "2560x1440px (16:9)";
  };

  const handleTabChange = (tab: "avatar" | "banner" | "info") => {
    setActiveTab(tab);
    setPreviewUrl(null);
    setSelectedFile(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      {/* Premium Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm" />
      
      {/* Modal Container */}
      <div className="relative w-full sm:max-w-3xl flex flex-col h-full sm:h-auto sm:max-h-[90vh] bg-white dark:bg-slate-900 sm:rounded-3xl shadow-2xl border-0 sm:border sm:border-gray-200/50 dark:border-slate-700/50 overflow-hidden">
        {/* Decorative Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10 pointer-events-none" />
        
        {/* Premium Header */}
        <div className="relative border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-slate-900/80 dark:to-slate-800/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center justify-between p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-blue-500/30">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Edit Channel
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Customize your premium channel
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-300 group flex-shrink-0"
              disabled={uploading || isSubmitting}
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
            </button>
          </div>

          {/* Premium Tabs */}
          <div className="flex px-4 sm:px-6 gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: "avatar", icon: ImageIcon, label: "Profile" },
              { id: "banner", icon: Camera, label: "Banner" },
              { id: "info", icon: Edit2, label: "Info" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`relative flex-1 min-w-[90px] sm:min-w-[110px] py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-all duration-300 group ${
                  activeTab === tab.id
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                  <tab.icon className={`w-4 h-4 transition-transform duration-300 ${
                    activeTab === tab.id ? "scale-110" : "group-hover:scale-105"
                  }`} />
                  <span>{tab.label}</span>
                </div>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-full shadow-lg shadow-blue-500/50" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="relative flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Image Upload Tabs */}
            {(activeTab === "avatar" || activeTab === "banner") && (
              <>
                {/* Premium Guidelines */}
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/50 dark:border-blue-800/50 p-4 sm:p-5 shadow-sm">
                  <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
                  <div className="relative flex items-start gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30 flex-shrink-0">
                      <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
                        {activeTab === "avatar" ? "Profile Picture" : "Banner"} Guidelines
                      </h3>
                      <div className="space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                        <p>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            Recommended: {getRecommendedSize()}
                          </span>
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Format: JPG, PNG, WebP • Max: 10MB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload Area */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                    Upload {activeTab === "avatar" ? "Profile Picture" : "Banner"}
                  </label>

                  {previewUrl ? (
                    <div className="space-y-3">
                      <div className="relative inline-block group">
                        <div className={`rounded-xl sm:rounded-2xl overflow-hidden border-2 border-blue-500 dark:border-blue-400 shadow-2xl shadow-blue-500/20 bg-gray-100 dark:bg-gray-800 ${
                          activeTab === "avatar" ? "w-28 h-28 sm:w-32 sm:h-32" : "w-full h-40 sm:h-48"
                        }`}>
                          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <button
                          onClick={handleRemove}
                          className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-lg shadow-red-500/30 transition-all duration-300 hover:scale-110"
                        >
                          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-green-500" />
                        Preview ready • Click X to remove
                      </p>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="relative overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 hover:border-blue-500 dark:hover:border-blue-400 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50 hover:shadow-xl group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300" />
                      <div className="relative">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                          <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                        </div>
                        <p className="text-gray-900 dark:text-white font-semibold text-sm sm:text-base mb-1.5 sm:mb-2">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          {activeTab === "avatar" ? "Square images work best" : "Wide images (16:9) recommended"}
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
              </>
            )}

            {/* Channel Info Tab */}
            {activeTab === "info" && (
              <div className="space-y-5 sm:space-y-6">
                {error && (
                  <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 sm:py-3.5 rounded-xl">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-semibold mb-2.5 sm:mb-3 block text-gray-900 dark:text-white">
                    Channel Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="Enter your channel name"
                    disabled={isSubmitting}
                    maxLength={50}
                    className="w-full px-4 py-3 sm:py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                    {channelName.length}/50 characters
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-semibold mb-2.5 sm:mb-3 block text-gray-900 dark:text-white">
                    Description
                  </Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell viewers about your channel..."
                    disabled={isSubmitting}
                    rows={5}
                    maxLength={1000}
                    className="w-full px-4 py-3 sm:py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-300 resize-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                    {description.length}/1000 characters
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Premium Footer */}
        <div className="relative border-t border-gray-200 dark:border-slate-700 bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-slate-900/80 dark:to-slate-800/80 backdrop-blur-sm p-4 sm:p-6 flex-shrink-0">
          {activeTab === "avatar" || activeTab === "banner" ? (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={uploading}
                className="flex-1 px-5 sm:px-6 py-3 sm:py-3.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 shadow-sm hover:shadow-md"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="flex-1 px-5 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02]"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 sm:px-6 py-3 sm:py-3.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 shadow-sm hover:shadow-md"
              >
                Cancel
              </button>
              <button
                onClick={handleInfoSubmit}
                disabled={isSubmitting || !channelName.trim()}
                className="px-5 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditChannelModal;