import React, { useState } from "react";
import { Trash2, Loader2, X } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

interface DeleteVideoButtonProps {
  videoId: string;
  videoTitle: string;
  onDeleted?: () => void;
  variant?: "button" | "icon" | "mobile" | "modal";
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
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{ zIndex: 2147483647 }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-neutral-700 animate-in zoom-in duration-200 mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 pr-2">
                Delete Video?
              </h3>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors flex-shrink-0"
                disabled={isDeleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-neutral-400 mb-6 break-words leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-900 dark:text-white break-words block mt-1 mb-1">
                &quot;{videoTitle}&quot;
              </span>
              ? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 hover:bg-gray-200 dark:hover:bg-neutral-700 font-medium text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
  // ✅ MOBILE VARIANT - Compact button with icon
  if (variant === "mobile") {
    return (
      <>
        <button
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-all active:scale-95 shadow-sm min-w-[120px] justify-center"
          onClick={() => setShowConfirm(true)}
          disabled={isDeleting}
        >
          <Trash2 className="w-4 h-4" strokeWidth={2} />
          <span>Delete</span>
        </button>
        <ConfirmModal />
      </>
    );
  }
  // ✅ ICON VARIANT - DESKTOP - Fixed width and better visibility
  if (variant === "icon") {
    return (
      <>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-youtube-secondary dark:bg-neutral-800 rounded-full text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all active:scale-95 shadow-sm border border-transparent hover:border-red-200 dark:hover:border-red-800/60 min-w-[110px] justify-center flex-shrink-0"
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
  // MODAL VARIANT - Just the delete button for use inside modals
  if (variant === "modal") {
    return (
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="min-w-[140px] px-10 py-3.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-base transition-all active:scale-95 flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
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
    );
  }

  // DEFAULT BUTTON VARIANT
  return (
    <>
      <button
        className="px-4 py-2 rounded-lg text-red-700 dark:text-[#FF4444] hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold text-sm transition-all flex items-center gap-2 border border-transparent hover:border-red-200 dark:hover:border-red-800/60"
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
      >
        <Trash2 className="w-4 h-4" strokeWidth={2.5} />
        Delete Video
      </button>
      <ConfirmModal />
    </>
  );
}
