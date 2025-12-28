import React, { useState, useEffect } from "react";
import { Download, X, Crown, Loader2, Info } from "lucide-react";

interface QualityOption {
  quality: "1080p" | "720p" | "480p" | "360p" | "240p" | "144p";
  label: string;
  size: string;
  isPremium: boolean;
  recommended?: boolean;
}

interface DownloadQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (quality: string, rememberChoice: boolean) => void;
  videoTitle: string;
  isPremiumUser: boolean;
  downloading: boolean;
}

const DownloadQualityModal: React.FC<DownloadQualityModalProps> = ({
  isOpen,
  onClose,
  onDownload,
  videoTitle,
  isPremiumUser,
  downloading,
}) => {
  const [selectedQuality, setSelectedQuality] = useState<string>("480p");
  const [rememberChoice, setRememberChoice] = useState(false);

  const qualityOptions: QualityOption[] = [
    {
      quality: "1080p",
      label: "Full HD (1080p)",
      size: "~150 MB",
      isPremium: true,
      recommended: isPremiumUser,
    },
    {
      quality: "720p",
      label: "HD (720p)",
      size: "~80 MB",
      isPremium: true,
    },
    {
      quality: "480p",
      label: "SD (480p)",
      size: "~45 MB",
      isPremium: false,
      recommended: !isPremiumUser,
    },
    {
      quality: "360p",
      label: "Low (360p)",
      size: "~25 MB",
      isPremium: false,
    },
    {
      quality: "240p",
      label: "Very Low (240p)",
      size: "~12 MB",
      isPremium: false,
    },
    {
      quality: "144p",
      label: "Minimum (144p)",
      size: "~6 MB",
      isPremium: false,
    },
  ];

  useEffect(() => {
    const savedQuality = localStorage.getItem("preferredQuality");
    if (savedQuality) {
      setSelectedQuality(savedQuality);
    } else {
      setSelectedQuality(isPremiumUser ? "1080p" : "480p");
    }
  }, [isPremiumUser]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleDownload = () => {
    if (rememberChoice) {
      localStorage.setItem("preferredQuality", selectedQuality);
    }
    onDownload(selectedQuality, rememberChoice);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Portal-like wrapper to ensure proper z-index */}
      <div
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
        style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={onClose}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Modal Container */}
        <div
          className="relative w-full sm:max-w-md flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
          style={{
            maxHeight: "90vh",
            marginBottom: "env(safe-area-inset-bottom)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Content */}
          <div className="bg-white dark:bg-neutral-900 w-full sm:rounded-2xl rounded-t-2xl shadow-2xl border-t sm:border border-gray-200 dark:border-neutral-800 overflow-hidden flex flex-col">
            {/* Header - Fixed */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50">
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-2 mb-1">
                  <Download
                    className="w-5 h-5 text-blue-600 dark:text-blue-500 flex-shrink-0"
                    strokeWidth={2.5}
                  />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    Download Quality
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-neutral-400 truncate">
                  {videoTitle}
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
                disabled={downloading}
              >
                <X className="w-5 h-5 text-gray-500 dark:text-neutral-400" />
              </button>
            </div>

            {/* Quality Options - Scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-2 min-h-0">
              {qualityOptions.map((option) => {
                const isLocked = option.isPremium && !isPremiumUser;
                const isSelected = selectedQuality === option.quality;

                return (
                  <button
                    key={option.quality}
                    onClick={() =>
                      !isLocked && setSelectedQuality(option.quality)
                    }
                    disabled={isLocked || downloading}
                    className={`
                      w-full p-3.5 rounded-xl border-2 transition-all duration-200 flex items-center justify-between
                      ${
                        isSelected
                          ? "border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-sm"
                          : "border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800/50"
                      }
                      ${
                        isLocked
                          ? "opacity-60 cursor-not-allowed"
                          : "cursor-pointer active:scale-[0.98]"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Radio Circle */}
                      <div
                        className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                        ${
                          isSelected
                            ? "border-blue-600 dark:border-blue-500 bg-blue-600 dark:bg-blue-500"
                            : "border-gray-300 dark:border-neutral-600"
                        }
                      `}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>

                      {/* Quality Info */}
                      <div className="text-left flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`font-semibold text-sm sm:text-base truncate ${
                              isSelected
                                ? "text-gray-900 dark:text-white"
                                : "text-gray-700 dark:text-neutral-200"
                            }`}
                          >
                            {option.label}
                          </span>
                          {option.recommended && (
                            <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                              Recommended
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-neutral-400">
                          {option.size}
                        </span>
                      </div>
                    </div>

                    {/* Lock Badge */}
                    {isLocked && (
                      <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                        <Crown className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500" />
                        <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                          Premium
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Info Banner */}
            {!isPremiumUser && (
              <div className="flex-shrink-0 mx-4 sm:mx-5 mb-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Upgrade to <span className="font-semibold">Premium</span> to
                    unlock HD and Full HD quality
                  </p>
                </div>
              </div>
            )}

            {/* Remember Choice */}
            <div className="flex-shrink-0 px-4 sm:px-5 pb-3">
              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={rememberChoice}
                  onChange={(e) => setRememberChoice(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                  disabled={downloading}
                />
                <span className="text-sm text-gray-700 dark:text-neutral-300">
                  Remember my choice
                </span>
              </label>
            </div>

            {/* Footer Actions - Fixed */}
            <div className="flex-shrink-0 p-4 sm:p-5 pt-0 space-y-2 pb-safe">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-base text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Download {selectedQuality}</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                disabled={downloading}
                className="w-full py-3 px-6 rounded-xl font-medium text-gray-700 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors active:scale-[0.98] disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add global style to prevent body scroll */}
      <style jsx global>{`
        body {
          overflow: ${isOpen ? "hidden" : "auto"};
        }
      `}</style>
    </>
  );
};

export default DownloadQualityModal;
