// src/components/EditChannelModal.tsx - FULLY FIXED VERSION

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
  const [activeTab, setActiveTab] = useState<"avatar" | "banner" | "info">(
    "avatar"
  );

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
      formData.append(
        "imageType",
        activeTab === "avatar" ? "profile" : "banner"
      );

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
          console.log(
            "👤 User context and localStorage updated with:",
            newImageUrl
          );
        }

        if (activeTab === "banner" && user) {
          const updatedUser = { ...user, bannerImage: newImageUrl };
          updateUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
          console.log("🖼️ Banner updated in localStorage:", newImageUrl);
        }

        // ✅ CRITICAL FIX: Dispatch avatarUpdated event
        window.dispatchEvent(new Event("avatarUpdated"));
        console.log("🔔 Dispatched avatarUpdated event");

        toast.success(
          `${
            activeTab === "avatar" ? "Profile picture" : "Banner"
          } updated successfully!`
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
  // INFO UPDATE HANDLER - WITH channelUpdated EVENT
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
        const updatedData =
          response.data.result || response.data.user || response.data;

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

        // ✅ CRITICAL FIX: Dispatch BOTH events for channel updates
        window.dispatchEvent(new Event("channelUpdated"));
        window.dispatchEvent(new Event("avatarUpdated"));
        window.dispatchEvent(new Event("storage"));

        console.log(
          "🔔 Dispatched channelUpdated, avatarUpdated, and storage events"
        );

        toast.success("Channel information updated successfully!");
        onClose();
      }
    } catch (error: any) {
      console.error("Update error:", error);
      setError(
        error.response?.data?.message || "Failed to update channel information"
      );
      toast.error("Failed to update channel information");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  const getCurrentImage = () => {
    const imageUrl =
      activeTab === "avatar" ? channel.image : channel.bannerImage;
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
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4">
     <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[95vh]">

        {/* ========================================== */}
        {/* HEADER - FIXED AT TOP */}
        {/* ========================================== */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              Edit Channel
            </h2>
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Customize your channel appearance and information
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
            disabled={uploading || isSubmitting}
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* ========================================== */}
        {/* TABS - FIXED BELOW HEADER */}
        {/* ========================================== */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
          <button
            onClick={() => handleTabChange("avatar")}
            className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-all relative ${
              activeTab === "avatar"
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1">
              <ImageIcon className="w-4 h-4" />
              <span>Profile Picture</span>
            </div>
            {activeTab === "avatar" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>

          <button
            onClick={() => handleTabChange("banner")}
            className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-all relative ${
              activeTab === "banner"
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1">
              <Camera className="w-4 h-4" />
              <span>Banner Image</span>
            </div>
            {activeTab === "banner" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>

          <button
            onClick={() => handleTabChange("info")}
            className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium transition-all relative ${
              activeTab === "info"
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1">
              <Edit2 className="w-4 h-4" />
              <span>Channel Info</span>
            </div>
            {activeTab === "info" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
        </div>

         {/* ========================================== */}
        {/* SCROLLABLE CONTENT AREA */}
        {/* ========================================== */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-3 sm:p-5 space-y-3 sm:space-y-4">
            {/* ============================================ */}
            {/* IMAGE UPLOAD TABS (AVATAR & BANNER) */}
            {/* ============================================ */}
            {(activeTab === "avatar" || activeTab === "banner") && (
              <>
                {/* Guidelines */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5 sm:p-3">
                  <div className="flex items-start gap-2">
                    <div className="bg-blue-100 dark:bg-blue-900/50 p-1 rounded flex-shrink-0">
                      <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-100 mb-0.5 sm:mb-1">
                        {activeTab === "avatar"
                          ? "Profile Picture Guidelines"
                          : "Banner Guidelines"}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                        Recommended size:{" "}
                        <span className="font-semibold">
                          {getRecommendedSize()}
                        </span>
                        <br className="hidden sm:block" />
                        <span className="sm:inline"> </span>
                        Format: JPG, PNG, or WebP • Max size: 5MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upload Image */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload{" "}
                    {activeTab === "avatar" ? "Profile Picture" : "Banner"}
                  </label>

                  {previewUrl ? (
                    <div className="space-y-2">
                      <div className="relative inline-block">
                        <div
                          className={`rounded-lg overflow-hidden border-2 border-blue-500 bg-gray-100 dark:bg-gray-800 ${
                            activeTab === "avatar" ? "w-20 h-20 sm:w-24 sm:h-24" : "w-full sm:w-64 h-36 sm:h-36"
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
                          className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-600 hover:bg-red-700 text-white p-1 sm:p-1.5 rounded-full shadow-lg transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        Preview • Click X to remove
                      </p>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-5 sm:p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-all bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 group"
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        {activeTab === "avatar"
                          ? "Square images work best"
                          : "Wide images (16:9) recommended"}
                      </p>
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

            {/* ============================================ */}
            {/* CHANNEL INFO TAB */}
            {/* ============================================ */}
            {activeTab === "info" && (
              <>
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <Label
                    htmlFor="channelName"
                    className="text-xs font-medium mb-1.5 block"
                  >
                    Channel Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="channelName"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="Enter channel name"
                    disabled={isSubmitting}
                    className="h-9 text-sm"
                    maxLength={50}
                  />
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    {channelName.length}/50 characters
                  </p>
                </div>

                <div>
                  <Label
                    htmlFor="description"
                    className="text-xs font-medium mb-1.5 block"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell viewers about your channel..."
                    disabled={isSubmitting}
                    rows={4}
                    maxLength={1000}
                    className="resize-none"
                  />
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    {description.length}/1000 characters
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* FOOTER - FIXED AT BOTTOM (OUTSIDE SCROLL) */}
        {/* ========================================== */}
<div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 sm:p-4 flex-shrink-0">
          {activeTab === "avatar" || activeTab === "banner" ? (
            // IMAGE UPLOAD FOOTER
            <div className="flex gap-2 sm:gap-3">
      <button
        onClick={onClose}
        disabled={uploading}
        className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-xs sm:text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancel
      </button>
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
            // CHANNEL INFO FOOTER
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-9 px-4 text-sm"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleInfoSubmit}
                disabled={isSubmitting || !channelName.trim()}
                className="bg-blue-600 hover:bg-blue-700 h-9 px-4 text-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditChannelModal;
