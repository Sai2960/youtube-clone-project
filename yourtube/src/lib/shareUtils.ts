// src/lib/shareUtils.ts
import axiosInstance from './axiosinstance';

export interface ShareOptions {
  videoId: string;
  videoTitle: string;
  currentTime?: number;
}

export const shareUtils = {
  // Generate shareable URL
  getShareableUrl: (videoId: string, currentTime?: number): string => {
    if (typeof window === 'undefined') return '';
    
    const baseUrl = window.location.origin;
    const timestamp = currentTime && currentTime > 0 ? `?t=${Math.floor(currentTime)}` : '';
    return `${baseUrl}/watch/${videoId}${timestamp}`;
  },

  // Track share in backend
  trackShare: async (videoId: string, platform: string): Promise<void> => {
    try {
      await axiosInstance.post('/video/share/track', {
        videoId,
        platform,
      });
    } catch (error) {
      console.error('Failed to track share:', error);
      // Don't block the share action if tracking fails
    }
  },

  // WhatsApp share
  shareToWhatsApp: (options: ShareOptions): void => {
    const { videoId, videoTitle, currentTime } = options;
    const url = shareUtils.getShareableUrl(videoId, currentTime);
    const text = `Check out this video: ${videoTitle}`;
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' - ' + url)}`;
    
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    shareUtils.trackShare(videoId, 'whatsapp');
  },

  // Facebook share
  shareToFacebook: (options: ShareOptions): void => {
    const { videoId, currentTime } = options;
    const url = shareUtils.getShareableUrl(videoId, currentTime);
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
    shareUtils.trackShare(videoId, 'facebook');
  },

  // Twitter share
  shareToTwitter: (options: ShareOptions): void => {
    const { videoId, videoTitle, currentTime } = options;
    const url = shareUtils.getShareableUrl(videoId, currentTime);
    const text = `Check out: ${videoTitle}`;
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
    shareUtils.trackShare(videoId, 'twitter');
  },

  // Telegram share
  shareToTelegram: (options: ShareOptions): void => {
    const { videoId, videoTitle, currentTime } = options;
    const url = shareUtils.getShareableUrl(videoId, currentTime);
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(videoTitle)}`;
    
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    shareUtils.trackShare(videoId, 'telegram');
  },

  // LinkedIn share
  shareToLinkedIn: (options: ShareOptions): void => {
    const { videoId, currentTime } = options;
    const url = shareUtils.getShareableUrl(videoId, currentTime);
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
    shareUtils.trackShare(videoId, 'linkedin');
  },

  // Reddit share
  shareToReddit: (options: ShareOptions): void => {
    const { videoId, videoTitle, currentTime } = options;
    const url = shareUtils.getShareableUrl(videoId, currentTime);
    const shareUrl = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(videoTitle)}`;
    
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    shareUtils.trackShare(videoId, 'reddit');
  },

  // Copy to clipboard
  copyToClipboard: async (options: ShareOptions): Promise<boolean> => {
    const { videoId, currentTime } = options;
    const url = shareUtils.getShareableUrl(videoId, currentTime);
    
    try {
      await navigator.clipboard.writeText(url);
      shareUtils.trackShare(videoId, 'copy');
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        const success = document.execCommand('copy');
        if (success) {
          shareUtils.trackShare(videoId, 'copy');
        }
        return success;
      } catch (e) {
        console.error('Failed to copy:', e);
        return false;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  },

  // Native Web Share API (works on mobile)
  shareViaWebShare: async (options: ShareOptions): Promise<boolean> => {
    const { videoId, videoTitle, currentTime } = options;
    
    if (!navigator.share) {
      return false;
    }

    const url = shareUtils.getShareableUrl(videoId, currentTime);
    
    try {
      await navigator.share({
        title: videoTitle,
        text: `Check out this video: ${videoTitle}`,
        url: url,
      });
      shareUtils.trackShare(videoId, 'other');
      return true;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error sharing:', err);
      }
      return false;
    }
  },

  // Format time for display
  formatTime: (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  // Get share statistics
  getShareStats: async (videoId: string) => {
    try {
      const response = await axiosInstance.get(`/video/share/stats/${videoId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch share stats:', error);
      return null;
    }
  },
};

export default shareUtils;