// src/lib/formatUtils.ts

/**
 * Format view count like YouTube (e.g., "1.2K views", "4.5M views", "88 views")
 */
export function formatViews(views: number): string {
  if (!views || views === 0) return '0 views';
  if (views === 1) return '1 view';
  
  // Less than 1,000 - show exact number
  if (views < 1000) return `${views} views`;
  
  // 1K - 999K
  if (views < 1000000) {
    const thousands = views / 1000;
    return thousands % 1 === 0 
      ? `${thousands.toFixed(0)}K views`
      : `${thousands.toFixed(1)}K views`;
  }
  
  // 1M - 999M
  if (views < 1000000000) {
    const millions = views / 1000000;
    return millions % 1 === 0
      ? `${millions.toFixed(0)}M views`
      : `${millions.toFixed(1)}M views`;
  }
  
  // 1B+
  const billions = views / 1000000000;
  return billions % 1 === 0
    ? `${billions.toFixed(0)}B views`
    : `${billions.toFixed(1)}B views`;
}

/**
 * Format time ago like YouTube (e.g., "2 hours ago", "3 days ago", "1 month ago")
 */
export function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const uploadDate = new Date(date);
  const seconds = Math.floor((now.getTime() - uploadDate.getTime()) / 1000);

  // Less than a minute
  if (seconds < 60) return 'just now';
  
  // Minutes
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  // Hours
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  // Days
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  
  // Weeks
  if (seconds < 2592000) {
    const weeks = Math.floor(seconds / 604800);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  
  // Months
  if (seconds < 31536000) {
    const months = Math.floor(seconds / 2592000);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  
  // Years
  const years = Math.floor(seconds / 31536000);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

/**
 * Format video duration like YouTube (e.g., "4:23", "1:04:23")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format number with commas (e.g., "1,234,567")
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Shorten text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}