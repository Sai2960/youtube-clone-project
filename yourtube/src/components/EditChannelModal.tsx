// src/components/EditChannelModal.tsx - ENHANCED VISIBILITY & PROFESSIONAL DESIGN

import React, { useState, useRef } from "react";
import {
  X,
  Camera,
  Upload,
  Loader2,
  Check,
  Image as ImageIcon,
  Edit2,
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
  const [channelName, setChannelName] = useState(
    channel?.channelname || channel?.name || ""
  );
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

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
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

      console.log("📤 Uploading:", {
        type: activeTab,
        imageType: activeTab === "avatar" ? "profile" : "banner",
        file: selectedFile.name,
        channelId: channel._id,
      });

      const response = await axiosInstance.post(
        `/auth/channel/${channel._id}/upload-image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("✅ Upload response:", response.data);

      if (response.data.success) {
        const newImageUrl = response.data.imageUrl;

        console.log("📸 New image URL from server:", newImageUrl);

        // Update parent component
        onUpdate(activeTab, newImageUrl);

        // Update user context
        if (activeTab === "avatar" && user) {
          const updatedUser = { ...user, image: newImageUrl };
          updateUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
          console.log("👤 User context and localStorage updated with:", newImageUrl);
        }

        if (activeTab === "banner" && user) {
          const updatedUser = { ...user, bannerImage: newImageUrl };
          updateUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
          console.log("🖼️ Banner updated in localStorage:", newImageUrl);
        }

        // Dispatch avatarUpdated event
        window.dispatchEvent(new Event("avatarUpdated"));
        console.log("🔔 Dispatched avatarUpdated event");

        toast.success(
          `${activeTab === "avatar" ? "Profile picture" : "Banner"} updated successfully!`
        );

        // Reset upload state
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error: any) {
      console.error("❌ Upload error:", error);
      console.error("   Response:", error.response?.data);
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
  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
        const updatedData = response.data.result || response.data.user || response.data;

        console.log("✅ Channel info updated:", updatedData);

        // Update parent component
        onUpdate("info", {
          channelname: channelName.trim(),
          description: description.trim(),
        });

        // Update user context
        const updatedUser = {
          ...user,
          channelname: channelName.trim(),
          description: description.trim(),
        };
        updateUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Dispatch events
        window.dispatchEvent(new Event("channelUpdated"));
        window.dispatchEvent(new Event("avatarUpdated"));
        window.dispatchEvent(new Event("storage"));

        console.log("🔔 Dispatched channelUpdated, avatarUpdated, and storage events");

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
  const getCurrentImage = () => {
    const imageUrl = activeTab === "avatar" ? channel.image : channel.bannerImage;
    return getImageUrl(imageUrl, true);
  };

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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4">
      <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col border border-gray-200 dark:border-gray-800">
        
        {/* ============================================================================
            HEADER - FIXED AT TOP WITH BETTER CONTRAST
            ============================================================================ */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#181818] flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              Edit Channel
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">
              Customize your channel appearance
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition flex-shrink-0"
            disabled={uploading || isSubmitting}
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* ============================================================================
            TABS - ENHANCED VISIBILITY
            ============================================================================ */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f0f0f] flex-shrink-0">
          <button
            onClick={() => handleTabChange("avatar")}
            className={`flex items-center justify-center gap-2 px-3 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold transition-all relative flex-1 ${
              activeTab === "avatar"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#181818]"
            }`}
          >
            <ImageIcon className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Profile Picture</span>
            <span className="sm:hidden">Profile</span>
            {activeTab === "avatar" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
            )}
          </button>

          <button
            onClick={() => handleTabChange("banner")}
            className={`flex items-center justify-center gap-2 px-3 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold transition-all relative flex-1 ${
              activeTab === "banner"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#181818]"
            }`}
          >
            <Camera className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Banner Image</span>
            <span className="sm:hidden">Banner</span>
            {activeTab === "banner" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
            )}
          </button>

          <button
            onClick={() => handleTabChange("info")}
            className={`flex items-center justify-center gap-2 px-3 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm font-semibold transition-all relative flex-1 ${
              activeTab === "info"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#181818]"
            }`}
          >
            <Edit2 className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Channel Info</span>
            <span className="sm:hidden">Info</span>
            {activeTab === "info" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
            )}
          </button>
        </div>

        {/* ============================================================================
            CONTENT - SCROLLABLE WITH ENHANCED CONTRAST
            ============================================================================ */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#0f0f0f]">
          <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            
            {/* IMAGE UPLOAD TABS */}
            {(activeTab === "avatar" || activeTab === "banner") && (
              <>
                {/* Guidelines Box - ENHANCED VISIBILITY */}
                <div className="bg-blue-50 dark:bg-blue-950/50 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900 p-2.5 rounded-lg flex-shrink-0">
                      <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-blue-900 dark:text-blue-100 mb-1.5">
                        {activeTab === "avatar" ? "Profile Picture Guidelines" : "Banner Guidelines"}
                      </h3>
                      <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                        <span className="font-semibold block mb-1">
                          Recommended size: {getRecommendedSize()}
                        </span>
                        Format: JPG, PNG, or WebP • Max size: 5MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current Image - ENHANCED CONTAINER */}
                {/* Current Image - ENHANCED CONTAINER */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                    Current {activeTab === "avatar" ? "Profile Picture" : "Banner"}
                  </label>
                  <div className="w-full bg-gray-100 dark:bg-[#181818] rounded-xl p-4 sm:p-6 border-2 border-gray-200 dark:border-gray-700">
                    <div className="w-full flex justify-center">
                      <div
                        className={`rounded-xl overflow-hidden border-2 border-gray-300 dark:border-gray-600 bg-gray-200 dark:bg-gray-800 shadow-lg ${
                          activeTab === "avatar"
                            ? "w-40 h-40 sm:w-48 sm:h-48"
                            : "w-full aspect-[16/9]"
                        }`}
                      >
                        <img
                          src={getCurrentImage()}
                          alt={activeTab}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "https://github.com/shadcn.png";
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload New Image - ENHANCED VISIBILITY */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                    Upload New {activeTab === "avatar" ? "Profile Picture" : "Banner"}
                  </label>

                  {!previewUrl ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-xl p-10 sm:p-12 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-all bg-gray-50 dark:bg-[#181818] hover:bg-blue-50 dark:hover:bg-blue-950/30 group"
                    >
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                        <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="text-base sm:text-lg text-gray-900 dark:text-white font-bold mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {activeTab === "avatar" ? "Square images work best" : "Wide images (16:9) recommended"}
                      </p>
                    </div>
                  ) : (
                    <div className="w-full bg-gray-100 dark:bg-[#181818] rounded-xl p-4 sm:p-6 border-2 border-blue-500 dark:border-blue-400">
                      <div className="w-full flex justify-center">
                        <div className="relative">
                          <div
                            className={`rounded-xl overflow-hidden border-2 border-blue-600 dark:border-blue-400 bg-gray-200 dark:bg-gray-800 shadow-xl ${
                              activeTab === "avatar"
                                ? "w-40 h-40 sm:w-48 sm:h-48"
                                : "w-full aspect-[16/9]"
                            }`}
                          >
                            <img
                              src={previewUrl}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            onClick={handleRemove}
                            className="absolute -top-3 -right-3 bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-full shadow-xl transition-all ring-4 ring-white dark:ring-gray-900"
                            aria-label="Remove image"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
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

            {/* CHANNEL INFO TAB - ENHANCED VISIBILITY */}
            {activeTab === "info" && (
              <form onSubmit={handleInfoSubmit} className="space-y-5 sm:space-y-6">
                {error && (
                  <div className="bg-red-50 dark:bg-red-950/50 border-2 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg text-sm font-semibold">
                    {error}
                  </div>
                )}

                <div>
                  <Label htmlFor="channelName" className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 mb-2 block">
                    Channel Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="channelName"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="Enter channel name"
                    disabled={isSubmitting}
                    className="text-sm sm:text-base h-11 sm:h-12 bg-white dark:bg-[#181818] border-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-medium"
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">
                    {channelName.length}/50 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 mb-2 block">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell viewers about your channel..."
                    disabled={isSubmitting}
                    rows={5}
                    maxLength={1000}
                    className="text-sm sm:text-base resize-none bg-white dark:bg-[#181818] border-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-medium"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 font-medium">
                    {description.length}/1000 characters
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ============================================================================
            FOOTER BUTTONS - ENHANCED VISIBILITY
            ============================================================================ */}
        <div className="flex gap-3 px-4 sm:px-6 py-4 border-t-2 border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#181818] flex-shrink-0">
          <Button
            type="button"
            onClick={onClose}
            disabled={uploading || isSubmitting}
            className="flex-1 h-11 sm:h-12 text-sm sm:text-base font-bold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600"
          >
            Cancel
          </Button>

          {activeTab === "info" ? (
            <Button
              type="button"
              onClick={handleInfoSubmit}
              disabled={isSubmitting || !channelName.trim()}
              className="flex-1 h-11 sm:h-12 text-sm sm:text-base font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex-1 h-11 sm:h-12 text-sm sm:text-base font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 text-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditChannelModal;