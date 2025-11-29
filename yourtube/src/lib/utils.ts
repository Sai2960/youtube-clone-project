import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export format utilities for convenience
export { formatViews, formatTimeAgo, formatDuration, formatNumber, truncateText } from './formatUtils';

export * from './imageUtils';