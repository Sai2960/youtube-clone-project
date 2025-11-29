// DownloadButton.tsx - FIXED WITH DESKTOP STYLE FOR MOBILE

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import {
  Download,
  Lock,
  Crown,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useSubscription } from "@/lib/SubscriptionContext";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

interface DownloadButtonProps {
  videoId: string;
  videoTitle: string;
  videoUrl?: string;
  quality?: "480p" | "720p" | "1080p";
  className?: string;
  variant?: "default" | "compact" | "mobile";
}

const DownloadButton: React.FC<DownloadButtonProps> = ({
  videoId,
  videoTitle,
  videoUrl,
  quality = "480p",
  className = "",
  variant = "default",
}) => {
  const { user } = useUser();
  const { subscription, remainingDownloads, checkDownloadPermission } =
    useSubscription();

  const [downloading, setDownloading] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPremium = subscription?.planType?.toLowerCase() !== "free";
  const canDownload =
    isPremium ||
    (typeof remainingDownloads === "number" && remainingDownloads > 0) ||
    remainingDownloads === "unlimited";

  const handleDownload = async () => {
    if (!user) {
      setShowUpgradePrompt(true);
      return;
    }

    setError(null);

    const permission = await checkDownloadPermission();
    if (!permission.allowed) {
      setShowUpgradePrompt(true);
      return;
    }

    if (!isPremium && (quality === "720p" || quality === "1080p")) {
      setShowUpgradePrompt(true);
      return;
    }

    try {
  setDownloading(true);
  setDownloadSuccess(false);

  const recordResponse = await axiosInstance.post(`/download/video/${videoId}`, {
    userId: user._id,
    quality: quality || '480p',
  });

  if (!recordResponse.data.success) throw new Error('Download authorization failed');

  const { streamUrl, downloadFilename } = recordResponse.data.download;
  
  // ✅ FIXED: No hardcoded fallback
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
  if (!baseUrl) {
    throw new Error('Download service configuration error');
  }
  
  const fullStreamUrl = `${baseUrl}${streamUrl}`;

  const link = document.createElement('a');
  link.href = fullStreamUrl;
  link.download = downloadFilename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setDownloadSuccess(true);
  setTimeout(() => setDownloadSuccess(false), 3000);

  await checkDownloadPermission();
} catch (error: any) {
  console.error('Download error:', error);

  if (error.response?.status === 403 || error.response?.data?.needsPremium) {
    setShowUpgradePrompt(true);
  } else {
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Download failed';
    setError(errorMessage);
    setTimeout(() => setError(null), 3000);
  }
} finally {
  setDownloading(false);
}
  };

  const handleUpgrade = () => (window.location.href = "/premium");

  // Upgrade Modal - Shared
  const UpgradeModal = () => (
    <>
      {showUpgradePrompt && (
        <div className="fixed inset-0 z-[60000] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowUpgradePrompt(false)}
          />
          <div className="relative bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl p-6 max-w-md w-full shadow-2xl mx-4 animate-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Crown className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-neutral-100 mb-2">
                  {!user ? "Login Required" : "Upgrade to Premium"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-4">
                  {!user
                    ? "Please login to download videos."
                    : "You've reached your daily download limit. Upgrade for unlimited downloads!"}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setShowUpgradePrompt(false);
                      if (user) handleUpgrade();
                      else window.location.href = "/login";
                    }}
                    className="flex-1 px-6 py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold text-sm"
                  >
                    {user ? "Upgrade Now" : "Login"}
                  </button>
                  <button
                    onClick={() => setShowUpgradePrompt(false)}
                    className="px-6 py-3 rounded-lg bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 font-medium text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Error Toast - Shared
  const ErrorToast = () => (
    <>
      {error && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[70000] animate-in slide-in-from-bottom duration-300">
          <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2 max-w-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        </div>
      )}
    </>
  );

  // ⭐ MOBILE VARIANT - Desktop Style
  if (variant === "mobile") {
    return (
      <>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={`px-4 py-2 bg-youtube-secondary dark:bg-neutral-800 rounded-full flex items-center gap-2 text-youtube-primary active:bg-youtube-hover dark:active:bg-neutral-700 transition-all shadow-sm flex-shrink-0 ${
            downloading ? "opacity-75" : ""
          } ${downloadSuccess ? "text-green-600 dark:text-green-500" : ""}`}
        >
          {downloading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2} />
              <span className="text-sm font-medium">Downloading</span>
            </>
          ) : downloadSuccess ? (
            <>
              <CheckCircle className="w-5 h-5" strokeWidth={2} />
              <span className="text-sm font-medium">Downloaded</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" strokeWidth={2} />
              <span className="text-sm font-medium">Download</span>
            </>
          )}
        </button>
        <UpgradeModal />
        <ErrorToast />
      </>
    );
  }

  // ⭐ COMPACT VARIANT
  if (variant === "compact") {
    return (
      <>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={`h-9 px-4 rounded-full flex items-center gap-2 flex-shrink-0 transition-all bg-youtube-secondary dark:bg-neutral-800 text-youtube-primary hover:bg-youtube-hover dark:hover:bg-neutral-700 active:scale-95 shadow-sm ${
            downloading ? "opacity-75" : ""
          } ${className}`}
        >
          {downloading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2} />
              <span className="text-sm font-medium">Downloading</span>
            </>
          ) : downloadSuccess ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" strokeWidth={2} />
              <span className="text-sm font-medium text-green-600">
                Downloaded
              </span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" strokeWidth={2} />
              <span className="text-sm font-medium">Download</span>
            </>
          )}
        </button>
        <UpgradeModal />
        <ErrorToast />
      </>
    );
  }

  // ⭐ DEFAULT VARIANT
  return (
    <div className="space-y-3">
      <button
        onClick={handleDownload}
        disabled={downloading || !canDownload}
        className={`w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-semibold text-sm transition-all border-2 ${
          canDownload
            ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-lg active:scale-95"
            : "bg-gray-100 dark:bg-neutral-800 text-gray-400 border-gray-200 dark:border-neutral-700 cursor-not-allowed"
        } ${className}`}
      >
        {downloading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Downloading...</span>
          </>
        ) : downloadSuccess ? (
          <>
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-500">Downloaded!</span>
          </>
        ) : !canDownload ? (
          <>
            <Lock className="w-5 h-5" />
            <span>Limit Reached</span>
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            <span>Download {quality}</span>
          </>
        )}
      </button>
      <UpgradeModal />
      <ErrorToast />
    </div>
  );
};

export default DownloadButton;
