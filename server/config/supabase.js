// server/config/supabase.js - PREMIUM OPTIMIZED
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export const bucketName = 'youtube-videos';

// ✅ Bandwidth tracking for monitoring
const bandwidthTracker = {
  daily: new Map(),
  monthly: 0,
  lastReset: new Date().toISOString().split('T')[0],
};

export const trackBandwidth = (bytes, operation) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Reset daily counter
  if (bandwidthTracker.lastReset !== today) {
    bandwidthTracker.daily.clear();
    bandwidthTracker.lastReset = today;
  }
  
  const current = bandwidthTracker.daily.get(operation) || 0;
  bandwidthTracker.daily.set(operation, current + bytes);
  bandwidthTracker.monthly += bytes;
  
  // Warn if approaching 2GB monthly limit
  if (bandwidthTracker.monthly > 1.8e9) {
    console.warn('⚠️ BANDWIDTH WARNING:', {
      used: `${(bandwidthTracker.monthly / 1e9).toFixed(2)}GB`,
      limit: '2GB',
      operation,
    });
  }
};

export const isSupabaseConfigured = () => {
  const configured = !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  if (!configured) {
    console.warn('⚠️ Supabase credentials missing');
  }
  
  return configured;
};

let supabaseInstance = null;

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
          global: {
            headers: {
              // ✅ CRITICAL: Enable aggressive caching
              'Cache-Control': 'public, max-age=31536000, immutable',
            },
          },
          db: {
            schema: 'public',
          },
          realtime: {
            params: {
              eventsPerSecond: 2, // Limit realtime events
            },
          },
        }
      );
      console.log('✅ Supabase initialized with CDN caching');
    } catch (error) {
      console.error('❌ Supabase init failed:', error.message);
      return null;
    }
  }

  return supabaseInstance;
};

// ✅ Get CDN-optimized public URL
export const getCDNUrl = (publicUrl, options = {}) => {
  if (!publicUrl) return null;
  
  const {
    quality = 'auto', // auto, high, medium, low
    width,
    height,
    format = 'webp', // webp, jpg, png
  } = options;
  
  // Supabase image transformations
  const params = new URLSearchParams();
  
  if (width) params.append('width', width);
  if (height) params.append('height', height);
  if (quality !== 'auto') params.append('quality', quality);
  if (format) params.append('format', format);
  
  // Add CDN cache hint
  params.append('cache', '31536000'); // 1 year
  
  const separator = publicUrl.includes('?') ? '&' : '?';
  return `${publicUrl}${separator}${params.toString()}`;
};

// ✅ Get optimized video URL with transformations
export const getOptimizedVideoUrl = (publicUrl, quality = 'high') => {
  if (!publicUrl) return null;
  
  const qualityMap = {
    high: '1080',
    medium: '720',
    low: '480',
    mobile: '360',
  };
  
  // Supabase doesn't transform videos, but we can hint quality
  return `${publicUrl}?quality=${qualityMap[quality] || '720'}&cache=31536000`;
};

// Proxy for lazy initialization
export const supabase = new Proxy(
  {},
  {
    get(target, prop) {
      const client = getSupabaseClient();
      if (!client) {
        return () => Promise.reject(new Error('Supabase not configured'));
      }
      return client[prop];
    },
  }
);

export default supabase;