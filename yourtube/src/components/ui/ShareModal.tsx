// components/ui/ShareModal.tsx - PREMIUM ENHANCED VERSION (FIXED)

import React, { useState, useEffect, useRef } from "react";
import { X, Copy, Check, Sparkles } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoTitle: string;
  currentTime?: number;
  isShort?: boolean;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  videoId,
  videoTitle,
  currentTime = 0,
  isShort = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setIsClosing(false);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  if (!isOpen) return null;

  const FRONTEND_URL =
    process.env.NEXT_PUBLIC_FRONTEND_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  
  const basePath = isShort ? '/shorts' : '/watch';
  const timestamp =
    includeTimestamp && currentTime > 0 && !isShort ? `?t=${Math.floor(currentTime)}` : "";
  const shareUrl = `${FRONTEND_URL}${basePath}/${videoId}${timestamp}`;

  const handleButtonClick = (platform: string, action: () => void) => {
    setActiveButton(platform);
    setTimeout(() => setActiveButton(null), 600);
    action();
  };

  const shareToWhatsApp = () => {
    const text = isShort 
      ? `Check out this short: ${videoTitle}` 
      : `Check out this video: ${videoTitle}`;
    const url = `https://wa.me/?text=${encodeURIComponent(
      text + " - " + shareUrl
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      shareUrl
    )}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const shareToTwitter = () => {
    const text = isShort 
      ? `Check out this short: ${videoTitle}` 
      : `Check out: ${videoTitle}`;
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
      shareUrl
    )}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const shareToTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(
      shareUrl
    )}&text=${encodeURIComponent(videoTitle)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareToLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      shareUrl
    )}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const shareToReddit = () => {
    const url = `https://reddit.com/submit?url=${encodeURIComponent(
      shareUrl
    )}&title=${encodeURIComponent(videoTitle)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error("Failed to copy:", e);
      }
      document.body.removeChild(textArea);
    }
  };

  const shareViaWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: videoTitle,
          text: isShort 
            ? `Check out this short: ${videoTitle}` 
            : `Check out this video: ${videoTitle}`,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Premium Social Button Component
  const SocialButton = ({ 
    platform, 
    onClick, 
    gradient, 
    icon, 
    label,
    glowColor 
  }: { 
    platform: string;
    onClick: () => void;
    gradient: string;
    icon: React.ReactNode;
    label: string;
    glowColor: string;
  }) => (
    <button
      onClick={() => handleButtonClick(platform, onClick)}
      className={`group relative flex flex-col items-center gap-2.5 p-3 sm:p-4 rounded-2xl transition-all duration-500 ease-out hover:scale-110 active:scale-95 ${activeButton === platform ? 'scale-110' : ''}`}
    >
      {/* Glow effect on hover */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10"
        style={{ background: glowColor }}
      />
      
      {/* Icon container with premium styling */}
      <div 
        className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-500 before:absolute before:inset-0 before:rounded-2xl before:p-[1px] before:bg-gradient-to-b before:from-white/30 before:to-transparent overflow-hidden ${activeButton === platform ? 'animate-pulse' : ''}`}
        style={{ background: gradient }}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        
        {/* Inner glow */}
        <div 
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-300"
          style={{ 
            background: `radial-gradient(circle at center, ${glowColor}40 0%, transparent 70%)` 
          }}
        />
        
        {/* Icon */}
        <div className="relative z-10 transform group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        
        {/* Sparkle effects on click */}
        {activeButton === platform && (
          <>
            <div className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full animate-ping" />
            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-white rounded-full animate-ping" style={{ animationDelay: '100ms' }} />
            <div className="absolute top-3 left-1 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '200ms' }} />
          </>
        )}
      </div>
      
      {/* Label with premium typography */}
      <span className="text-xs sm:text-sm font-semibold tracking-wide text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300">
        {label}
      </span>
    </button>
  );

  return (
    <>
      {/* Premium Backdrop with animated gradient */}
      <div
        className={`fixed inset-0 z-[9999] bg-black/60 dark:bg-black/80 backdrop-blur-md transition-all duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      >
        {/* Animated gradient orbs in background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1000ms' }} />
        </div>
      </div>

      {/* Premium Modal */}
      <div 
        ref={modalRef}
        className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] w-[95%] max-w-lg mx-auto transition-all duration-500 ease-out ${isClosing ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Outer glow effect */}
        <div 
          className="absolute -inset-1 rounded-3xl opacity-75 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 blur-lg"
          style={{
            backgroundSize: '200% 200%',
            animation: 'gradient-shift 3s ease infinite',
          }}
        />
        
        {/* Main modal container */}
        <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-gray-900 shadow-2xl border border-gray-200/50 dark:border-gray-700/50">
          {/* Premium glass header */}
          <div className="relative px-6 py-5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 border-b border-gray-200/50 dark:border-gray-700/50">
            {/* Decorative gradient line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    Share
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Spread the word
                  </p>
                </div>
              </div>
              
              {/* Premium close button */}
              <button
                onClick={handleClose}
                className="group relative p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 hover:scale-110 active:scale-95 hover:shadow-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
              </button>
            </div>
          </div>

          {/* Content area with premium styling */}
          <div className="p-6 sm:p-8">
            {/* Social Share Grid with premium effects */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-4 mb-8">
              <SocialButton
                platform="whatsapp"
                onClick={shareToWhatsApp}
                gradient="linear-gradient(135deg, #25D366 0%, #128C7E 100%)"
                glowColor="#25D366"
                label="WhatsApp"
                icon={
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                }
              />

              <SocialButton
                platform="facebook"
                onClick={shareToFacebook}
                gradient="linear-gradient(135deg, #1877F2 0%, #0C5DC7 100%)"
                glowColor="#1877F2"
                label="Facebook"
                icon={
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                }
              />

              <SocialButton
                platform="twitter"
                onClick={shareToTwitter}
                gradient="linear-gradient(135deg, #000000 0%, #14171A 100%)"
                glowColor="#1DA1F2"
                label="X"
                icon={
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                }
              />

              <SocialButton
                platform="telegram"
                onClick={shareToTelegram}
                gradient="linear-gradient(135deg, #0088cc 0%, #006699 100%)"
                glowColor="#0088cc"
                label="Telegram"
                icon={
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                }
              />

              <SocialButton
                platform="linkedin"
                onClick={shareToLinkedIn}
                gradient="linear-gradient(135deg, #0077B5 0%, #005885 100%)"
                glowColor="#0077B5"
                label="LinkedIn"
                icon={
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                }
              />

              <SocialButton
                platform="reddit"
                onClick={shareToReddit}
                gradient="linear-gradient(135deg, #FF4500 0%, #CC3700 100%)"
                glowColor="#FF4500"
                label="Reddit"
                icon={
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                  </svg>
                }
              />

              {typeof navigator !== 'undefined' && navigator.share && (
                <SocialButton
                  platform="more"
                  onClick={shareViaWebShare}
                  gradient="linear-gradient(135deg, #8B5CF6 0%, #EC4899 50%, #F59E0B 100%)"
                  glowColor="#A855F7"
                  label="More"
                  icon={
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  }
                />
              )}
            </div>

            {/* Premium Timestamp Toggle */}
            {!isShort && currentTime > 0 && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      id="timestamp"
                      checked={includeTimestamp}
                      onChange={(e) => setIncludeTimestamp(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-7 rounded-full bg-gray-300 dark:bg-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500 transition-all duration-300 shadow-inner" />
                    <div className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-lg transform transition-transform duration-300 peer-checked:translate-x-5 flex items-center justify-center">
                      {includeTimestamp && (
                        <Check className="w-3 h-3 text-purple-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      Start at {formatTime(currentTime)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Include timestamp in shared link
                    </span>
                  </div>
                </label>
              </div>
            )}

            {/* Premium Copy Link Section */}
            <div className="relative p-1 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 dark:from-purple-500/10 dark:via-pink-500/10 dark:to-blue-500/10">
              <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-white dark:bg-gray-900">
                {/* URL Input with premium styling */}
                <div className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="w-full bg-transparent outline-none text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 truncate"
                  />
                </div>
                
                {/* Premium Copy Button */}
                <button
                  onClick={copyToClipboard}
                  className={`relative group/btn flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl font-bold text-sm sm:text-base text-white transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl overflow-hidden ${copied ? 'bg-gradient-to-r from-emerald-500 to-green-500 shadow-emerald-500/25' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-purple-500/25'}`}
                >
                  {/* Shine effect on button */}
                  <div className="absolute inset-0 opacity-0 group-hover/btn:opacity-100 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                  
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 animate-bounce" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Premium footer accent */}
            <div className="mt-6 flex justify-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span>Secure sharing</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </>
  );
};

export default ShareModal;
