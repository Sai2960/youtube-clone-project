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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-0 sm:p-4">
      <div className="bg-[#0f0f0f] rounded-none sm:rounded-xl shadow-2xl w-full sm:max-w-2xl flex flex-col h-full sm:h-auto sm:max-h-[90vh] border-0 sm:border sm:border-gray-800">
        {/* ========================================== */}
        {/* HEADER - FIXED AT TOP */}
        {/* ========================================== */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">Edit Channel</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Customize your channel appearance and information
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition flex-shrink-0"
            disabled={uploading || isSubmitting}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* ========================================== */}
        {/* TABS - FIXED BELOW HEADER */}
        {/* ========================================== */}
        <div className="flex border-b border-gray-800 flex-shrink-0 overflow-x-auto">
          <button
            onClick={() => handleTabChange("avatar")}
            className={`flex-1 min-w-[110px] py-3 px-4 text-sm font-medium transition-all relative whitespace-nowrap ${
              activeTab === "avatar"
                ? "text-blue-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
              <ImageIcon className="w-4 h-4" />
              <span>Profile Picture</span>
            </div>
            {activeTab === "avatar" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
            )}
          </button>

          <button
            onClick={() => handleTabChange("banner")}
            className={`flex-1 min-w-[110px] py-3 px-4 text-sm font-medium transition-all relative whitespace-nowrap ${
              activeTab === "banner"
                ? "text-blue-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
              <Camera className="w-4 h-4" />
              <span>Banner Image</span>
            </div>
            {activeTab === "banner" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
            )}
          </button>

          <button
            onClick={() => handleTabChange("info")}
            className={`flex-1 min-w-[110px] py-3 px-4 text-sm font-medium transition-all relative whitespace-nowrap ${
              activeTab === "info"
                ? "text-blue-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
              <Edit2 className="w-4 h-4" />
              <span>Channel Info</span>
            </div>
            {activeTab === "info" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
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
                <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-3">
                  <div className="flex items-start gap-2.5">
                    <div className="bg-blue-800/30 p-1.5 rounded flex-shrink-0">
                      <ImageIcon className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-blue-200 mb-1">
                        {activeTab === "avatar"
                          ? "Profile Picture Guidelines"
                          : "Banner Guidelines"}
                      </h3>
                      <p className="text-xs text-blue-300/80 leading-relaxed">
                        Recommended size:{" "}
                        <span className="font-semibold">
                          {getRecommendedSize()}
                        </span>
                        <br />
                        Format: JPG, PNG, or WebP • Max size: 5MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upload Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Upload{" "}
                    {activeTab === "avatar" ? "Profile Picture" : "Banner"}
                  </label>

                  {previewUrl ? (
                    <div className="space-y-2">
                      <div className="relative inline-block">
                        <div
                          className={`rounded-lg overflow-hidden border-2 border-blue-500 bg-gray-900 ${
                            activeTab === "avatar" ? "w-24 h-24" : "w-full h-40"
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
                          className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-lg transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        Preview • Click X to remove
                      </p>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-700 rounded-lg p-8 sm:p-12 text-center cursor-pointer hover:border-blue-500 transition-all bg-gray-900/30 hover:bg-gray-900/50"
                    >
                      <div className="w-12 h-12 mx-auto mb-3 bg-blue-900/30 rounded-full flex items-center justify-center">
                        <Upload className="w-6 h-6 text-blue-400" />
                      </div>
                      <p className="text-white font-medium text-sm mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
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
                  <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium mb-2 block text-gray-300">
                    Channel Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="channelName"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="Enter channel name"
                    disabled={isSubmitting}
                    className="bg-gray-900 border-gray-700 text-white h-11 focus:border-blue-500"
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    {channelName.length}/50 characters
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block text-gray-300">
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
                    className="resize-none bg-gray-900 border-gray-700 text-white focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
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
        <div className="border-t border-gray-800 bg-[#0f0f0f] p-4 flex-shrink-0">
          {activeTab === "avatar" || activeTab === "banner" ? (
            // IMAGE UPLOAD FOOTER
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={uploading}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInfoSubmit}
                disabled={isSubmitting || !channelName.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
