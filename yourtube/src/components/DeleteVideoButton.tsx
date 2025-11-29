/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from "react";
import { Trash2, Loader2, X } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

interface DeleteVideoButtonProps {
  videoId: string;
  videoTitle: string;
  onDeleted?: () => void;
  variant?: "button" | "icon" | "mobile";
  className?: string;
}

export default function DeleteVideoButton({
  videoId,
  videoTitle,
  onDeleted,
  variant = "button",
  className,
}: DeleteVideoButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await axiosInstance.delete(`/video/${videoId}`);

      if (response.data.success) {
        toast.success("Video deleted successfully");
        setShowConfirm(false);

        if (onDeleted) {
          onDeleted();
        } else {
          setTimeout(() => {
            window.location.href = "/";
          }, 1000);
        }
      }
    } catch (error: unknown) {
      console.error("Delete error:", error);
      toast.error("Failed to delete video");
    } finally {
      setIsDeleting(false);
    }
  };

  const ConfirmModal = () => (
    <>
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60000] p-4 animate-in fade-in duration-200"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-neutral-700 animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
                Delete Video?
              </h3>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
                disabled={isDeleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-neutral-400 mb-6">
              Are you sure you want to delete &quot;{videoTitle}&quot;? This action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 hover:bg-gray-200 dark:hover:bg-neutral-700 font-medium text-sm transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-all active:scale-95 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // MOBILE VARIANT - Matches YouTube Mobile Pill Style
  if (variant === "mobile") {
    return (
      <>
        <button
          className={`flex items-center gap-2 px-4 h-9 bg-youtube-secondary dark:bg-neutral-800 rounded-full hover:bg-youtube-hover dark:hover:bg-neutral-700 transition-all active:scale-95 flex-shrink-0 ${className}`}
          onClick={() => setShowConfirm(true)}
          disabled={isDeleting}
        >
          <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" strokeWidth={2} />
          <span className="text-xs font-bold text-youtube-primary">Delete</span>
        </button>
        <ConfirmModal />
      </>
    );
  }

  // ICON VARIANT - DESKTOP
  if (variant === "icon") {
    return (
      <>
        <button
          className="px-4 py-2 bg-youtube-secondary dark:bg-neutral-800 rounded-full flex items-center gap-2 text-red-600 dark:text-red-500 hover:bg-youtube-hover dark:hover:bg-neutral-700 transition-all active:scale-95 shadow-sm"
          onClick={() => setShowConfirm(true)}
          disabled={isDeleting}
          title="Delete video"
        >
          <Trash2 className="w-5 h-5" strokeWidth={2} />
          <span className="text-sm font-medium">Delete</span>
        </button>
        <ConfirmModal />
      </>
    );
  }

  // DEFAULT BUTTON VARIANT
  return (
    <>
      <button
        className="px-4 py-2 rounded-lg text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium text-sm transition-all flex items-center gap-2"
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
      >
        <Trash2 className="w-4 h-4" />
        Delete Video
      </button>
      <ConfirmModal />
    </>
  );
}
