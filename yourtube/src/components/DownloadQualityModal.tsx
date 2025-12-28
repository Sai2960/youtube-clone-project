import React, { useState, useEffect } from 'react';
import { 
  Download, 
  X, 
  CheckCircle2, 
  Crown, 
  Lock,
  Loader2,
  Info
} from 'lucide-react';

interface QualityOption {
  quality: '1080p' | '720p' | '480p' | '360p' | '240p' | '144p';
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
  const [selectedQuality, setSelectedQuality] = useState<string>('480p');
  const [rememberChoice, setRememberChoice] = useState(false);

  const qualityOptions: QualityOption[] = [
    { 
      quality: '1080p', 
      label: 'Full HD (1080p)', 
      size: '~150 MB', 
      isPremium: true,
      recommended: isPremiumUser
    },
    { 
      quality: '720p', 
      label: 'HD (720p)', 
      size: '~80 MB', 
      isPremium: true 
    },
    { 
      quality: '480p', 
      label: 'SD (480p)', 
      size: '~45 MB', 
      isPremium: false,
      recommended: !isPremiumUser
    },
    { 
      quality: '360p', 
      label: 'Low (360p)', 
      size: '~25 MB', 
      isPremium: false 
    },
    { 
      quality: '240p', 
      label: 'Very Low (240p)', 
      size: '~12 MB', 
      isPremium: false 
    },
    { 
      quality: '144p', 
      label: 'Minimum (144p)', 
      size: '~6 MB', 
      isPremium: false 
    },
  ];

  useEffect(() => {
    // Load saved preference
    const savedQuality = localStorage.getItem('preferredQuality');
    if (savedQuality) {
      setSelectedQuality(savedQuality);
    } else {
      setSelectedQuality(isPremiumUser ? '1080p' : '480p');
    }
  }, [isPremiumUser]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleDownload = () => {
    if (rememberChoice) {
      localStorage.setItem('preferredQuality', selectedQuality);
    }
    onDownload(selectedQuality, rememberChoice);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[70000] flex items-end sm:items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className="relative bg-white dark:bg-neutral-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl border-t sm:border border-gray-200 dark:border-neutral-700 animate-in slide-in-from-bottom sm:zoom-in duration-300 max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-gray-200 dark:border-neutral-700 bg-gradient-to-b from-gray-50/50 dark:from-neutral-800/50">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-500" strokeWidth={2.5} />
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                Download Quality
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-neutral-400 line-clamp-1">
              {videoTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            disabled={downloading}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* Quality Options - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
          {qualityOptions.map((option) => {
            const isLocked = option.isPremium && !isPremiumUser;
            const isSelected = selectedQuality === option.quality;
            
            return (
              <button
                key={option.quality}
                onClick={() => !isLocked && setSelectedQuality(option.quality)}
                disabled={isLocked || downloading}
                className={`
                  w-full p-4 rounded-xl border-2 transition-all duration-200
                  ${isSelected 
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm' 
                    : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800/50'
                  }
                  ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md active:scale-[0.98]'}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Radio Circle */}
                    <div className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${isSelected 
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-600 dark:bg-blue-500' 
                        : 'border-gray-300 dark:border-neutral-600'
                      }
                    `}>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>

                    {/* Quality Info */}
                    <div className="text-left">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`font-semibold text-sm sm:text-base ${
                          isSelected 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-700 dark:text-neutral-200'
                        }`}>
                          {option.label}
                        </span>
                        {option.recommended && (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                            Recommended
                          </span>
                        )}
                      </div>
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-neutral-400">
                        {option.size}
                      </span>
                    </div>
                  </div>

                  {/* Lock Icon */}
                  {isLocked && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                      <Crown className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500" />
                      <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                        Premium
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Info Banner - Only for non-premium users */}
        {!isPremiumUser && (
          <div className="mx-4 sm:mx-6 mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Upgrade to <span className="font-semibold">Premium</span> to unlock HD and Full HD quality downloads
              </p>
            </div>
          </div>
        )}

        {/* Remember Choice Checkbox */}
        <div className="px-4 sm:px-6 pb-4">
          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
              disabled={downloading}
            />
            <span className="text-sm text-gray-700 dark:text-neutral-300">
              Remember my choice for future downloads
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 pt-0 space-y-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
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
            className="w-full py-3 px-6 rounded-xl font-medium text-gray-700 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadQualityModal;