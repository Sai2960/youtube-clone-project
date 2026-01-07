// server/utils/supabaseBandwidth.js
import { trackBandwidth } from '../config/supabase.js';

export const logUpload = (fileSize, filename) => {
  trackBandwidth(fileSize, `upload:${filename}`);
  console.log(`📤 Upload tracked: ${(fileSize / 1e6).toFixed(2)}MB - ${filename}`);
};

export const logDownload = (fileSize, filename) => {
  trackBandwidth(fileSize, `download:${filename}`);
  console.log(`📥 Download tracked: ${(fileSize / 1e6).toFixed(2)}MB - ${filename}`);
};

export const getBandwidthStats = () => {
  // Implement stats retrieval
  return {
    daily: Array.from(bandwidthTracker.daily.entries()),
    monthly: bandwidthTracker.monthly,
    limit: 2e9,
    remaining: 2e9 - bandwidthTracker.monthly,
  };
};