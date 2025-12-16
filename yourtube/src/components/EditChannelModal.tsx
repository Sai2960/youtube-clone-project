// src/components/EditChannelModal.tsx - FULLY RESPONSIVE FIXED VERSION

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
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [channelName, setChannelName] = useState(channel?.channelname || channel?.name || "");
  const [description, setDescription] = useState(channel?.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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

      const response = await axiosInstance.post(
        `/auth/channel/${channel._id}/upload-image`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
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
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("❌ Upload error:", error);
      toast.error(error.response?.data?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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

  const getCurrentImage = () => {
    const imageUrl = activeTab === "avatar" ? channel.image : channel.bannerImage;
    return getImageUrl(imageUrl, true);
  };

  const getRecommendedSize = () => {
    if (activeTab === "avatar") return "500x500px (Square)";
    return "2560x1440px (16:9)";
  };

  const handleTabChange = (tab: "avatar" | "banner" | "info") => {
    setActiveTab(tab);
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn">
      {/* FIXED: Increased max-width and improved responsive sizing */}
      <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
        
        {/* Header - FIXED: Better mobile spacing */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
              Edit Channel
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
              Customize your channel appearance
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition flex-shrink-0"
            disabled={uploading || isSubmitting}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs - FIXED: Better mobile layout */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => handleTabChange("avatar")}
            className={`flex-1 min-w-[100px] py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all relative ${
              activeTab === "avatar"
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Profile</span>
            </div>
            {activeTab === "avatar" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>

          <button
            onClick={() => handleTabChange("banner")}
            className={`flex-1 min-w-[100px] py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all relative ${
              activeTab === "banner"
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Banner</span>
            </div>
            {activeTab === "banner" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>

          <button
            onClick={() => handleTabChange("info")}
            className={`flex-1 min-w-[100px] py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all relative ${
              activeTab === "info"
                ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">Info</span>
            </div>
            {activeTab === "info" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
            )}
          </button>
        </div>

        {/* Content - FIXED: Better scrolling and spacing */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* IMAGE UPLOAD TABS */}
            {(activeTab === "avatar" || activeTab === "banner") && (
              <>
                {/* FIXED: Guidelines box - better mobile layout */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/50 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                      <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        {activeTab === "avatar" ? "Profile Picture Guidelines" : "Banner Guidelines"}
                      </h3>
                      <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                        Recommended size: <span className="font-semibold">{getRecommendedSize()}</span>
                        <br />
                        Format: JPG, PNG, or WebP • Max size: 5MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* FIXED: Current image preview - responsive sizing */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                    Current {activeTab === "avatar" ? "Profile Picture" : "Banner"}
                  </label>
                  <div
                    className={`rounded-lg sm:rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-md ${
                      activeTab === "avatar"
                        ? "w-24 h-24 sm:w-32 sm:h-32 mx-auto"
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

                {/* FIXED: Upload area - better mobile experience */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                    Upload New {activeTab === "avatar" ? "Profile Picture" : "Banner"}
                  </label>

                  {!previewUrl ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl p-6 sm:p-12 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-all bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 group active:scale-[0.98]"
                    >
                      <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="text-gray-900 dark:text-white font-semibold text-base sm:text-lg mb-1 sm:mb-2">
                        Click to upload
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {activeTab === "avatar" ? "Square images work best" : "Wide images (16:9) recommended"}
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div
                        className={`rounded-lg sm:rounded-xl overflow-hidden border-2 border-blue-500 bg-gray-100 dark:bg-gray-800 shadow-lg ${
                          activeTab === "avatar"
                            ? "w-24 h-24 sm:w-32 sm:h-32 mx-auto"
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
                        className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-red-600 hover:bg-red-700 text-white p-2 sm:p-2.5 rounded-full shadow-lg transition-all ring-2 ring-white dark:ring-gray-900"
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
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

            {/* CHANNEL INFO TAB - FIXED: Better form layout */}
            {activeTab === "info" && (
              <form onSubmit={handleInfoSubmit} className="space-y-4 sm:space-y-6">
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <Label htmlFor="channelName" className="text-sm sm:text-base font-semibold mb-2 block">
                    Channel Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="channelName"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    placeholder="Enter channel name"
                    disabled={isSubmitting}
                    className="text-sm sm:text-base h-10 sm:h-12"
                    maxLength={50}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    {channelName.length}/50 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm sm:text-base font-semibold mb-2 block">
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
                    className="text-sm sm:text-base resize-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    {description.length}/1000 characters
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer Buttons - FIXED: Always visible, better mobile layout */}
        <div className="flex gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
          {activeTab === "info" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 h-10 sm:h-12 text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={handleInfoSubmit}
                disabled={isSubmitting || !channelName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 h-10 sm:h-12 text-sm sm:text-base"
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
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={uploading}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl transition flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:shadow-none disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span className="hidden sm:inline">Uploading...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditChannelModal;