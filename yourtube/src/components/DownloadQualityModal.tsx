import React, { useState, useEffect } from 'react';
import { 
  Download, 
  X, 
  Crown, 
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
    { quality: '1080p', label: 'Full HD', size: '~150 MB', isPremium: true, recommended: isPremiumUser },
    { quality: '720p', label: 'HD', size: '~80 MB', isPremium: true },
    { quality: '480p', label: 'Standard', size: '~45 MB', isPremium: false, recommended: !isPremiumUser },
    { quality: '360p', label: 'Low', size: '~25 MB', isPremium: false },
    { quality: '240p', label: 'Very Low', size: '~12 MB', isPremium: false },
    { quality: '144p', label: 'Minimum', size: '~6 MB', isPremium: false },
  ];

  useEffect(() => {
    const savedQuality = localStorage.getItem('preferredQuality');
    setSelectedQuality(savedQuality || (isPremiumUser ? '1080p' : '480p'));
  }, [isPremiumUser, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
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
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      {/* Modal Container - FIXED HEIGHT STRUCTURE */}
      <div 
        className="relative w-full sm:max-w-md bg-white dark:bg-neutral-900 sm:rounded-2xl rounded-t-2xl shadow-2xl border-t sm:border border-gray-200 dark:border-neutral-800 flex flex-col"
        style={{ 
          height: '85vh',
          maxHeight: '700px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header - 70px fixed */}
        <div className="flex-shrink-0 h-[70px] flex items-center justify-between px-4 border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-0.5">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-500 flex-shrink-0" strokeWidth={2.5} />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Download Quality</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-neutral-400 truncate">{videoTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
            disabled={downloading}
            type="button"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* Scrollable Content - flex-1 takes remaining space */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ minHeight: 0 }}>
          {/* Quality Options */}
          <div className="p-4 space-y-2">
            {qualityOptions.map((option) => {
              const isLocked = option.isPremium && !isPremiumUser;
              const isSelected = selectedQuality === option.quality;
              
              return (
                <button
                  key={option.quality}
                  onClick={() => !isLocked && setSelectedQuality(option.quality)}
                  disabled={isLocked || downloading}
                  type="button"
                  className={`w-full p-3 rounded-xl border-2 transition-all duration-200 ${
                    isSelected 
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/30' 
                      : 'border-gray-200 dark:border-neutral-700 hover:border-gray-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800/50'
                  } ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Radio */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected 
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-600 dark:bg-blue-500' 
                          : 'border-gray-300 dark:border-neutral-600'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>

                      {/* Info */}
                      <div className="text-left flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-sm ${
                            isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-neutral-200'
                          }`}>{option.quality}</span>
                          <span className="text-xs text-gray-500 dark:text-neutral-400">{option.label}</span>
                          {option.recommended && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                              Recommended
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-neutral-400 block mt-0.5">{option.size}</span>
                      </div>
                    </div>

                    {/* Premium Badge */}
                    {isLocked && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex-shrink-0">
                        <Crown className="w-3 h-3 text-yellow-600 dark:text-yellow-500" />
                        <span className="text-[10px] font-medium text-yellow-700 dark:text-yellow-400">Premium</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Info Banner */}
          {!isPremiumUser && (
            <div className="mx-4 mb-3 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-tight">
                  Upgrade to <span className="font-semibold">Premium</span> for HD quality
                </p>
              </div>
            </div>
          )}

          {/* Remember Choice */}
          <div className="px-4 pb-4">
            <label className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                disabled={downloading}
              />
              <span className="text-xs text-gray-700 dark:text-neutral-300">Remember my choice</span>
            </label>
          </div>
        </div>

        {/* Footer - 110px fixed */}
        <div className="flex-shrink-0 h-[110px] p-4 space-y-2 border-t border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <button
            onClick={handleDownload}
            disabled={downloading}
            type="button"
            className="w-full h-11 px-6 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 disabled:cursor-not-allowed"
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
            type="button"
            className="w-full h-10 px-6 rounded-xl font-medium text-sm text-gray-700 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors active:scale-[0.98] disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadQualityModal;